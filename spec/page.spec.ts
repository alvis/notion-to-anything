import { Client } from '@notionhq/client';
import { describe, expect, it, vi } from 'vitest';

import { isPageAccessible, NotionPage } from '#page';

import { header1 } from './fixtures/blocks/headers';
import { paragraphSingleline } from './fixtures/blocks/paragraphs';
import { defaultTime } from './fixtures/common';
import { inaccessibleDataSource } from './fixtures/datasources';
import { buildDummyPage } from './fixtures/factories/page';
import { inaccessiblePage, page } from './fixtures/pages';
import {
  createdByProperty,
  numberProperty,
  titleProperty,
} from './fixtures/properties';

import type { NotionBlock, NotionTransformer } from '#types';

const { getBlocks, createChildrenBlockTransformer } = vi.hoisted(() => ({
  getBlocks: vi.fn(),
  createChildrenBlockTransformer: vi.fn(),
}));

vi.mock(
  '#block',
  () =>
    ({
      getBlocks,
      createChildrenBlockTransformer,
    }) satisfies Partial<typeof import('src/block')>,
);

describe('fn:isPageAccessible', () => {
  it('should return true for accessible pages', () => {
    const input = page;
    const expected = true;

    const result = isPageAccessible(input);

    expect(result).toBe(expected);
  });

  it('should return false for inaccessible databases', () => {
    const input = inaccessibleDataSource;
    const expected = false;

    const result = isPageAccessible(input);

    expect(result).toBe(expected);
  });

  it('should return false for inaccessible pages', () => {
    const input = inaccessiblePage;
    const expected = false;

    const result = isPageAccessible(input);

    expect(result).toBe(expected);
  });
});

