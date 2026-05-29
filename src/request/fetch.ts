import PQueue from 'p-queue';

import { NotionAnythingError } from '#errors';

import { deriveRequestContext, pickRequestIdFromHeaders } from './context';
import {
  EXTRA_RATE_LIMIT_BUFFER_MS,
  getBufferedRateLimitDelayMs,
  parseRetryAfterBody,
  parseRetryAfterHeader,
  parseRetryAfterValue,
} from './parse';
import { resolveRatelimit } from './ratelimit';

import type { RequestContext } from './context';
import type { RequestHooks, RateLimitDelaySource } from './hooks';
import type { RateLimitDelayMetadata } from './parse';
import type { RatelimitOptions } from './ratelimit';

const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const DEFAULT_RATE_LIMIT_RETRY_DELAY_MS = 30_000;

/** the input shape accepted by the fetch wrapper (matches the global fetch) */
type FetchInput = string | URL | Request;

/**
 * resolver for the Notion API bearer token
 * a literal string is used as-is for every request;
 * a function is invoked per attempt with a boolean indicating whether the
 * call represents an initial token acquisition (`true`) or a refresh after
 * a 401 (`false`)
 */
export type ResolveToken = string | ((init: boolean) => Promise<string>);

/** options accepted by {@link resolveFetch} */
export interface ResolveFetchOptions {
  /** in-flight request cap; defaults to unlimited */
  concurrency?: number;
  /** proactive request rate cap applied to all calls (defaults always-on) */
  ratelimit?: RatelimitOptions;
  /** lifecycle hooks */
  hooks?: RequestHooks;
  /** base fetch implementation (defaults to `globalThis.fetch`) */
  fetch?: typeof fetch;
  /** bearer token source */
  token?: ResolveToken;
}

/**
 * resolves an instrumented fetch wrapper around a base fetch
 * the returned function injects a per-attempt `Authorization` header sourced
 * from the supplied token provider, increments metrics per attempt, surfaces
 * request-hook events, queue-pauses on 429 (no recursion), refreshes the token
 * exactly once on 401, and throws a `NotionAnythingError` on 403
 * @param options resolver options
 * @returns instrumented fetch implementation
 */
