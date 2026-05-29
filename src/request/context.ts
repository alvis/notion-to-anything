/** URL/HTTP-derived context attached to request-lifecycle hooks */
export interface RequestContext {
  /** block UUID parsed from the URL path, when present */
  blockId?: string;
  /** page UUID parsed from the URL path, when present */
  pageId?: string;
  /** pagination cursor parsed from the URL query, when present */
  cursor?: string;
  /** page size parsed from the URL query, when present */
  pageSize?: number;
}

/**
 * derives URL/HTTP-only context from a request — no business semantics, only
 * the entity ids and pagination params inferable from the Notion REST path and
 * query string; no human-readable message is built here
 * @param url request URL
 * @returns parsed request context
 */
export function deriveRequestContext(url: string): RequestContext {
  const parsed = safeParseUrl(url);
  const segments = parsed
    ? parsed.pathname.split('/').filter((segment) => segment.length > 0)
    : [];
  const blockId = extractPathId(segments, 'blocks');
  const pageId = extractPathId(segments, 'pages');
  const cursor = parsed?.searchParams.get('start_cursor') ?? undefined;
  const pageSize = parsePageSize(parsed?.searchParams.get('page_size'));

  return {
    blockId,
    pageId,
    cursor,
    pageSize,
  };
}

/**
 * reads the Notion request id from a response's headers
 * @param headers response headers
 * @returns the request id, or undefined when absent
 */
export function pickRequestIdFromHeaders(headers: Headers): string | undefined {
  return (
    headers.get('x-request-id') ?? headers.get('X-Request-Id') ?? undefined
  );
}

// INTERNAL HELPERS //

/**
 * extracts the id immediately following a known REST resource segment
 * @param segments path segments (without empty entries)
 * @param resource resource segment name (e.g. `blocks`, `pages`)
 * @returns the id following the resource, or undefined when absent
 */
function extractPathId(
  segments: string[],
  resource: string,
): string | undefined {
  const index = segments.indexOf(resource);

  if (index === -1) {
    return undefined;
  }

  return segments[index + 1];
}

/**
 * parses a `page_size` query value into a positive integer
 * @param value raw query value
 * @returns the parsed page size, or undefined when missing or invalid
 */
function parsePageSize(value: string | null | undefined): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) ? parsed : undefined;
}

/**
 * safely parses a URL string into a URL instance
 * @param url url string
 * @returns the parsed URL, or undefined when not a valid absolute URL
 */
function safeParseUrl(url: string): URL | undefined {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
}
