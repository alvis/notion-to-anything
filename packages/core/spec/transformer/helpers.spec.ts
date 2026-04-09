import { describe, expect, it, vi } from 'vitest';

import { createBlockTransformer } from '#transformer/helpers';

import {
  bulletedListItemWithChildrenTransformed,
  paragraphWithChildrenTransformed,
  unsupportedWithChildrenTransformed,
} from '../../../../fixtures/blocks';

import type { BlockTransformerMap } from '#types/transformer';

describe('fn:createBlockTransformer', () => {
  const fallback = vi.fn((block) => `default: ${block.type}`);
  const objectTransformer = {
    paragraph: vi.fn((block) => `paragraph: ${block.type}`),
    fallback,
  } satisfies BlockTransformerMap<string>;
  const transform = createBlockTransformer(objectTransformer);

  it('should use specific handler if found', () => {
    const block = paragraphWithChildrenTransformed;
    const expected = 'paragraph: paragraph';

    const result = transform(block);

    expect(objectTransformer.paragraph).toHaveBeenCalledWith(block);
    expect(result).toBe(expected);
  });

  it('should fall back to default handler when no specific handler is found', () => {
    const block = unsupportedWithChildrenTransformed;
    const expected = 'default: unsupported';

    const result = transform(block);

    expect(fallback).toHaveBeenCalledWith(block);
    expect(result).toBe(expected);
  });

  it('should convert snake_case block type to camelCase for handler lookup', () => {
    const bulletedTransformer = {
      bulletedListItem: vi.fn((block) => `bulletedListItem: ${block.type}`),
      fallback: vi.fn(),
    } satisfies BlockTransformerMap<string>;
    const transformBulleted = createBlockTransformer(bulletedTransformer);
    const block = bulletedListItemWithChildrenTransformed;
    const expected = 'bulletedListItem: bulleted_list_item';

    const result = transformBulleted(block);

    expect(bulletedTransformer.bulletedListItem).toHaveBeenCalledWith(block);
    expect(result).toBe(expected);
  });
});