export function resolveFetch(options?: ResolveFetchOptions): typeof fetch {
  const queue = buildRequestQueue(options);
  const baseFetch = options?.fetch ?? globalThis.fetch;
  const token = options?.token;
  const hooks = options?.hooks;

  /**
   * runs a single attempt; on 429 the queue is paused and the attempt is
   * re-enqueued (async re-entry, not synchronous recursion); on 401 the
   * attempt is re-enqueued once with `refreshNeeded=true`
   * @param input fetch input
   * @param init fetch init
   * @param refreshNeeded whether this attempt is the post-401 refresh retry
   * @returns final response after retries
   */
  async function attempt(
    input: FetchInput,
    init: RequestInit | undefined,
    refreshNeeded: boolean,
  ): Promise<Response> {
    return queue.add(async () => runAttempt(input, init, refreshNeeded));
  }

  /**
   * resolves the bearer token for a single attempt
   * @param refreshNeeded true when retrying after a 401 — passed as `init=false`
   *   to the provider; the initial attempt uses `init=true`
   * @returns bearer token string (empty when no provider is configured)
   */
  async function resolveBearer(refreshNeeded: boolean): Promise<string> {
    if (typeof token === 'string') {
      return token;
    }

    if (token === undefined) {
      return '';
    }

    return token(!refreshNeeded);
  }

  /**
   * performs a single fetch attempt with auth, metrics, hooks, 429/401/403
   * handling; called inside the queue
   * @param input fetch input
   * @param init fetch init
   * @param refreshNeeded whether this attempt is the post-401 refresh retry
   * @returns final response or re-entered attempt
   */
  async function runAttempt(
    input: FetchInput,
    init: RequestInit | undefined,
    refreshNeeded: boolean,
  ): Promise<Response> {
    const bearer = await resolveBearer(refreshNeeded);
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${bearer}`);
    const authed: RequestInit = { ...init, headers };
    const method = init?.method ?? 'GET';
    const url = toUrlString(input);
    const context = deriveRequestContext(url);
    const start = Date.now();

    emitRequestStart(hooks, method, url, context);

    const response = await baseFetch(input, authed);

    emitRequestEnd(hooks, method, url, context, response, start);

    if (response.status === HTTP_TOO_MANY_REQUESTS) {
      await pauseQueueForRetryAfter(queue, response, hooks);

      return attempt(input, init, refreshNeeded);
    }

    if (response.status === HTTP_UNAUTHORIZED && !refreshNeeded) {
      return attempt(input, init, true);
    }

    if (response.status === HTTP_FORBIDDEN) {
      throw new NotionAnythingError({
        code: 'ENTITY_NOT_ACCESSIBLE',
        message: 'Notion API forbidden (403)',
        cause: response,
      });
    }

    return response;
  }

  return async (input, init) => attempt(input, init, false);
}

/**
 * builds the request queue enforcing concurrency and the proactive rate cap
 *
 * carryoverIntervalCount is intentionally left at its default (false): enabling
 * p-queue@9's carryover deadlocks the queue across the 429 pause()/start()
 * window, and a per-window reset is the correct semantics for a request-rate cap
 * @param options resolver options carrying concurrency and ratelimit settings
 * @returns a configured PQueue instance
 */
function buildRequestQueue(options: ResolveFetchOptions | undefined): PQueue {
  const { count, interval } = resolveRatelimit(options?.ratelimit);

  return new PQueue({
    concurrency: options?.concurrency ?? Infinity,
    interval,
    intervalCap: count,
  });
}

/**
 * pauses the queue for a parsed retry-after delay (first-hit-wins)
 * sibling 429s while paused are no-ops so the pause window is not extended
 * @param queue queue to pause
 * @param response 429 response to inspect
 * @param requestHooks optional hooks to receive pause/resume events
 */
async function pauseQueueForRetryAfter(
  queue: PQueue,
  response: Response,
  requestHooks: RequestHooks | undefined,
): Promise<void> {
  // first-hit-wins: claim the pause window synchronously before parsing the
  // response so concurrent 429 siblings observe the paused state and skip
  if (queue.isPaused) {
    return;
  }
  queue.pause();

  const metadata = await extractRateLimitMetadata(response);
  const delayMs = getBufferedRateLimitDelayMs(
    metadata,
    EXTRA_RATE_LIMIT_BUFFER_MS,
  );

  requestHooks?.onRateLimitPause?.({
    delayMs,
    requestId: metadata.requestId,
    source: metadata.source,
  });
  setTimeout(() => {
    queue.start();
    requestHooks?.onRateLimitResume?.({
      delayMs,
      requestId: metadata.requestId,
    });
  }, delayMs);
}

/**
 * fires the onRequestStart hook with URL-derived context
 * @param requestHooks optional request hooks
 * @param method HTTP method
 * @param url request URL
 * @param context URL/HTTP-derived request context
 */
function emitRequestStart(
  requestHooks: RequestHooks | undefined,
  method: string,
  url: string,
  context: RequestContext,
): void {
  requestHooks?.onRequestStart?.({
    method,
    url,
    blockId: context.blockId,
    pageId: context.pageId,
    cursor: context.cursor,
    pageSize: context.pageSize,
  });
}

/**
 * fires the onRequestEnd hook with the response status, duration, request id,
 * and URL-derived context
 * @param requestHooks optional request hooks
 * @param method HTTP method
 * @param url request URL
 * @param context URL/HTTP-derived request context
 * @param response the response returned by the base fetch
 * @param start timestamp (ms) at which the attempt began
 */
function emitRequestEnd(
  requestHooks: RequestHooks | undefined,
  method: string,
  url: string,
  context: RequestContext,
  response: Response,
  start: number,
): void {
  requestHooks?.onRequestEnd?.({
    method,
    url,
    status: response.status,
    durationMs: Date.now() - start,
    requestId: pickRequestIdFromHeaders(response.headers),
    blockId: context.blockId,
    pageId: context.pageId,
  });
}

/**
 * converts a fetch input (string, URL, or Request) to a URL string
 * @param input fetch input
 * @returns URL as a string
 */
function toUrlString(input: FetchInput): string {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.href;
  }

  return input.url;
}

/**
 * extracts rate-limit retry metadata from a 429 response
 * checks headers, body JSON `additional_data`, and body JSON for retry-after
 * @param response 429 response to inspect
 * @returns parsed metadata, falling back to a default delay when none is found
 */
async function extractRateLimitMetadata(
  response: Response,
): Promise<RateLimitDelayMetadata> {
  const headerDelay = parseRetryAfterHeader(response.headers);
  const requestId = pickRequestIdFromHeaders(response.headers);

  if (headerDelay !== undefined) {
    return {
      delayMs: headerDelay,
      source: 'retry_after_header' satisfies RateLimitDelaySource,
      requestId,
    };
  }

  const bodyText = await safeCloneText(response);
  const parsedBody = safeParseJson(bodyText);
  const requestIdFromBody = pickRequestIdFromBody(parsedBody) ?? requestId;

  const additionalDataDelay = parseRetryAfterValue(
    // eslint-disable-next-line @typescript-eslint/dot-notation -- snake_case field name from Notion API
    isRecord(parsedBody) ? parsedBody['additional_data'] : undefined,
  );
  if (additionalDataDelay !== undefined) {
    return {
      delayMs: additionalDataDelay,
      source: 'additional_data' satisfies RateLimitDelaySource,
      requestId: requestIdFromBody,
    };
  }

  const bodyDelay = parseRetryAfterBody(bodyText);
  if (bodyDelay !== undefined) {
    return {
      delayMs: bodyDelay,
      source: 'body' satisfies RateLimitDelaySource,
      requestId: requestIdFromBody,
    };
  }

  return {
    delayMs: DEFAULT_RATE_LIMIT_RETRY_DELAY_MS,
    source: 'default' satisfies RateLimitDelaySource,
    requestId: requestIdFromBody,
  };
}

/**
 * clones the response and reads its body as text, swallowing read errors
 * @param response response to clone
 * @returns body text, or undefined when unreadable
 */
async function safeCloneText(response: Response): Promise<string | undefined> {
  try {
    return await response.clone().text();
  } catch {
    return undefined;
  }
}

/**
 * safely parses a string as JSON
 * @param text input string
 * @returns parsed JSON, or undefined on failure
 */
function safeParseJson(text: string | undefined): unknown {
  if (typeof text !== 'string') {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * extracts the `request_id` from a parsed body when present
 * @param parsedBody parsed JSON body
 * @returns request id when available
 */
function pickRequestIdFromBody(parsedBody: unknown): string | undefined {
  if (!isRecord(parsedBody)) {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/dot-notation -- snake_case field name from Notion API
  const value = parsedBody['request_id'];

  return typeof value === 'string' ? value : undefined;
}

/**
 * checks whether a value is a non-null record-like object
 * @param value value to check
 * @returns true when value is a non-null object
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
