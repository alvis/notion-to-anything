import { describe, expect, it } from 'vitest';

import {
  DEFAULT_RATE_LIMIT_COUNT,
  DEFAULT_RATE_LIMIT_INTERVAL,
} from '#constants';
import { NotionAnythingError } from '#errors';
import { resolveRatelimit } from '#request/ratelimit';

/**
 * captures the error thrown by invoking a function, or undefined when none
 * @param run the function expected to throw
 * @returns the thrown value, or undefined when nothing was thrown
 */
function captureError(run: () => unknown): unknown {
  try {
    run();

    return undefined;
  } catch (error) {
    return error;
  }
}

describe('fn:resolveRatelimit', () => {
  it('should apply defaults when ratelimit is undefined', () => {
    const result = resolveRatelimit(undefined);

    expect(result).toEqual({
      count: DEFAULT_RATE_LIMIT_COUNT,
      interval: DEFAULT_RATE_LIMIT_INTERVAL,
    });
  });

  it('should apply defaults when ratelimit is an empty object', () => {
    const result = resolveRatelimit({});

    expect(result).toEqual({
      count: DEFAULT_RATE_LIMIT_COUNT,
      interval: DEFAULT_RATE_LIMIT_INTERVAL,
    });
  });

  it('should honour a custom count while defaulting the interval', () => {
    const result = resolveRatelimit({ count: 10 });

    expect(result).toEqual({
      count: 10,
      interval: DEFAULT_RATE_LIMIT_INTERVAL,
    });
  });

  it('should honour a custom interval while defaulting the count', () => {
    const result = resolveRatelimit({ interval: 5000 });

    expect(result).toEqual({
      count: DEFAULT_RATE_LIMIT_COUNT,
      interval: 5000,
    });
  });

  it('should honour both custom count and interval', () => {
    const result = resolveRatelimit({ count: 7, interval: 2000 });

    expect(result).toEqual({ count: 7, interval: 2000 });
  });

  it('should throw a domain error when count is not a positive integer', () => {
    for (const count of [0, -1, 1.5]) {
      const error = captureError(() => resolveRatelimit({ count }));

      expect(error).toBeInstanceOf(NotionAnythingError);
      expect(error).toMatchObject({ code: 'INVALID_RATE_LIMIT' });
      expect((error as NotionAnythingError).message).toMatch(
        /count must be a positive integer/,
      );
    }
  });

  it('should throw a domain error when interval is not a positive integer', () => {
    for (const interval of [0, -100, 10.25]) {
      const error = captureError(() => resolveRatelimit({ interval }));

      expect(error).toBeInstanceOf(NotionAnythingError);
      expect(error).toMatchObject({ code: 'INVALID_RATE_LIMIT' });
      expect((error as NotionAnythingError).message).toMatch(
        /interval must be a positive integer/,
      );
    }
  });
});
