import { describe, expect, it } from 'vitest';

import { NotionAnythingError } from '#errors';
import { mapWithConcurrency, resolveConcurrency } from '#request/concurrency';

describe('fn:mapWithConcurrency', () => {
  it('should stop scheduling additional work after the first mapper error', async () => {
    const started: number[] = [];

    await expect(
      mapWithConcurrency(
        [1, 2, 3, 4, 5],
        async (value) => {
          started.push(value);

          if (value === 2) {
            throw new Error('boom');
          }

          if (value === 1) {
            await new Promise((resolve) => setTimeout(resolve, 20));
          }

          return value;
        },
        2,
      ),
    ).rejects.toThrow('boom');

    expect(started.length).toBeLessThan(5);
  });

  it('should reject immediately when aborted before scheduling', async () => {
    const controller = new AbortController();
    controller.abort();

    const error = await mapWithConcurrency([1, 2], async (value) => value, 2, {
      signal: controller.signal,
    }).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(NotionAnythingError);
    expect(error).toMatchObject({
      name: 'AbortError',
      code: 'OPERATION_ABORTED',
    });
  });

  it('should reject with an abort error when aborted after completing all values', async () => {
    const controller = new AbortController();

    const error = await mapWithConcurrency(
      [1],
      async (value) => {
        controller.abort();

        return value;
      },
      1,
      { signal: controller.signal },
    ).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(NotionAnythingError);
    expect(error).toMatchObject({
      name: 'AbortError',
      code: 'OPERATION_ABORTED',
    });
  });

  it('should return an empty array for an empty input without consulting the signal', async () => {
    const result = await mapWithConcurrency([], async (value) => value, 2);

    expect(result).toEqual([]);
  });

  it('should re-throw non-Error thrown values unchanged', async () => {
    await expect(
      mapWithConcurrency(
        [1],
        async () => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error -- intentionally testing non-Error thrown values
          throw 'string rejection';
        },
        1,
      ),
    ).rejects.toBe('string rejection');
  });
});

describe('fn:resolveConcurrency', () => {
  it('should apply the default when value is undefined', () => {
    const result = resolveConcurrency(undefined);

    expect(result).toBeGreaterThan(0);
  });

  it('should return the value when it is a positive integer', () => {
    const result = resolveConcurrency(5);

    expect(result).toEqual(5);
  });

  it('should throw a domain error when value is not a positive integer', () => {
    for (const value of [0, -1, 1.5]) {
      const error = (() => {
        try {
          resolveConcurrency(value);

          return undefined;
        } catch (reason) {
          return reason;
        }
      })();

      expect(error).toBeInstanceOf(NotionAnythingError);
      expect(error).toMatchObject({ code: 'INVALID_CONCURRENCY' });
      expect((error as NotionAnythingError).message).toMatch(
        /concurrency must be a positive integer/,
      );
    }
  });
});
