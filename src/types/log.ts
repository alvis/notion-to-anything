import type { PaginatedRequestMeta, RateLimitDelaySource } from '#request';

/** URL/HTTP request descriptor surfaced by start/end fetch hooks */
export interface UrlRequestLogMeta {
  /** HTTP method (e.g. GET, POST) */
  method: string;
  /** request URL */
  url: string;
  /** final HTTP status code, when a response was returned */
  status?: number;
  /** duration in milliseconds, when the request has completed */
  durationMs?: number;
  /** Notion request id correlating the request, when present */
  requestId?: string;
}

/**
 * request lifecycle log meta (paginated or URL/HTTP); the payload is nested
 * under `request` so it does not clash with PaginatedRequestMeta's own `kind`
 */
export interface RequestLogMeta {
  /** discriminant identifying this as a request log meta */
  kind: 'request';
  /** the paginated or URL/HTTP request payload being logged */
  request: PaginatedRequestMeta | UrlRequestLogMeta;
}

/** rate-limit pause/resume log meta emitted outside any transfer scope */
export interface RateLimitLogMeta {
  /** discriminant identifying this as a rate-limit log meta */
  kind: 'ratelimit';
  /** delay in milliseconds before the request may be retried */
  retryAfterMs: number;
  /** where the retry delay value originated */
  retryAfterSource?: RateLimitDelaySource;
  /** Notion request id correlating the offending request, when present */
  requestId?: string;
}

/** base discriminated-union log meta owned by notion-to-anything */
export type LogMeta = RequestLogMeta | RateLimitLogMeta;
