import { describe, expect, it } from 'vitest';

import { DEFAULT_CONCURRENCY, Notion } from '#index';

describe('re-exports', () => {
  it('should export the Notion class', () => {
    expect(Notion).toBeDefined();
  });

  it('should export DEFAULT_CONCURRENCY', () => {
    expect(DEFAULT_CONCURRENCY).toBe(25);
  });
});