describe('cl:NotionPage', () => {
  const client = new Client({ fetch });
  const page = new NotionPage(
    client,
    buildDummyPage({
      properties: {
        number: numberProperty,
        customCreatedBy: createdByProperty,
      },
    }),
  );

  describe('mt:getMetadata', () => {
    it('should include all metadata of the page', () => {
      const expected = {
        coverImage: 'https://www.notion.so/cover.png',
        createdByAvatar: 'url',
        createdByEmail: 'email',
        createdByName: 'Name',
        createdAt: defaultTime,
        iconEmoji: '📚',
        iconImage: null,
        id: 'page-id',
        lastEditedByAvatar: 'url',
        lastEditedByEmail: 'email',
        lastEditedByName: 'Name',
        lastEditedAt: defaultTime,
        title: 'Title',
        url: 'https://www.notion.so/workspace/page-id',
        publicUrl: null,
        inTrash: false,
      };

      const result = page.getMetadata();

      expect(result).toEqual(expected);
    });
  });

  describe('gt:properties', () => {
    it('should return all properties of the page, including metadata properties', () => {
      const expected = {
        Name: titleProperty,
        number: numberProperty,
        customCreatedBy: createdByProperty,
      };

      const result = page.properties;

      expect(result).toEqual(expected);
    });
  });

  describe('gt:archived', () => {
    it('should return false when page is not archived', () => {
      const result = page.archived;

      expect(result).toBe(false);
    });
  });

  describe('gt:isLocked', () => {
    it('should return false when page is not locked', () => {
      const result = page.isLocked;

      expect(result).toBe(false);
    });
  });

  describe('op:to', () => {
    // structural constraint: fixtures needed for describe-level setup
    // are only available outside vi.hoisted(); defining inline fixtures
    it('should transform page content using the provided transformer', async () => {
      const blocks = [paragraphSingleline, header1];
      const transformBlock = vi.fn(
        (block: NotionBlock) => `Block: ${block.type}`,
      );
      getBlocks.mockResolvedValue(blocks);
      createChildrenBlockTransformer.mockReturnValue(transformBlock);

      const transformer: NotionTransformer<string, string> = {
        block: (block) => `Block: ${block.type}`,
        page: (blockResults, _page) =>
          `Page with ${blockResults.length} blocks`,
      };
      const expected = 'Page with 2 blocks';

      const result = await page.to(transformer);

      expect(getBlocks).toHaveBeenCalledWith(client, 'page-id');
      expect(result).toBe(expected);
    });

    it('should filter out null blocks returned by transformer', async () => {
      const blocks = [paragraphSingleline, header1];
      const filterTransformBlock = vi.fn((block: NotionBlock) =>
        block.type === 'heading_1' ? null : `Block: ${block.type}`,
      );
      getBlocks.mockResolvedValue(blocks);
      createChildrenBlockTransformer.mockReturnValue(filterTransformBlock);

      const transformer: NotionTransformer<string | null, string> = {
        block: (block) =>
          block.type === 'heading_1' ? null : `Block: ${block.type}`,
        page: (blockResults, _page) =>
          `Page with ${blockResults.length} non-null blocks`,
      };
      const expected = 'Page with 1 non-null blocks';

      const result = await page.to(transformer);

      expect(result).toBe(expected);
    });

    it('should handle empty blocks array', async () => {
      const transformBlock = vi.fn(
        (block: NotionBlock) => `Block: ${block.type}`,
      );
      getBlocks.mockResolvedValue([]);
      createChildrenBlockTransformer.mockReturnValue(transformBlock);

      const transformer: NotionTransformer<string, string> = {
        block: (block) => `Block: ${block.type}`,
        page: (blockResults, _page) =>
          blockResults.length === 0
            ? 'Empty page'
            : `Page with ${blockResults.length} blocks`,
      };
      const expected = 'Empty page';

      const result = await page.to(transformer);

      expect(result).toBe(expected);
    });

    it('should pass page instance to transformer.page method', async () => {
      const blocks = [paragraphSingleline];
      const transformBlock = vi.fn(
        (block: NotionBlock) => `Block: ${block.type}`,
      );
      getBlocks.mockResolvedValue(blocks);
      createChildrenBlockTransformer.mockReturnValue(transformBlock);

      const transformer: NotionTransformer<string, string> = {
        block: (block) => `Block: ${block.type}`,
        page: (_blockResults, pageInstance) => {
          return `Page ${pageInstance.id} with title: ${pageInstance.title}`;
        },
      };
      const expected = 'Page page-id with title: Title';

      const result = await page.to(transformer);

      expect(result).toBe(expected);
    });

    it('should forward traversal options to block helpers', async () => {
      const blocks = [paragraphSingleline];
      const transformBlock = vi.fn(
        (block: NotionBlock) => `Block: ${block.type}`,
      );
      getBlocks.mockResolvedValue(blocks);
      createChildrenBlockTransformer.mockReturnValue(transformBlock);

      const options = { concurrency: 2 };
      const transformer: NotionTransformer<string, string> = {
        block: (block) => `Block: ${block.type}`,
        page: (blockResults) => `Page with ${blockResults.length} blocks`,
      };

      await page.to(transformer, options);

      expect(getBlocks).toHaveBeenCalledWith(client, 'page-id', options);
      expect(createChildrenBlockTransformer).toHaveBeenCalledWith(
        transformer,
        options,
      );
    });

    it('should use entity-stored concurrency as default when no options provided', async () => {
      const pageWithConcurrency = new NotionPage(
        client,
        buildDummyPage({ properties: {} }),
        { concurrency: 3 },
      );

      const blocks = [paragraphSingleline];
      const transformBlock = vi.fn(
        (block: NotionBlock) => `Block: ${block.type}`,
      );
      getBlocks.mockResolvedValue(blocks);
      createChildrenBlockTransformer.mockReturnValue(transformBlock);

      const transformer: NotionTransformer<string, string> = {
        block: (block) => `Block: ${block.type}`,
        page: (blockResults) => `Page with ${blockResults.length} blocks`,
      };

      const result = await pageWithConcurrency.to(transformer);

      expect(result).toBe('Page with 1 blocks');
    });

    it('should allow per-call concurrency to override entity-stored value', async () => {
      const pageWithConcurrency = new NotionPage(
        client,
        buildDummyPage({ properties: {} }),
        { concurrency: 3 },
      );

      const blocks = [paragraphSingleline];
      const transformBlock = vi.fn(
        (block: NotionBlock) => `Block: ${block.type}`,
      );
      getBlocks.mockResolvedValue(blocks);
      createChildrenBlockTransformer.mockReturnValue(transformBlock);

      const options = { concurrency: 10 };
      const transformer: NotionTransformer<string, string> = {
        block: (block) => `Block: ${block.type}`,
        page: (blockResults) => `Page with ${blockResults.length} blocks`,
      };

      await pageWithConcurrency.to(transformer, options);

      expect(getBlocks).toHaveBeenCalledWith(client, 'page-id', options);
    });
  });
});
