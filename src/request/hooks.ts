/** sources from which the rate-limit retry delay was determined */
export type RateLimitDelaySource =
  | 'retry_after_header'
  | 'additional_data'
  | 'body'
  | 'default';

/** event payload describing a pause triggered by a rate-limit response */
export interface RateLimitPauseEvent {
  /** total delay in milliseconds (including buffer) the client will wait */
  delayMs: number;
  /** optional Notion request id correlating the offending request */
  requestId?: string;
  /** where the delay value originated */
  source: RateLimitDelaySource;
}

/** event payload describing the resume after a rate-limit pause */
export interface RateLimitResumeEvent {
  /** delay in milliseconds that the client just waited */
  delayMs: number;
  /** optional Notion request id correlating the offending request */
  requestId?: string;
}

/** the kind of Notion paginated request being made */
export type PaginatedRequestKind =
  | 'block-children'
  | 'data-source-query'
  | 'database-query'
  | 'search';

/**
 * structured metadata describing a single paginated request page, emitted by
 * the `take` pagination helper just before each underlying call; this carries
 * only native structured context derived from `take`'s own state — no
 * human-readable message is built here, consumers compose any display string
 */
export interface PaginatedRequestMeta {
  /** the kind of paginated request being made */
  kind: PaginatedRequestKind;
  /** the HTTP method used for this kind of request */
  method: 'GET' | 'POST';
  /** the resource id the request targets, absent for search */
  id?: string;
  /** the running offset of this page (entities accumulated before the call) */
  position?: number;
  /** the page size requested for this page */
  pageSize: number;
  /** the start cursor for this page, undefined on the first page */
  cursor?: string;
}

/** metadata describing a request as it is dispatched */
export interface RequestStartMeta {
  /** HTTP method (e.g. GET, POST) */
  method: string;
  /** request URL */
  url: string;
  /** block UUID parsed from the URL path, when present */
  blockId?: string;
  /** page UUID parsed from the URL path, when present */
  pageId?: string;
  /** pagination cursor parsed from the URL query, when present */
  cursor?: string;
  /** page size parsed from the URL query, when present */
  pageSize?: number;
}

/** metadata describing a request once a response has been returned */
export interface RequestEndMeta {
  /** HTTP method (e.g. GET, POST) */
  method: string;
  /** request URL */
  url: string;
  /** final HTTP status code */
  status: number;
  /** duration in milliseconds of the final attempt */
  durationMs: number;
  /** Notion request id parsed from the `x-request-id` response header */
  requestId?: string;
  /** block UUID parsed from the URL path, when present */
  blockId?: string;
  /** page UUID parsed from the URL path, when present */
  pageId?: string;
}

/** hooks interface for low-level Notion request lifecycle events */
export interface RequestHooks {
  /**
   * invoked once per paginated page, before the underlying call, with the
   * structured context derived by the `take` pagination helper
   * @param meta structured paginated request metadata
   */
  onRequest?: (meta: PaginatedRequestMeta) => void;
  /**
   * invoked just before a request is dispatched
   * @param meta request metadata
   */
  onRequestStart?(meta: RequestStartMeta): void;
  /**
   * invoked once a non-429 response is returned (after all retries)
   * @param meta request metadata
   */
  onRequestEnd?(meta: RequestEndMeta): void;
  /**
   * invoked when the client begins pausing in response to a 429
   * @param event pause event payload
   */
  onRateLimitPause?(event: RateLimitPauseEvent): void;
  /**
   * invoked once the rate-limit pause has elapsed
   * @param event resume event payload
   */
  onRateLimitResume?(event: RateLimitResumeEvent): void;
}
