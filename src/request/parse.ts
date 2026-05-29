import type { RateLimitDelaySource } from './hooks';

const MILLISECONDS_PER_SECOND = 1000;
const RETRY_AFTER_KEYS = new Set(['retry-after', 'retry_after', 'retryAfter']);

/** fixed safety buffer added on top of the parsed retry-after delay */
export const EXTRA_RATE_LIMIT_BUFFER_MS = 5000;

/** rate-limit metadata extracted from a 429 response */
export interface RateLimitDelayMetadata {
  /** delay in milliseconds before retrying */
  delayMs: number;
  /** where the delay value came from */
  source: RateLimitDelaySource;
  /** Notion request id when available */
  requestId?: string;
}

/**
 * parses retry-after delay from a fetch Headers object or record
 * checks both Headers.get() and object property variants
 * @param headers Headers instance or plain record to parse
 * @returns delay in milliseconds, or undefined when no value is found
 */
export function parseRetryAfterHeader(headers: unknown): number | undefined {
  if (!headers) {
    return undefined;
  }

  if (headers instanceof Headers) {
    return parseDelayMs(headers.get('retry-after'));
  }

  if (isRecord(headers) && typeof headers.get === 'function') {
    const value = (headers.get as (key: string) => unknown)('retry-after');

    return parseDelayMs(value);
  }

  if (!isRecord(headers)) {
    return undefined;
  }

  for (const key of ['retry-after', 'Retry-After']) {
    const value = headers[key];
    const delayMs = parseDelayMs(value);

    if (delayMs !== undefined) {
      return delayMs;
    }
  }

  return undefined;
}

/**
 * parses retry-after delay from a JSON response body string
 * @param body raw response body string to parse
 * @returns delay in milliseconds, or undefined when not found or unparseable
 */
export function parseRetryAfterBody(body: unknown): number | undefined {
  if (typeof body !== 'string') {
    return undefined;
  }

  try {
    return parseRetryAfterValue(JSON.parse(body));
  } catch {
    return undefined;
  }
}

/**
 * parses retry-after delay from an arbitrary value (e.g. additional_data field)
 * @param value value to search for retry-after delay
 * @returns delay in milliseconds, or undefined when not found
 */
export function parseRetryAfterValue(value: unknown): number | undefined {
  const candidate = findRetryAfterValue(value);

  return candidate === undefined ? undefined : parseDelayMs(candidate);
}

/**
 * adds a fixed safety buffer to a parsed retry-after delay
 * @param retryDetails metadata extracted from the 429 response
 * @param bufferMs safety buffer in milliseconds
 * @returns buffered delay in milliseconds
 */
export function getBufferedRateLimitDelayMs(
  retryDetails: RateLimitDelayMetadata,
  bufferMs: number,
): number {
  return retryDetails.delayMs + bufferMs;
}

/**
 * recursively searches a value (string/number/array/record) for the first
 * retry-after-like key and returns the underlying value
 * @param value value to traverse
 * @returns first retry-after candidate, or undefined when none is found
 */
function findRetryAfterValue(value: unknown): unknown {
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRetryAfterValue(item);

      if (found !== undefined) {
        return found;
      }
    }

    return undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (RETRY_AFTER_KEYS.has(key)) {
      return nestedValue;
    }
  }

  for (const nestedValue of Object.values(value)) {
    const found = findRetryAfterValue(nestedValue);

    if (found !== undefined) {
      return found;
    }
  }

  return undefined;
}

/**
 * converts a raw retry-after value to milliseconds
 * accepts numeric seconds, numeric strings, and HTTP-date strings
 * @param value raw value (number, string, or other)
 * @returns delay in milliseconds, or undefined when unparseable
 */
function parseDelayMs(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.round(value * MILLISECONDS_PER_SECOND);
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  const seconds = Number.parseInt(trimmed, 10);
  if (!Number.isNaN(seconds) && seconds >= 0) {
    return seconds * MILLISECONDS_PER_SECOND;
  }

  const dateMs = Date.parse(trimmed);
  if (Number.isNaN(dateMs)) {
    return undefined;
  }

  return Math.max(0, dateMs - Date.now());
}

/**
 * checks whether a value is a non-null record-like object
 * @param value value to check
 * @returns true when value is a non-null object
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
