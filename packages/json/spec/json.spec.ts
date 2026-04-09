import { Client } from '@notionhq/client';
import { describe, expect, it } from 'vitest';

import { NotionPage } from '@notion-to-anything/core';

import { json as Json } from '../src/page';

import { header1, header2, header3 } from '../../../fixtures/blocks/headers';
import { embeddedImage, externalImage } from '../../../fixtures/blocks/media';
import {
  paragraphEmpty,
  paragraphMultiline,
  paragraphSingleline,
} from '../../../fixtures/blocks/paragraphs';
import { childPage, toggle, unsupported } from '../../../fixtures/blocks/special';
import { buildDummyPage } from '../../../fixtures/factories/page';

import type { JsonBlock } from '../src/block';
import type { NotionBlockWithTransformedChildren, NotionBlock } from '@notion-to-anything/core';

// Helper function to create block properly typed for transformer
function createMockBlockInput(
  block: NotionBlock,
): NotionBlockWithTransformedChildren<JsonBlock> {
  return {
    ...block,
    children: [],
  };
}

describe('fn:Json.block', () => {
  it('should preserve id and type fields in output', () => {
    const blockWithChildren = createMockBlockInput(header1);

    const result = Json.block(blockWithChildren);

    expect(result).toEqual(
      expect.objectContaining({ id: header1.id, type: header1.type }),
    );
  });

  it('should include all metadata fields', () => {
    const blockWithChildren = createMockBlockInput(header1);

    const result = Json.block(blockWithChildren);

    expect(result).toEqual(
      expect.objectContaining({
        createdAt: expect.any(String),
        createdByName: null,
        createdByEmail: null,
        createdByAvatar: null,
        lastEditedAt: expect.any(String),
        lastEditedByName: null,
        lastEditedByEmail: null,
        lastEditedByAvatar: null,
        children: [],
      }),
    );
  });

  it('should preserve children array with proper structure', () => {
    const toggleWithChildren = createMockBlockInput(toggle);
    toggleWithChildren.children = [
      {
        id: 'child-1',
        type: 'paragraph',
        createdAt: '2023-01-01T00:00:00.000Z',
        createdByName: 'Test User',
        createdByEmail: 'test@example.com',
        createdByAvatar: null,
        lastEditedAt: '2023-01-01T00:00:00.000Z',
        lastEditedByName: 'Test User',
        lastEditedByEmail: 'test@example.com',
        lastEditedByAvatar: null,
        children: [],
        paragraph: { rich_text: [] },
      },
    ];
    const expected = 1;

    const result = Json.block(toggleWithChildren);

    expect(result.children).toHaveLength(expected);
  });

  it('should include block-type specific property and exclude internal fields', () => {
    const blockWithChildren = createMockBlockInput(header1);
    const expected = (header1 as Extract<NotionBlock, { type: 'heading_1' }>)
      .heading_1;

    const result = Json.block(blockWithChildren);

    expect(result[header1.type]).toEqual(expected);
    expect('object' in result).toBe(false);
    expect('archived' in result).toBe(false);
    expect('in_trash' in result).toBe(false);
  });

  it.each([
    ['paragraph blocks with metadata', paragraphSingleline],
    ['multiline paragraph blocks with proper structure', paragraphMultiline],
    ['empty paragraph blocks with required properties', paragraphEmpty],
  ])('should handle %s', (_description, paragraph) => {
    const blockWithChildren = createMockBlockInput(paragraph);

    const result = Json.block(blockWithChildren);

    expect(result).toEqual(
      expect.objectContaining({
        id: paragraph.id,
        type: 'paragraph',
        [paragraph.type]: expect.anything(),
        ...(paragraph === paragraphSingleline && {
          createdAt: expect.any(String),
          lastEditedAt: expect.any(String),
        }),
      }),
    );
  });

  it.each([
    ['header1', header1, 'heading_1'],
    ['header2', header2, 'heading_2'],
    ['header3', header3, 'heading_3'],
  ])(
    'should handle %s with proper type mapping',
    (_name, header, expectedType) => {
      const blockWithChildren = createMockBlockInput(header);

      const result = Json.block(blockWithChildren);

      expect(result.type).toBe(expectedType);
      expect(result[header.type]).toBeDefined();
    },
  );

  it.each([
    ['embedded', embeddedImage],
    ['external', externalImage],
  ])('should handle %s image blocks', (_type, image) => {
    const blockWithChildren = createMockBlockInput(image);

    const result = Json.block(blockWithChildren);

    expect(result.type).toBe('image');
    expect(result[image.type]).toBeDefined();
  });

  describe.each([
    ['child page', childPage, 'child_page'],
    ['toggle', toggle, 'toggle'],
    ['unsupported', unsupported, 'unsupported'],
  ])('%s blocks', (_name, block, expectedType) => {
    it('should handle type preservation', () => {
      const blockWithChildren = createMockBlockInput(block);

      const result = Json.block(blockWithChildren);

      expect(result.type).toBe(expectedType);
      expect(result[block.type]).toBeDefined();
    });
  });

  it('should not mutate original block during transformation', () => {
    const originalBlock = createMockBlockInput(header1);
    const expected = JSON.parse(JSON.stringify(originalBlock));

    Json.block(originalBlock);

    expect(originalBlock).toEqual(expected);
  });

  describe('fn:page', () => {
    it('should create page with properties and blocks structure', () => {
      const client = new Client({ fetch });
      const mockBlocks = [] satisfies JsonBlock[];
      const page = new NotionPage(
        client,
        buildDummyPage({
          pageID: 'test-page-id',
        }),
      );

      const result = Json.page(mockBlocks, page);

      expect(result).toEqual(
        expect.objectContaining({
          id: 'test-page-id',
          properties: expect.anything(),
          blocks: mockBlocks,
        }),
      );
    });
  });
});
