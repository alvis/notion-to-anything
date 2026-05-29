import { describe, expect, it, vi } from 'vitest';

import { NotionAnythingError } from '#errors';
import { resolveFetch } from '#request/fetch';

import type { Mock } from 'vitest';

import type { RequestHooks } from '#request';

/** request-hook callback signatures (extracted so we can strongly-type `vi.fn`) */
type OnRequestStart = NonNullable<RequestHooks['onRequestStart']>;
type OnRequestEnd = NonNullable<RequestHooks['onRequestEnd']>;
type OnRateLimitPause = NonNullable<RequestHooks['onRateLimitPause']>;
type OnRateLimitResume = NonNullable<RequestHooks['onRateLimitResume']>;

/**
 * builds a JSON response with a given status and body
 * @param status HTTP status code
 * @param body response body (defaults to empty object)
 * @param headers optional response headers
 * @returns Response instance
 */
function jsonResponse(
  status: number,
  body: unknown = {},
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

/**
 * extracts the `RequestInit` passed to a mocked fetch on a given call
 * fails the test (rather than silently typing `undefined` away) when the
 * call did not receive an init object — keeps assertions honest without
 * sprinkling non-null assertions through the spec
 * @param mock mocked fetch
 * @param callIndex zero-based call index
 * @returns the `RequestInit` recorded for that call
 */
function getCallInit(mock: Mock<typeof fetch>, callIndex: number): RequestInit {
  const init = mock.mock.calls[callIndex]?.[1];

  if (init === undefined) {
    throw new Error(
      `expected fetch call #${String(callIndex)} to receive a RequestInit, got undefined`,
    );
  }

  return init;
}

describe('fn:resolveFetch', () => {
  describe('request hooks', () => {
    it('should fire onRequestStart and onRequestEnd for each attempt', async () => {
      const onRequestStart = vi.fn<OnRequestStart>();
      const onRequestEnd = vi.fn<OnRequestEnd>();
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse(200));

      const wrapped = resolveFetch({
        token: 'secret_t',
        fetch: fetchMock,
        hooks: { onRequestStart, onRequestEnd },
      });

      await wrapped('https://example.com/x', { method: 'POST' });

      expect(onRequestStart).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'https://example.com/x',
        }),
      );
      expect(onRequestEnd).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'https://example.com/x',
          status: 200,
          durationMs: expect.any(Number),
        }),
      );
    });

    it('should capture the requestId from the x-request-id response header', async () => {
      const onRequestEnd = vi.fn<OnRequestEnd>();
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          jsonResponse(200, {}, { 'x-request-id': 'req-123' }),
        );

      const wrapped = resolveFetch({
        token: 'secret_t',
        fetch: fetchMock,
        hooks: { onRequestEnd },
      });

      await wrapped('https://api.notion.com/v1/pages/abc');

      expect(onRequestEnd).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: 'req-123' }),
      );
    });

    it('should capture the requestId from a capitalized X-Request-Id header', async () => {
      const onRequestEnd = vi.fn<OnRequestEnd>();
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          jsonResponse(200, {}, { 'X-Request-Id': 'req-cap' }),
        );

      const wrapped = resolveFetch({
        token: 'secret_t',
        fetch: fetchMock,
        hooks: { onRequestEnd },
      });

      await wrapped('https://api.notion.com/v1/pages/abc');

      expect(onRequestEnd).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: 'req-cap' }),
      );
    });

    it('should leave requestId undefined when no header is present', async () => {
      const onRequestEnd = vi.fn<OnRequestEnd>();
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse(200));

      const wrapped = resolveFetch({
        token: 'secret_t',
        fetch: fetchMock,
        hooks: { onRequestEnd },
      });

      await wrapped('https://api.notion.com/v1/pages/abc');

      expect(onRequestEnd).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: undefined }),
      );
    });

    it('should parse the blockId, cursor and pageSize from a block children URL without a message', async () => {
      const onRequestStart = vi.fn<OnRequestStart>();
      const onRequestEnd = vi.fn<OnRequestEnd>();
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse(200));

      const wrapped = resolveFetch({
        token: 'secret_t',
        fetch: fetchMock,
        hooks: { onRequestStart, onRequestEnd },
      });

      await wrapped(
        'https://api.notion.com/v1/blocks/block-1/children?start_cursor=cur-2&page_size=50',
      );

      expect(onRequestStart).toHaveBeenCalledWith(
        expect.objectContaining({
          blockId: 'block-1',
          cursor: 'cur-2',
          pageSize: 50,
        }),
      );
      expect(onRequestStart.mock.calls[0]?.[0]).not.toHaveProperty('message');
      expect(onRequestEnd).toHaveBeenCalledWith(
        expect.objectContaining({ blockId: 'block-1' }),
      );
      expect(onRequestEnd.mock.calls[0]?.[0]).not.toHaveProperty('message');
    });

    it('should parse a bare block retrieval URL without children and without a message', async () => {
      const onRequestStart = vi.fn<OnRequestStart>();
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse(200));

      const wrapped = resolveFetch({
        token: 'secret_t',
        fetch: fetchMock,
        hooks: { onRequestStart },
      });

      await wrapped('https://api.notion.com/v1/blocks/block-9');

      expect(onRequestStart).toHaveBeenCalledWith(
        expect.objectContaining({ blockId: 'block-9' }),
      );
      expect(onRequestStart.mock.calls[0]?.[0]).not.toHaveProperty('message');
    });

    it('should not attach a message for a database query URL', async () => {
      const onRequestStart = vi.fn<OnRequestStart>();
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse(200));

      const wrapped = resolveFetch({
        token: 'secret_t',
        fetch: fetchMock,
        hooks: { onRequestStart },
      });

      await wrapped('https://api.notion.com/v1/databases/db-3/query', {
        method: 'POST',
      });

      expect(onRequestStart.mock.calls[0]?.[0]).not.toHaveProperty('message');
    });

    it('should parse an unparseable URL into empty ids without a message', async () => {
      const onRequestStart = vi.fn<OnRequestStart>();
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse(200));

      const wrapped = resolveFetch({
        token: 'secret_t',
        fetch: fetchMock,
        hooks: { onRequestStart },
      });

      // a relative path is not a valid absolute URL — exercises the safe-parse fallback
      await wrapped('/relative/path');

      expect(onRequestStart).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/relative/path',
          blockId: undefined,
          pageId: undefined,
        }),
      );
      expect(onRequestStart.mock.calls[0]?.[0]).not.toHaveProperty('message');
    });

    it('should omit pageSize when the page_size query value is not an integer', async () => {
      const onRequestStart = vi.fn<OnRequestStart>();
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse(200));

      const wrapped = resolveFetch({
        token: 'secret_t',
        fetch: fetchMock,
        hooks: { onRequestStart },
      });

      await wrapped(
        'https://api.notion.com/v1/blocks/block-1/children?page_size=not-a-number',
      );

      expect(onRequestStart).toHaveBeenCalledWith(
        expect.objectContaining({ blockId: 'block-1', pageSize: undefined }),
      );
    });

    it('should parse the pageId from a page URL', async () => {
      const onRequestStart = vi.fn<OnRequestStart>();
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse(200));

      const wrapped = resolveFetch({
        token: 'secret_t',
        fetch: fetchMock,
        hooks: { onRequestStart },
      });

      await wrapped('https://api.notion.com/v1/pages/page-7');

      expect(onRequestStart).toHaveBeenCalledWith(
        expect.objectContaining({ pageId: 'page-7' }),
      );
      expect(onRequestStart.mock.calls[0]?.[0]).not.toHaveProperty('message');
    });

    it('should never attach a message field to the start meta', async () => {
      const onRequestStart = vi.fn<OnRequestStart>();
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse(200));

      const wrapped = resolveFetch({
        token: 'secret_t',
        fetch: fetchMock,
        hooks: { onRequestStart },
      });

      await wrapped('https://api.notion.com/v1/search', { method: 'POST' });

      expect(onRequestStart.mock.calls[0]?.[0]).not.toHaveProperty('message');
    });

    it('should derive method GET when init is omitted', async () => {
      const onRequestStart = vi.fn<OnRequestStart>();
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse(200));

      const wrapped = resolveFetch({
        token: 'secret_t',
        fetch: fetchMock,
        hooks: { onRequestStart },
      });

      await wrapped('https://example.com');

      expect(onRequestStart).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: 'https://example.com',
        }),
      );
    });

    it('should derive url from URL instance and Request instance inputs', async () => {
      const onRequestStart = vi.fn<OnRequestStart>();
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse(200));

      const wrapped = resolveFetch({
        token: 'secret_t',
        fetch: fetchMock,
        hooks: { onRequestStart },
      });

      await wrapped(new URL('https://example.com/url'));
      await wrapped(new Request('https://example.com/req'));

      expect(onRequestStart).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          method: 'GET',
          url: 'https://example.com/url',
        }),
      );
      expect(onRequestStart).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          method: 'GET',
          url: 'https://example.com/req',
        }),
      );
    });
  });

  describe('429 handling', () => {
    it('should pause the queue and retry once the backoff elapses', async () => {
      vi.useFakeTimers();
      try {
        const onRateLimitPause = vi.fn<OnRateLimitPause>();
        const onRateLimitResume = vi.fn<OnRateLimitResume>();
        const fetchMock = vi
          .fn<typeof fetch>()
          .mockResolvedValueOnce(jsonResponse(429, {}, { 'retry-after': '2' }))
          .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

        const wrapped = resolveFetch({
          token: 'secret_t',
          fetch: fetchMock,
          hooks: { onRateLimitPause, onRateLimitResume },
        });

        const promise = wrapped('https://example.com');
        await vi.advanceTimersByTimeAsync(0);
        await vi.advanceTimersByTimeAsync(7000);
        const response = await promise;

        expect(response.status).toBe(200);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(onRateLimitPause).toHaveBeenCalledTimes(1);
        expect(onRateLimitResume).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('should not extend the pause window when sibling 429s arrive while paused', async () => {
      vi.useFakeTimers();
      try {
        const onRateLimitPause = vi.fn<OnRateLimitPause>();
        const onRateLimitResume = vi.fn<OnRateLimitResume>();
        // first two requests 429 (parallel siblings), then both succeed
        const fetchMock = vi
          .fn<typeof fetch>()
          .mockResolvedValueOnce(jsonResponse(429, {}, { 'retry-after': '1' }))
          .mockResolvedValueOnce(jsonResponse(429, {}, { 'retry-after': '1' }))
          .mockResolvedValue(jsonResponse(200));

        const wrapped = resolveFetch({
          token: 'secret_t',
          fetch: fetchMock,
          // concurrency=Infinity so both initial attempts run in parallel
          hooks: { onRateLimitPause, onRateLimitResume },
        });

        const promises = [
          wrapped('https://example.com/a'),
          wrapped('https://example.com/b'),
        ];
        await vi.advanceTimersByTimeAsync(0);
        // both 429s happen, only one pause window should open
        await vi.advanceTimersByTimeAsync(6000);
        await Promise.all(promises);

        // first-hit-wins: only one pause/resume even though both got 429
        expect(onRateLimitPause).toHaveBeenCalledTimes(1);
        expect(onRateLimitResume).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('should not stack-overflow on a high-volume 429 burst', async () => {
      vi.useFakeTimers();
      try {
        const fetchMock = vi.fn<typeof fetch>();
        const burstSize = 100;
        for (let i = 0; i < burstSize; i += 1) {
          fetchMock.mockResolvedValueOnce(
            jsonResponse(429, {}, { 'retry-after': '0' }),
          );
        }
        fetchMock.mockResolvedValue(jsonResponse(200));

        const wrapped = resolveFetch({
          token: 'secret_t',
          fetch: fetchMock,
        });

        const promise = wrapped('https://example.com');
        // step through each backoff cycle (0s parsed + 5s buffer per burst)
        for (let i = 0; i <= burstSize; i += 1) {
          await vi.advanceTimersByTimeAsync(5000);
        }
        const response = await promise;

        expect(response.status).toBe(200);
        expect(fetchMock).toHaveBeenCalledTimes(burstSize + 1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('should parse retry-after from response body `additional_data`', async () => {
      vi.useFakeTimers();
      try {
        const onRateLimitPause = vi.fn<OnRateLimitPause>();
        const fetchMock = vi
          .fn<typeof fetch>()
          .mockResolvedValueOnce(
            // no retry-after header; embedded in additional_data
            new Response(
              JSON.stringify({
                additional_data: { retry_after: 2 },
                request_id: 'rid-additional',
              }),
              { status: 429, headers: { 'Content-Type': 'application/json' } },
            ),
          )
          .mockResolvedValueOnce(jsonResponse(200));

        const wrapped = resolveFetch({
          token: 'secret_t',
          fetch: fetchMock,
          hooks: { onRateLimitPause },
        });

        const promise = wrapped('https://example.com');
        await vi.advanceTimersByTimeAsync(0);
        await vi.advanceTimersByTimeAsync(7000);
        await promise;

        expect(onRateLimitPause).toHaveBeenCalledWith(
          expect.objectContaining({
            source: 'additional_data',
            requestId: 'rid-additional',
          }),
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it('should parse retry-after from a nested response body field', async () => {
      vi.useFakeTimers();
      try {
        const onRateLimitPause = vi.fn<OnRateLimitPause>();
        const fetchMock = vi
          .fn<typeof fetch>()
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify({ error: { details: { retry_after: 2 } } }),
              { status: 429, headers: { 'Content-Type': 'application/json' } },
            ),
          )
          .mockResolvedValueOnce(jsonResponse(200));

        const wrapped = resolveFetch({
          token: 'secret_t',
          fetch: fetchMock,
          hooks: { onRateLimitPause },
        });

        const promise = wrapped('https://example.com');
        await vi.advanceTimersByTimeAsync(0);
        await vi.advanceTimersByTimeAsync(7000);
        await promise;

        expect(onRateLimitPause).toHaveBeenCalledWith(
          expect.objectContaining({ source: 'body' }),
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it('should fall back to default when response body cannot be read', async () => {
      vi.useFakeTimers();
      try {
        const onRateLimitPause = vi.fn<OnRateLimitPause>();
        // craft a 429 whose .clone().text() rejects
        const brokenResponse = new Response(null, { status: 429 });
        vi.spyOn(brokenResponse, 'clone').mockImplementation(() => {
          throw new Error('clone failed');
        });

        const fetchMock = vi
          .fn<typeof fetch>()
          .mockResolvedValueOnce(brokenResponse)
          .mockResolvedValueOnce(jsonResponse(200));

        const wrapped = resolveFetch({
          token: 'secret_t',
          fetch: fetchMock,
          hooks: { onRateLimitPause },
        });

        const promise = wrapped('https://example.com');
        await vi.advanceTimersByTimeAsync(0);
        await vi.advanceTimersByTimeAsync(36000);
        await promise;

        expect(onRateLimitPause).toHaveBeenCalledWith(
          expect.objectContaining({ source: 'default' }),
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it('should fall back to default when response body is not valid JSON', async () => {
      vi.useFakeTimers();
      try {
        const onRateLimitPause = vi.fn<OnRateLimitPause>();
        const fetchMock = vi
          .fn<typeof fetch>()
          .mockResolvedValueOnce(
            new Response('not-json', {
              status: 429,
              headers: { 'Content-Type': 'text/plain' },
            }),
          )
          .mockResolvedValueOnce(jsonResponse(200));

        const wrapped = resolveFetch({
          token: 'secret_t',
          fetch: fetchMock,
          hooks: { onRateLimitPause },
        });

        const promise = wrapped('https://example.com');
        await vi.advanceTimersByTimeAsync(0);
        await vi.advanceTimersByTimeAsync(36000);
        await promise;

        expect(onRateLimitPause).toHaveBeenCalledWith(
          expect.objectContaining({ source: 'default' }),
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it('should fall back to default when JSON body has no retry hints and no request_id', async () => {
      vi.useFakeTimers();
      try {
        const onRateLimitPause = vi.fn<OnRateLimitPause>();
        const fetchMock = vi
          .fn<typeof fetch>()
          .mockResolvedValueOnce(
            // body is a non-object JSON value — exercises pickRequestIdFromBody null path
            new Response(JSON.stringify(null), {
              status: 429,
              headers: { 'Content-Type': 'application/json' },
            }),
          )
          .mockResolvedValueOnce(jsonResponse(200));

        const wrapped = resolveFetch({
          token: 'secret_t',
          fetch: fetchMock,
          hooks: { onRateLimitPause },
        });

        const promise = wrapped('https://example.com');
        await vi.advanceTimersByTimeAsync(0);
        await vi.advanceTimersByTimeAsync(36000);
        await promise;

        expect(onRateLimitPause).toHaveBeenCalledWith(
          expect.objectContaining({ source: 'default' }),
        );
      } finally {
        vi.useRealTimers();
      }
    });

    it('should fall back to default backoff when 429 has no retry-after', async () => {
      vi.useFakeTimers();
      try {
        const fetchMock = vi
          .fn<typeof fetch>()
          .mockResolvedValueOnce(jsonResponse(429))
          .mockResolvedValueOnce(jsonResponse(200));

        const wrapped = resolveFetch({
          token: 'secret_t',
          fetch: fetchMock,
        });

        const promise = wrapped('https://example.com');
        await vi.advanceTimersByTimeAsync(0);
        // 30s default + 5s buffer
        await vi.advanceTimersByTimeAsync(35000);
        const response = await promise;

        expect(response.status).toBe(200);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('401 refresh', () => {
    it('should call the token provider with init=false on the post-401 retry and succeed', async () => {
      const tokenProvider = vi.fn<(init: boolean) => Promise<string>>();
      tokenProvider
        .mockResolvedValueOnce('stale')
        .mockResolvedValueOnce('fresh');

      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(jsonResponse(401))
        .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

      const wrapped = resolveFetch({
        token: tokenProvider,
        fetch: fetchMock,
      });

      const response = await wrapped('https://example.com');

      expect(response.status).toBe(200);
      expect(tokenProvider).toHaveBeenCalledTimes(2);
      expect(tokenProvider).toHaveBeenNthCalledWith(1, true);
      expect(tokenProvider).toHaveBeenNthCalledWith(2, false);
      const firstAuth = new Headers(getCallInit(fetchMock, 0).headers).get(
        'Authorization',
      );
      const secondAuth = new Headers(getCallInit(fetchMock, 1).headers).get(
        'Authorization',
      );

      expect(firstAuth).toBe('Bearer stale');
      expect(secondAuth).toBe('Bearer fresh');
    });

    it('should refresh exactly once and surface the second 401', async () => {
      const tokenProvider = vi.fn<(init: boolean) => Promise<string>>();
      tokenProvider
        .mockResolvedValueOnce('stale')
        .mockResolvedValueOnce('still-stale');

      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(jsonResponse(401))
        .mockResolvedValueOnce(jsonResponse(401));

      const wrapped = resolveFetch({
        token: tokenProvider,
        fetch: fetchMock,
      });

      const response = await wrapped('https://example.com');

      expect(response.status).toBe(401);
      expect(tokenProvider).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('403 handling', () => {
    it('should throw a NotionAnythingError on 403 and not call the token provider for a retry', async () => {
      const tokenProvider = vi.fn<(init: boolean) => Promise<string>>(
        async () => 'token',
      );
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse(403));

      const wrapped = resolveFetch({
        token: tokenProvider,
        fetch: fetchMock,
      });

      const error = await wrapped('https://example.com').catch(
        (caught: unknown) => caught,
      );

      expect(error).toBeInstanceOf(NotionAnythingError);
      expect(error instanceof NotionAnythingError).toBe(true);
      if (error instanceof NotionAnythingError) {
        expect(error.code).toBe('ENTITY_NOT_ACCESSIBLE');
        expect(error.message).toMatch(/forbidden/i);
        expect(error.cause).toBeInstanceOf(Response);
      }
      // provider called once per attempt; no extra retry within the single call
      expect(tokenProvider).toHaveBeenCalledTimes(1);
      expect(tokenProvider.mock.calls.every(([init]) => init === true)).toBe(
        true,
      );
    });
  });

  describe('base fetch resolution', () => {
    it('should call options.fetch when supplied', async () => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse(200));

      const wrapped = resolveFetch({
        token: 'secret_t',
        fetch: fetchMock,
      });

      await wrapped('https://example.com');

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should fall back to globalThis.fetch when no fetch is supplied', async () => {
      const globalMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse(200));
      const originalFetch = globalThis.fetch;
      globalThis.fetch = globalMock as typeof fetch;

      try {
        const wrapped = resolveFetch({
          token: 'secret_t',
        });

        await wrapped('https://example.com');

        expect(globalMock).toHaveBeenCalledTimes(1);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('authorization header', () => {
    it('should set Authorization per attempt without leaking from prior attempts', async () => {
      const provider = vi.fn<(init: boolean) => Promise<string>>(
        async (init) => (init ? 'first-token' : 'second-token'),
      );

      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(jsonResponse(401))
        .mockResolvedValueOnce(jsonResponse(200));

      const wrapped = resolveFetch({
        token: provider,
        fetch: fetchMock,
      });

      // first call: 401 then refresh -> uses second-token
      await wrapped('https://example.com', {
        headers: { 'X-Custom': 'preserved' },
      });

      const firstAuth = new Headers(getCallInit(fetchMock, 0).headers).get(
        'Authorization',
      );
      const secondInit = getCallInit(fetchMock, 1);
      const secondAuth = new Headers(secondInit.headers).get('Authorization');
      const secondCustom = new Headers(secondInit.headers).get('X-Custom');

      expect(firstAuth).toBe('Bearer first-token');
      expect(secondAuth).toBe('Bearer second-token');
      expect(secondCustom).toBe('preserved');
    });

    it('should set an empty bearer when no token provider is configured', async () => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse(200));

      const wrapped = resolveFetch({
        fetch: fetchMock,
      });

      await wrapped('https://example.com');

      const auth = new Headers(getCallInit(fetchMock, 0).headers).get(
        'Authorization',
      );

      // Headers strips trailing whitespace; the literal sent is `Bearer `
      // which normalizes to `Bearer`
      expect(auth).toBe('Bearer');
    });
  });

  describe('configuration', () => {
    it('should default concurrency to Infinity (parallel attempts)', async () => {
      let inFlight = 0;
      let maxInFlight = 0;
      const fetchMock = vi.fn<typeof fetch>(
        async () =>
          new Promise<Response>((resolve) => {
            inFlight += 1;
            maxInFlight = Math.max(maxInFlight, inFlight);
            setTimeout(() => {
              inFlight -= 1;
              resolve(jsonResponse(200));
            }, 5);
          }),
      );

      const wrapped = resolveFetch({
        token: 'secret_t',
        fetch: fetchMock,
      });

      await Promise.all([
        wrapped('https://example.com/1'),
        wrapped('https://example.com/2'),
        wrapped('https://example.com/3'),
      ]);

      expect(maxInFlight).toBe(3);
    });

    it('should respect a finite concurrency cap', async () => {
      let inFlight = 0;
      let maxInFlight = 0;
      const fetchMock = vi.fn<typeof fetch>(
        async () =>
          new Promise<Response>((resolve) => {
            inFlight += 1;
            maxInFlight = Math.max(maxInFlight, inFlight);
            setTimeout(() => {
              inFlight -= 1;
              resolve(jsonResponse(200));
            }, 5);
          }),
      );

      const wrapped = resolveFetch({
        token: 'secret_t',
        fetch: fetchMock,
        concurrency: 1,
      });

      await Promise.all([
        wrapped('https://example.com/1'),
        wrapped('https://example.com/2'),
        wrapped('https://example.com/3'),
      ]);

      expect(maxInFlight).toBe(1);
    });

    it('should work when no options are supplied at all', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse(200)) as typeof fetch;

      try {
        const wrapped = resolveFetch();
        const response = await wrapped('https://example.com');

        expect(response.status).toBe(200);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('proactive rate cap', () => {
    it('should defer the 4th request past the default interval when ratelimit is omitted', async () => {
      vi.useFakeTimers();
      try {
        const fetchMock = vi
          .fn<typeof fetch>()
          .mockResolvedValue(jsonResponse(200));

        const wrapped = resolveFetch({
          token: 'secret_t',
          fetch: fetchMock,
        });

        // default cap is 3 requests per 1000ms window
        const promises = [
          wrapped('https://example.com/1'),
          wrapped('https://example.com/2'),
          wrapped('https://example.com/3'),
          wrapped('https://example.com/4'),
        ];

        // within the first window only the first 3 are dispatched
        await vi.advanceTimersByTimeAsync(0);
        expect(fetchMock).toHaveBeenCalledTimes(3);

        // the 4th is released once the next interval window opens
        await vi.advanceTimersByTimeAsync(1000);
        expect(fetchMock).toHaveBeenCalledTimes(4);

        await Promise.all(promises);
      } finally {
        vi.useRealTimers();
      }
    });

    it('should honour a custom count and interval', async () => {
      vi.useFakeTimers();
      try {
        const fetchMock = vi
          .fn<typeof fetch>()
          .mockResolvedValue(jsonResponse(200));

        const wrapped = resolveFetch({
          token: 'secret_t',
          fetch: fetchMock,
          ratelimit: { count: 1, interval: 5000 },
        });

        const promises = [
          wrapped('https://example.com/1'),
          wrapped('https://example.com/2'),
        ];

        // cap of 1 per 5000ms: only the first request runs in the first window
        await vi.advanceTimersByTimeAsync(0);
        expect(fetchMock).toHaveBeenCalledTimes(1);

        // advancing less than the interval does not release the second request
        await vi.advanceTimersByTimeAsync(4000);
        expect(fetchMock).toHaveBeenCalledTimes(1);

        // the second request is released once the 5000ms window elapses
        await vi.advanceTimersByTimeAsync(1000);
        expect(fetchMock).toHaveBeenCalledTimes(2);

        await Promise.all(promises);
      } finally {
        vi.useRealTimers();
      }
    });

    it('should allow up to a custom count within a single interval window', async () => {
      vi.useFakeTimers();
      try {
        const fetchMock = vi
          .fn<typeof fetch>()
          .mockResolvedValue(jsonResponse(200));

        const wrapped = resolveFetch({
          token: 'secret_t',
          fetch: fetchMock,
          ratelimit: { count: 5 },
        });

        const promises = Array.from({ length: 5 }, async (_, index) =>
          wrapped(`https://example.com/${String(index)}`),
        );

        await vi.advanceTimersByTimeAsync(0);
        expect(fetchMock).toHaveBeenCalledTimes(5);

        await Promise.all(promises);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
