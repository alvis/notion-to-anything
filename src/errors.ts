/* eslint-disable max-classes-per-file -- error classes are cohesive */

/**
 * domain error classes for the notion-to-anything package
 *
 * `NotionAPIError` wraps failures surfaced by the `@notionhq/client` SDK into a
 * single, stable shape so call sites can branch on a normalized `code`/`status`
 * without re-reading the SDK's partial error union. `NotionAnythingError`
 * captures package-level failures (misconfiguration, inaccessible entities)
 * that originate inside this library rather than the Notion API.
 */

import { APIResponseError, isHTTPResponseError } from '@notionhq/client';

import type { NotionClientError, NotionErrorCode } from '@notionhq/client';

// TYPES //

/**
 * discriminated set of failure codes raised by notion-to-anything itself
 *
 * - `ENTITY_NOT_ACCESSIBLE`: the integration lacks permission to read an entity
 * - `INVALID_CONCURRENCY`: a non-positive or malformed concurrency setting
 * - `INVALID_RATE_LIMIT`: a non-positive or malformed rate-limit setting
 * - `UNKNOWN_FILE_TYPE`: a media file whose type cannot be determined
 * - `OPERATION_ABORTED`: an in-flight operation was cancelled before completion
 */
export type NotionAnythingErrorCode =
  | 'ENTITY_NOT_ACCESSIBLE'
  | 'INVALID_CONCURRENCY'
  | 'INVALID_RATE_LIMIT'
  | 'UNKNOWN_FILE_TYPE'
  | 'OPERATION_ABORTED';

// EXPORTED CLASSES //

/**
 * normalized error wrapping a failure raised by the `@notionhq/client` SDK
 *
 * the SDK throws several distinct error classes (`APIResponseError`,
 * `UnknownHTTPResponseError`, `RequestTimeoutError`, …) with overlapping but
 * inconsistent fields. this class collapses them into one shape that always
 * carries a `code` and optionally the HTTP `status`, originating `requestId`,
 * and raw response `body`, while preserving the original error via `cause`.
 */
export class NotionAPIError extends Error {
  /** SDK error code identifying the failure category */
  public readonly code: NotionErrorCode;
  /** HTTP status code, when the failure carried an HTTP response */
  public readonly status?: number;
  /** Notion request identifier, when the API reported one */
  public readonly requestId?: string;
  /** raw response body text, when the failure carried an HTTP response */
  public readonly body?: string;

  /**
   * constructs a normalized Notion API error
   * @param options error fields
   * @param options.code SDK error code identifying the failure category
   * @param options.status HTTP status code, when available
   * @param options.requestId Notion request identifier, when available
   * @param options.body raw response body text, when available
   * @param options.message human-readable error message
   * @param options.cause underlying error that triggered this failure
   */
  constructor(options: {
    code: NotionErrorCode;
    status?: number;
    requestId?: string;
    body?: string;
    message: string;
    cause?: unknown;
  }) {
    super(options.message, { cause: options.cause });

    this.name = 'NotionAPIError';
    this.code = options.code;
    this.status = options.status;
    this.requestId = options.requestId;
    this.body = options.body;
  }

  /**
   * derives a `NotionAPIError` from any `@notionhq/client` error
   *
   * HTTP-response errors contribute `status` and `body`; `APIResponseError`
   * additionally contributes `request_id`. the originating SDK error is
   * preserved as the `cause` for diagnostics.
   * @param error error thrown by the Notion SDK
   * @returns a normalized `NotionAPIError`
   */
  public static from(error: NotionClientError): NotionAPIError {
    const status = isHTTPResponseError(error) ? error.status : undefined;
    const body = isHTTPResponseError(error) ? error.body : undefined;
    const requestId = APIResponseError.isAPIResponseError(error)
      ? error.request_id
      : undefined;

    return new NotionAPIError({
      code: error.code,
      status,
      requestId,
      body,
      message: error.message,
      cause: error,
    });
  }
}

/**
 * error raised by notion-to-anything for package-level failures
 *
 * these failures originate inside this library — misconfiguration, inaccessible
 * entities, unrecognized media, or cancelled operations — rather than from the
 * Notion API itself. the `code` field discriminates the failure category.
 */
export class NotionAnythingError extends Error {
  /** discriminated code identifying the failure category */
  public readonly code: NotionAnythingErrorCode;

  /**
   * constructs a package-level error
   * @param options error fields
   * @param options.code discriminated code identifying the failure category
   * @param options.message human-readable error message
   * @param options.cause underlying error that triggered this failure
   */
  constructor(options: {
    code: NotionAnythingErrorCode;
    message: string;
    cause?: unknown;
  }) {
    super(options.message, { cause: options.cause });

    this.name = 'NotionAnythingError';
    this.code = options.code;
  }
}

/* eslint-enable max-classes-per-file */
