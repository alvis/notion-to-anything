import {
  DEFAULT_RATE_LIMIT_COUNT,
  DEFAULT_RATE_LIMIT_INTERVAL,
} from '#constants';
import { NotionAnythingError } from '#errors';

/** proactive request rate cap applied to all Notion API calls */
export interface RatelimitOptions {
  /** max requests per interval (default: 3) */
  count?: number;
  /** interval window in milliseconds (default: 1000) */
  interval?: number;
}

/** fully-resolved proactive rate cap */
export interface ResolvedRatelimit {
  /** max requests per interval */
  count: number;
  /** interval window in milliseconds */
  interval: number;
}

/**
 * resolves and validates the proactive rate cap, applying defaults even when
 * the option is omitted so the Notion API is always protected
 * @param value optional rate cap configuration
 * @returns validated rate cap with positive-integer count and interval
 */
export function resolveRatelimit(
  value: RatelimitOptions | undefined,
): ResolvedRatelimit {
  const count = value?.count ?? DEFAULT_RATE_LIMIT_COUNT;
  const interval = value?.interval ?? DEFAULT_RATE_LIMIT_INTERVAL;

  if (!Number.isInteger(count) || count <= 0) {
    throw new NotionAnythingError({
      code: 'INVALID_RATE_LIMIT',
      message: `count must be a positive integer (received: ${String(count)})`,
    });
  }

  if (!Number.isInteger(interval) || interval <= 0) {
    throw new NotionAnythingError({
      code: 'INVALID_RATE_LIMIT',
      message: `interval must be a positive integer (received: ${String(interval)})`,
    });
  }

  return { count, interval };
}
