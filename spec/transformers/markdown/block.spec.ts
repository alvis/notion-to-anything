import { describe, expect, expectTypeOf, it } from 'vitest';

import { fallback } from '#transformers/markdown/block';

import type { CamelCase } from 'type-fest';

import type { NotionBlockType } from '#types';

describe('completeness', () => {
  it('should contain all block transformers', () => {
    type TransformerBlock = keyof typeof import('#transformers/markdown/block');

    type Extra = Exclude<
      Exclude<TransformerBlock, 'fallback'>,
      CamelCase<NotionBlockType>
    >;
    type Missing = Exclude<
      CamelCase<NotionBlockType>,
      Exclude<TransformerBlock, 'fallback'>
    >;

    expectTypeOf<Missing>().toEqualTypeOf<never>();
    expectTypeOf<Extra>().toEqualTypeOf<never>();
  });
});

describe('fn:fallback', () => {
  it('should always return null for unknown block types', () => {
    // cast required to simulate a block with an unrecognized type at runtime
    const result = fallback({} as unknown as Parameters<typeof fallback>[0]);
    expect(result).toBeNull();
  });
});
