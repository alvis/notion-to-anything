import { describe, expectTypeOf, it } from 'vitest';

// side-effect import so the (type-only) module is loaded at runtime and
// registered by the coverage provider
import '#request/hooks';

import type {
  PaginatedRequestKind,
  PaginatedRequestMeta,
  RateLimitDelaySource,
  RateLimitPauseEvent,
  RateLimitResumeEvent,
  RequestEndMeta,
  RequestHooks,
  RequestStartMeta,
} from '#request/hooks';

describe('ty:request hooks', () => {
  it('should describe the rate-limit delay source union', () => {
    expectTypeOf<RateLimitDelaySource>().toEqualTypeOf<
      'additional_data' | 'body' | 'default' | 'retry_after_header'
    >();
  });

  it('should describe the paginated request kind union', () => {
    expectTypeOf<PaginatedRequestKind>().toEqualTypeOf<
      'block-children' | 'data-source-query' | 'database-query' | 'search'
    >();
  });

  it('should expose the rate-limit pause event shape', () => {
    expectTypeOf<RateLimitPauseEvent>().toMatchTypeOf<{
      delayMs: number;
      source: RateLimitDelaySource;
    }>();
  });

  it('should expose the rate-limit resume event shape', () => {
    expectTypeOf<RateLimitResumeEvent>().toMatchTypeOf<{ delayMs: number }>();
  });

  it('should expose the paginated request metadata shape', () => {
    expectTypeOf<PaginatedRequestMeta>().toMatchTypeOf<{
      kind: PaginatedRequestKind;
      method: 'GET' | 'POST';
      pageSize: number;
    }>();
  });

  it('should expose the request start metadata shape', () => {
    expectTypeOf<RequestStartMeta>().toMatchTypeOf<{
      method: string;
      url: string;
    }>();
  });

  it('should expose the request end metadata shape', () => {
    expectTypeOf<RequestEndMeta>().toMatchTypeOf<{
      method: string;
      url: string;
      status: number;
      durationMs: number;
    }>();
  });

  it('should expose optional lifecycle hook callbacks', () => {
    expectTypeOf<RequestHooks['onRequest']>().toMatchTypeOf<
      ((meta: PaginatedRequestMeta) => void) | undefined
    >();
    expectTypeOf<RequestHooks['onRequestStart']>().toMatchTypeOf<
      ((meta: RequestStartMeta) => void) | undefined
    >();
    expectTypeOf<RequestHooks['onRequestEnd']>().toMatchTypeOf<
      ((meta: RequestEndMeta) => void) | undefined
    >();
  });
});
