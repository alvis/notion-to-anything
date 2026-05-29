import { describe, expect, it, vi } from 'vitest';

import {
  EXTRA_RATE_LIMIT_BUFFER_MS,
  getBufferedRateLimitDelayMs,
  parseRetryAfterBody,
  parseRetryAfterHeader,
  parseRetryAfterValue,
} from '#request/parse';

vi.useFakeTimers();
vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

describe('fn:parseRetryAfterHeader', () => {
  it('should parse integer seconds from a Headers instance', () => {
    const headers = new Headers({ 'retry-after': '30' });

    expect(parseRetryAfterHeader(headers)).toBe(30000);
  });

  it('should parse an HTTP-date from a Headers instance', () => {
    const headers = new Headers({
      'retry-after': 'Wed, 01 Jan 2025 00:00:15 GMT',
    });

    expect(parseRetryAfterHeader(headers)).toBe(15000);
  });

  it('should parse from a record-like map with get()', () => {
    const headers = {
      get: (key: string) => (key === 'retry-after' ? '5' : undefined),
    };

    expect(parseRetryAfterHeader(headers)).toBe(5000);
  });

  it('should parse from a plain object with mixed case keys', () => {
    expect(parseRetryAfterHeader({ 'Retry-After': '7' })).toBe(7000);
  });

  it('should return undefined when headers are missing or null', () => {
    expect(parseRetryAfterHeader(undefined)).toBeUndefined();
    expect(parseRetryAfterHeader(null)).toBeUndefined();
  });

  it('should return undefined when value is not parseable', () => {
    expect(
      parseRetryAfterHeader({ 'retry-after': 'not-a-date' }),
    ).toBeUndefined();
  });

  it('should return undefined when value is non-string non-number', () => {
    expect(parseRetryAfterHeader({ 'retry-after': true })).toBeUndefined();
  });

  it('should return undefined when headers is a truthy non-object (e.g. string/number)', () => {
    expect(parseRetryAfterHeader('not-a-record')).toBeUndefined();
    expect(parseRetryAfterHeader(42)).toBeUndefined();
  });
});

describe('fn:parseRetryAfterBody', () => {
  it('should parse JSON body with nested retry_after key', () => {
    const body = JSON.stringify({
      error: { details: { retry_after: 12 } },
    });

    expect(parseRetryAfterBody(body)).toBe(12000);
  });

  it('should return undefined when body is not a string', () => {
    expect(parseRetryAfterBody(undefined)).toBeUndefined();
    expect(parseRetryAfterBody(123)).toBeUndefined();
  });

  it('should return undefined when body is not valid JSON', () => {
    expect(parseRetryAfterBody('not-json')).toBeUndefined();
  });

  it('should return undefined when JSON has no usable nested values', () => {
    expect(
      parseRetryAfterBody(JSON.stringify({ other: null })),
    ).toBeUndefined();
  });
});

describe('fn:parseRetryAfterValue', () => {
  it('should parse number seconds directly', () => {
    expect(parseRetryAfterValue(8)).toBe(8000);
  });

  it('should parse an additional_data record variant', () => {
    expect(parseRetryAfterValue({ retryAfter: '4' })).toBe(4000);
  });

  it('should parse arrays by finding the first retry-after key in an item', () => {
    expect(parseRetryAfterValue([{ noise: null }, { 'retry-after': 6 }])).toBe(
      6000,
    );
  });

  it('should parse arrays of primitives by returning the first value', () => {
    expect(parseRetryAfterValue([9, 'x'])).toBe(9000);
  });

  it('should return undefined for null and unrelated values', () => {
    expect(parseRetryAfterValue(null)).toBeUndefined();
    expect(parseRetryAfterValue({ unrelated: 'x' })).toBeUndefined();
  });

  it('should return undefined when number is negative', () => {
    expect(parseRetryAfterValue(-1)).toBeUndefined();
  });

  it('should return undefined when string is empty', () => {
    expect(parseRetryAfterValue({ 'retry-after': '   ' })).toBeUndefined();
  });

  it('should return undefined when an array yields no retry-after candidates', () => {
    expect(parseRetryAfterValue([null, undefined, {}])).toBeUndefined();
  });
});

describe('fn:getBufferedRateLimitDelayMs', () => {
  it('should add the supplied buffer to the parsed delay', () => {
    const buffered = getBufferedRateLimitDelayMs(
      { delayMs: 10000, source: 'retry_after_header' },
      EXTRA_RATE_LIMIT_BUFFER_MS,
    );

    expect(buffered).toBe(15000);
  });

  it('should expose a fixed 5s buffer constant', () => {
    expect(EXTRA_RATE_LIMIT_BUFFER_MS).toBe(5000);
  });
});

describe('fn:parseRetryAfterHeader edge cases', () => {
  it('should floor past HTTP-dates to zero ms', () => {
    const headers = new Headers({
      'retry-after': 'Wed, 01 Jan 2024 00:00:00 GMT',
    });

    expect(parseRetryAfterHeader(headers)).toBe(0);
  });
});
