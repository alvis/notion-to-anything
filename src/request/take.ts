import { isNotionClientError } from '@notionhq/client';

import { MAX_PAGE_SIZE } from '#constants';
import { NotionAnythingError, NotionAPIError } from '#errors';

import type { Client } from '@notionhq/client';

import type { NotionAPIList } from '#types';

import type { PaginatedRequestMeta } from './hooks';

interface State {
  next: string | undefined;
  hasMore: boolean;
}

/** options for paginated collection */
export interface TakeOptions {
  /** max number of records to collect */
  limit?: number;
  /** abort signal for cancelling pagination */
  signal?: AbortSignal;
  /** initial cursor to start from */
  cursor?: string;
  /**
   * invoked once per page, just before each underlying call, with the
   * structured context derived from this pagination's own state; no
   * human-readable message is built here — only the structured event is emitted
   */
  onRequest?: (meta: PaginatedRequestMeta) => void;
}

/**
 * takes a number of records from a paginated function until the needed number of records is reached
 * @param fn a notion client function that returns paginated results
 * @param arg arguments for the function
 * @param options collection options
 * @returns complete list of records
 */
export async function take<
  F extends
    | Client['blocks']['children']['list']
    | Client['dataSources']['query']
    | Client['search'],
>(
  fn: F,
  arg: Parameters<F>[0],
  options?: TakeOptions,
): Promise<{ next?: string; entities: Awaited<ReturnType<F>>['results'] }>;

export async function take<A extends object>(
  fn: (
    // eslint-disable-next-line @typescript-eslint/naming-convention -- matches Notion API schema
    arg: { page_size: number; start_cursor: string | undefined } & A,
  ) => Promise<NotionAPIList>,
  arg: A,
  options?: TakeOptions,
): Promise<{ next?: string; entities: NotionAPIList['results'] }> {
  const limit = options?.limit ?? Infinity;
  const state: State = { next: options?.cursor, hasMore: true };
  const entities: NotionAPIList['results'] = [];

  // derive the structured request descriptor once; it is invariant per call
  const { kind, method, id } = deriveRequestMeta(arg);

  while (state.hasMore && entities.length < limit) {
    throwIfAborted(options?.signal);

    const pageSize = Math.min(limit - entities.length, MAX_PAGE_SIZE);

    // emit the structured request event before dispatching the call; the
    // position is the offset of this page (entities accumulated so far)
    options?.onRequest?.({
      kind,
      method,
      id,
      position: entities.length,
      pageSize,
      cursor: state.next,
    });

    let page: NotionAPIList;
    try {
      page = await fn({
        ...arg,
        page_size: pageSize,
        start_cursor: state.next,
      });
    } catch (error) {
      if (isNotionClientError(error)) {
        throw NotionAPIError.from(error);
      }

      throw error;
    }

    const { has_more: hasMore, next_cursor: next, results } = page;

    // update the current state
    Object.assign(state, { hasMore, next: next ?? undefined });

    // push the results to the list
    entities.push(...results);
  }

  return { next: state.next, entities };
}

/**
 * derives the structured request kind, method and id from a request argument
 * by inspecting which id key is present
 * @param arg the request argument supplied to {@link take}
 * @returns the request kind, HTTP method, and resource id for the request
 */
function deriveRequestMeta(arg: object): {
  kind: PaginatedRequestMeta['kind'];
  method: PaginatedRequestMeta['method'];
  id?: string;
} {
  const record = arg as Record<string, unknown>;

  // eslint-disable-next-line @typescript-eslint/naming-convention -- matches Notion API schema
  const { block_id, data_source_id, database_id } = record;

  if (typeof block_id === 'string') {
    return { kind: 'block-children', method: 'GET', id: block_id };
  }

  if (typeof data_source_id === 'string') {
    return { kind: 'data-source-query', method: 'POST', id: data_source_id };
  }

  if (typeof database_id === 'string') {
    return { kind: 'database-query', method: 'POST', id: database_id };
  }

  return { kind: 'search', method: 'POST', id: undefined };
}

/**
 * throws a {@link NotionAnythingError} when pagination work is cancelled
 *
 * the underlying DOM-style abort error is preserved as the `cause`, and the
 * thrown error keeps the `AbortError` name so abort-aware callers continue to
 * recognise the cancellation
 * @param signal optional abort signal
 */
function throwIfAborted(signal: AbortSignal | undefined): void {
  if (!signal?.aborted) {
    return;
  }

  const cause = new Error('The operation was aborted');
  cause.name = 'AbortError';

  const error = new NotionAnythingError({
    code: 'OPERATION_ABORTED',
    message: 'The operation was aborted',
    cause,
  });
  error.name = 'AbortError';

  throw error;
}
