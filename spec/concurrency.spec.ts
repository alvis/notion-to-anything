import { describe, expect, it } from 'vitest';

import { mapWithConcurrency } from '#concurrency';

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

    await expect(
      mapWithConcurrency([1, 2], async (value) => value, 2, {
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('should wrap non-Error thrown values into an Error', async () => {
    await expect(
      mapWithConcurrency(
        [1],
        async () => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error -- intentionally testing non-Error thrown values
          throw 'string rejection';
        },
        1,
      ),
    ).rejects.toThrow('string rejection');
  });
});
