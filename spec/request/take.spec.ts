import { APIErrorCode, APIResponseError } from '@notionhq/client';
import { describe, expect, it, vi } from 'vitest';

import { NotionAnythingError, NotionAPIError } from '#errors';
import { take } from '#request/take';

import type { PaginatedRequestMeta } from '#request';

describe('fn:take', () => {
  it('should return records up to specified limit', async () => {
    const fn = vi.fn().mockResolvedValue({
      has_more: true,
      next_cursor: 'next',
      results: [1, 2],
    });
    const expected = { next: 'next', entities: [1, 2] };

    const result = await take(fn, { extra: 'extra' }, { limit: 2 });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith({
      extra: 'extra',
      page_size: 2,
      start_cursor: undefined,
    });
    expect(result).toEqual(expected);
  });

  it('should return records until limit is reached across multiple calls', async () => {
    const fn = vi.fn();
    fn.mockResolvedValueOnce({
      has_more: true,
      next_cursor: '1',
      results: [1],
    });
    fn.mockResolvedValueOnce({
      has_more: true,
      next_cursor: '2',
      results: [2],
    });
    fn.mockResolvedValueOnce({
      has_more: true,
      next_cursor: '3',
      results: [3],
    });
    const expected = {
      next: '2',
      entities: [1, 2],
    };

    const result = await take(fn, { extra: 'extra' }, { limit: 2 });

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenCalledWith({
      extra: 'extra',
      page_size: 2,
      start_cursor: undefined,
    });
    expect(fn).toHaveBeenCalledWith({
      extra: 'extra',
      page_size: 1,
      start_cursor: '1',
    });
    expect(result).toEqual(expected);
  });

  it('should return empty list of records when no results are returned', async () => {
    const fn = vi.fn();
    fn.mockResolvedValue({
      has_more: false,
      next_cursor: undefined,
      results: [],
    });
    const expected = { next: undefined, entities: [] };

    const result = await take(fn, { extra: 'extra' }, { limit: 10 });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith({
      extra: 'extra',
      page_size: 10,
      start_cursor: undefined,
    });
    expect(result).toEqual(expected);
  });

  it('should handle Infinity limit (default) by fetching all available records', async () => {
    const fn = vi.fn();
    fn.mockResolvedValueOnce({
      has_more: true,
      next_cursor: 'cursor1',
      results: [1, 2, 3],
    });
    fn.mockResolvedValueOnce({
      has_more: true,
      next_cursor: 'cursor2',
      results: [4, 5, 6],
    });
    fn.mockResolvedValueOnce({
      has_more: false,
      next_cursor: null,
      results: [7, 8],
    });
    const expected = {
      next: undefined,
      entities: [1, 2, 3, 4, 5, 6, 7, 8],
    };

    const result = await take(fn, { extra: 'extra' });

    expect(fn).toHaveBeenCalledTimes(3);
    expect(result).toEqual(expected);
  });

  it('should handle null next_cursor by converting to undefined', async () => {
    const fn = vi.fn();
    fn.mockResolvedValueOnce({
      has_more: true,
      next_cursor: 'cursor1',
      results: [1, 2],
    });
    fn.mockResolvedValueOnce({
      has_more: false,
      next_cursor: null,
      results: [3, 4],
    });

    const result = await take(fn, { extra: 'extra' });

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(2, {
      extra: 'extra',
      page_size: 100,
      start_cursor: 'cursor1',
    });
    expect(result).toEqual({
      next: undefined,
      entities: [1, 2, 3, 4],
    });
  });

  it('should handle has_more false from the start', async () => {
    const fn = vi.fn();
    fn.mockResolvedValue({
      has_more: false,
      next_cursor: null,
      results: [1, 2, 3],
    });

    const result = await take(fn, { extra: 'extra' });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      next: undefined,
      entities: [1, 2, 3],
    });
  });

  it('should handle limit reached mid-batch correctly', async () => {
    const fn = vi.fn();
    fn.mockResolvedValueOnce({
      has_more: true,
      next_cursor: 'cursor1',
      results: [1, 2, 3, 4, 5],
    });
    fn.mockResolvedValueOnce({
      has_more: true,
      next_cursor: 'cursor2',
      results: [6, 7],
    });

    const result = await take(fn, { extra: 'extra' }, { limit: 7 });

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, {
      extra: 'extra',
      page_size: 7,
      start_cursor: undefined,
    });
    expect(fn).toHaveBeenNthCalledWith(2, {
      extra: 'extra',
      page_size: 2,
      start_cursor: 'cursor1',
    });
    expect(result).toEqual({
      next: 'cursor2',
      entities: [1, 2, 3, 4, 5, 6, 7],
    });
  });

  it('should propagate non-SDK errors unchanged', async () => {
    const cause = new Error('API Error');
    const fn = vi.fn();
    fn.mockRejectedValue(cause);

    const error = await take(fn, { extra: 'extra' }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBe(cause);
    expect(error instanceof NotionAPIError).toBe(false);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should wrap a Notion SDK error into a NotionAPIError', async () => {
    const sdkError = new APIResponseError({
      code: APIErrorCode.ObjectNotFound,
      status: 404,
      message: 'not found',
      headers: new Headers(),
      rawBodyText: '{"object":"error"}',
      additional_data: undefined,
      request_id: 'req_1',
    });
    const fn = vi.fn();
    fn.mockRejectedValue(sdkError);

    const error = await take(fn, { extra: 'extra' }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(NotionAPIError);
    if (error instanceof NotionAPIError) {
      expect(error.code).toBe(APIErrorCode.ObjectNotFound);
      expect(error.status).toBe(404);
      expect(error.cause).toBe(sdkError);
    }
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should stop fetching when limit is exactly reached', async () => {
    const fn = vi.fn();
    fn.mockResolvedValueOnce({
      has_more: true,
      next_cursor: 'cursor1',
      results: [1, 2, 3],
    });
    fn.mockResolvedValueOnce({
      has_more: true,
      next_cursor: 'cursor2',
      results: [4, 5],
    });

    const result = await take(fn, { extra: 'extra' }, { limit: 5 });

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, {
      extra: 'extra',
      page_size: 5,
      start_cursor: undefined,
    });
    expect(fn).toHaveBeenNthCalledWith(2, {
      extra: 'extra',
      page_size: 2,
      start_cursor: 'cursor1',
    });
    expect(result).toEqual({
      next: 'cursor2',
      entities: [1, 2, 3, 4, 5],
    });
  });

  it('should handle zero limit', async () => {
    const fn = vi.fn();
    fn.mockResolvedValue({
      has_more: true,
      next_cursor: 'cursor',
      results: [1, 2, 3],
    });

    const result = await take(fn, { extra: 'extra' }, { limit: 0 });

    expect(fn).toHaveBeenCalledTimes(0);
    expect(result).toEqual({
      next: undefined,
      entities: [],
    });
  });

  it('should start from options cursor on first request', async () => {
    const fn = vi.fn().mockResolvedValue({
      has_more: false,
      next_cursor: null,
      results: [1],
    });

    await take(
      fn,
      { extra: 'extra', start_cursor: 'arg-cursor' },
      { cursor: 'options-cursor', limit: 1 },
    );

    expect(fn).toHaveBeenCalledWith({
      extra: 'extra',
      page_size: 1,
      start_cursor: 'options-cursor',
    });
  });

  it('should reject with a NotionAnythingError named AbortError when aborted before pagination starts', async () => {
    const fn = vi.fn();
    const controller = new AbortController();
    controller.abort();

    const error = await take(
      fn,
      { extra: 'extra' },
      { signal: controller.signal },
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(NotionAnythingError);
    expect(error).toMatchObject({ name: 'AbortError' });
    if (error instanceof NotionAnythingError) {
      expect(error.code).toBe('OPERATION_ABORTED');
      expect(error.cause).toMatchObject({ name: 'AbortError' });
    }
    expect(fn).not.toHaveBeenCalled();
  });

  describe('onRequest hook', () => {
    it('should fire once per page with running position, pageSize and cursor', async () => {
      const fn = vi.fn();
      fn.mockResolvedValueOnce({
        has_more: true,
        next_cursor: 'c1',
        results: Array.from({ length: 100 }, (_, i) => i),
      });
      fn.mockResolvedValueOnce({
        has_more: true,
        next_cursor: 'c2',
        results: Array.from({ length: 100 }, (_, i) => 100 + i),
      });
      fn.mockResolvedValueOnce({
        has_more: false,
        next_cursor: null,
        results: [200],
      });

      const events: PaginatedRequestMeta[] = [];
      const onRequest = vi.fn((meta: PaginatedRequestMeta) => {
        events.push(meta);
      });

      await take(fn, { block_id: 'b1' }, { onRequest });

      expect(onRequest).toHaveBeenCalledTimes(3);
      expect(events[0]).toStrictEqual({
        kind: 'block-children',
        method: 'GET',
        id: 'b1',
        position: 0,
        pageSize: 100,
        cursor: undefined,
      });
      expect(events[1]).toStrictEqual({
        kind: 'block-children',
        method: 'GET',
        id: 'b1',
        position: 100,
        pageSize: 100,
        cursor: 'c1',
      });
      expect(events[2]).toStrictEqual({
        kind: 'block-children',
        method: 'GET',
        id: 'b1',
        position: 200,
        pageSize: 100,
        cursor: 'c2',
      });
    });

    it('should derive data-source-query kind and POST method from data_source_id', async () => {
      const fn = vi.fn().mockResolvedValue({
        has_more: false,
        next_cursor: null,
        results: [1],
      });
      const onRequest = vi.fn();

      await take(fn, { data_source_id: 'ds1' }, { onRequest });

      expect(onRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'data-source-query',
          method: 'POST',
          id: 'ds1',
        }),
      );
    });

    it('should derive database-query kind and POST method from database_id', async () => {
      const fn = vi.fn().mockResolvedValue({
        has_more: false,
        next_cursor: null,
        results: [1],
      });
      const onRequest = vi.fn();

      await take(fn, { database_id: 'db1' }, { onRequest });

      expect(onRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'database-query',
          method: 'POST',
          id: 'db1',
        }),
      );
    });

    it('should derive search kind, POST method and no id when no id key is present', async () => {
      const fn = vi.fn().mockResolvedValue({
        has_more: false,
        next_cursor: null,
        results: [1],
      });
      const onRequest = vi.fn();

      await take(fn, { query: '' }, { onRequest });

      expect(onRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'search',
          method: 'POST',
          id: undefined,
        }),
      );
    });

    it('should report the computed pageSize clamped to the remaining limit', async () => {
      const fn = vi.fn().mockResolvedValue({
        has_more: false,
        next_cursor: null,
        results: [1, 2],
      });
      const onRequest = vi.fn();

      await take(fn, { block_id: 'b1' }, { onRequest, limit: 25 });

      expect(onRequest).toHaveBeenCalledWith(
        expect.objectContaining({ pageSize: 25, position: 0 }),
      );
    });

    it('should pass through the starting cursor on the first emitted event', async () => {
      const fn = vi.fn().mockResolvedValue({
        has_more: false,
        next_cursor: null,
        results: [1],
      });
      const onRequest = vi.fn();

      await take(fn, { block_id: 'b1' }, { onRequest, cursor: 'resume' });

      expect(onRequest).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: 'resume', position: 0 }),
      );
    });

    it('should not fire when the limit is zero (no pages fetched)', async () => {
      const fn = vi.fn().mockResolvedValue({
        has_more: true,
        next_cursor: 'cursor',
        results: [1, 2, 3],
      });
      const onRequest = vi.fn();

      const result = await take(
        fn,
        { block_id: 'b1' },
        { onRequest, limit: 0 },
      );

      expect(onRequest).not.toHaveBeenCalled();
      expect(fn).not.toHaveBeenCalled();
      expect(result).toEqual({ next: undefined, entities: [] });
    });

    it('should not fire when there are no results and no further pages', async () => {
      const fn = vi.fn().mockResolvedValue({
        has_more: false,
        next_cursor: null,
        results: [],
      });
      const onRequest = vi.fn();

      await take(fn, { block_id: 'b1' }, { onRequest });

      // a single page is still requested; onRequest fires once for that page,
      // then never again because there are no further pages
      expect(onRequest).toHaveBeenCalledTimes(1);
      expect(onRequest).toHaveBeenCalledWith(
        expect.objectContaining({ position: 0 }),
      );
    });
  });
});
