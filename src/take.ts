import { MAX_PAGE_SIZE } from '#constants';

import type { Client } from '@notionhq/client';

import type { NotionAPIList } from '#types';

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

  while (state.hasMore && entities.length < limit) {
    throwIfAborted(options?.signal);

    const {
      has_more: hasMore,
      next_cursor: next,
      results,
    } = await fn({
      ...arg,
      page_size: Math.min(limit - entities.length, MAX_PAGE_SIZE),
      start_cursor: state.next,
    });

    // update the current state
    Object.assign(state, { hasMore, next: next ?? undefined });

    // push the results to the list
    entities.push(...results);
  }

  return { next: state.next, entities };
}

/**
 * throws when pagination work is cancelled
 * @param signal optional abort signal
 */
function throwIfAborted(signal: AbortSignal | undefined): void {
  if (!signal?.aborted) {
    return;
  }

  const error = new Error('The operation was aborted');
  error.name = 'AbortError';

  throw error;
}
