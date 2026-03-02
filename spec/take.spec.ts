import { describe, expect, it, vi } from 'vitest';

import { take } from '#take';

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

  it('should handle API errors by propagating them', async () => {
    const fn = vi.fn();
    fn.mockRejectedValue(new Error('API Error'));

    await expect(take(fn, { extra: 'extra' })).rejects.toThrow('API Error');
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

  it('should reject with AbortError when aborted before pagination starts', async () => {
    const fn = vi.fn();
    const controller = new AbortController();
    controller.abort();

    await expect(
      take(fn, { extra: 'extra' }, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fn).not.toHaveBeenCalled();
  });
});
