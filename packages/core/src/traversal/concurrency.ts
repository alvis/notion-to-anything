import { DEFAULT_CONCURRENCY } from '#traversal/constants';

/**
 * resolves and validates traversal concurrency
 * @param value optional concurrency limit
 * @returns validated positive integer concurrency
 */
export function resolveConcurrency(value: number | undefined): number {
  if (value === undefined) {
    return DEFAULT_CONCURRENCY;
  }

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(
      `concurrency must be a positive integer (received: ${String(value)})`,
    );
  }

  return value;
}

/**
 * maps values with optional concurrency control while preserving order
 * @param values source values
 * @param mapper async mapper
 * @param concurrency max concurrency
 * @param options optional configuration for concurrency control
 * @param options.signal optional abort signal to cancel operation
 * @returns mapped results
 */
export async function mapWithConcurrency<T, R>(
  values: T[],
  mapper: (value: T) => Promise<R>,
  concurrency: number,
  options?: { signal?: AbortSignal },
): Promise<R[]> {
  if (values.length === 0) {
    return [];
  }

  throwIfAborted(options?.signal);

  const results = new Array<R>(values.length);
  let nextIndex = 0;
  let firstError: Error | undefined;

  const workerCount = Math.min(values.length, concurrency);
  const workers = Array.from({ length: workerCount }, async () => {
    for (;;) {
      if (firstError) {
        return;
      }

      throwIfAborted(options?.signal);

      const index = nextIndex;
      nextIndex += 1;

      if (index >= values.length) {
        return;
      }

      try {
        results[index] = await mapper(values[index]);
      } catch (error) {
        firstError = error instanceof Error ? error : new Error(String(error));

        return;
      }
    }
  });

  await Promise.all(workers);

  if (firstError) {
    throw firstError;
  }

  throwIfAborted(options?.signal);

  return results;
}

/**
 * throws an AbortError when the provided signal is already aborted
 * @param signal optional abort signal to check for cancellation
 */
function throwIfAborted(signal: AbortSignal | undefined): void {
  if (!signal?.aborted) {
    return;
  }

  throw createAbortError();
}

/**
 * creates a standard AbortError instance
 * @returns abort error
 */
function createAbortError(): Error {
  const error = new Error('The operation was aborted');
  error.name = 'AbortError';

  return error;
}
