import { Client } from '@notionhq/client';
import { describe, expect, it, vi } from 'vitest';

import { createChildrenBlockTransformer, getBlocks } from '#block';
import { DEFAULT_CONCURRENCY } from '#constants';

import {
  header1,
  paragraphEmpty,
  paragraphIndented,
  paragraphSingleline,
} from './fixtures/blocks';
import {
  defaultBlockProperties,
  defaultColor,
  defaultRichTextAnnotations,
  defaultTime,
} from './fixtures/common';
import { createPlainText } from './fixtures/factories/richtext';
import { setupBlockList } from './mocks/api';

import type { NotionAPIBlock, NotionBlock, NotionTransformer } from '#types';

describe('fn:getBlocks', () => {
  // use global fetch instead of the default node-fetch from @notionhq/client so that we can mock the API
  const client = new Client({ fetch });

  it('should return all blocks related to a collection', async () => {
    const blockId = 'block-id';
    const expected = [
      {
        archived: false,
        has_children: true,
        children: [
          {
            archived: false,
            parent: { type: 'block_id', block_id: 'block-id-block0' },
            in_trash: false,
            created_by: {
              id: 'person_user',
              object: 'user',
            },
            created_time: defaultTime,
            has_children: false,
            id: 'block-id-block0-block0',
            last_edited_by: {
              id: 'person_user',
              object: 'user',
            },
            last_edited_time: defaultTime,
            object: 'block',
            paragraph: {
              color: 'default',
              rich_text: [
                {
                  annotations: defaultRichTextAnnotations,
                  href: null,
                  plain_text: 'block-id-block0-block0',
                  text: {
                    content: 'block-id-block0-block0',
                    link: null,
                  },
                  type: 'text',
                },
              ],
            },
            type: 'paragraph',
          },
        ],
        parent: { type: 'block_id', block_id: 'block-id' },
        in_trash: false,
        created_by: {
          id: 'person_user',
          object: 'user',
        },
        created_time: defaultTime,
        id: 'block-id-block0',
        last_edited_by: {
          id: 'person_user',
          object: 'user',
        },
        last_edited_time: defaultTime,
        object: 'block',
        paragraph: {
          color: 'default',
          rich_text: [
            {
              annotations: defaultRichTextAnnotations,
              href: null,
              plain_text: 'block-id-block0',
              text: {
                content: 'block-id-block0',
                link: null,
              },
              type: 'text',
            },
          ],
        },
        type: 'paragraph',
      },
    ] satisfies NotionBlock[];
    setupBlockList({ id: blockId, blocks: 1, hasChildren: true });

    const result = await getBlocks(client, blockId);

    expect(result).toEqual(expected);
  });

  it('should filter out inaccessible blocks', async () => {
    const testId = 'test-id';
    const inaccessibleBlock = {
      object: 'block',
      id: 'restricted-block',
    } satisfies Exclude<
      Awaited<ReturnType<Client['blocks']['retrieve']>>,
      NotionAPIBlock
    >;
    const expected: NotionBlock[] = [];
    vi.spyOn(client.blocks.children, 'list').mockResolvedValue({
      results: [inaccessibleBlock],
      has_more: false,
      next_cursor: null,
      object: 'list',
      type: 'block',
      block: {},
    });

    const result = await getBlocks(client, testId);

    expect(result).toEqual(expected);
  });

  it('should handle empty results', async () => {
    const emptyId = 'empty-id';
    const expected: NotionBlock[] = [];
    vi.spyOn(client.blocks.children, 'list').mockResolvedValue({
      results: [],
      has_more: false,
      next_cursor: null,
      object: 'list',
      type: 'block',
      block: {},
    });

    const result = await getBlocks(client, emptyId);

    expect(result).toEqual(expected);
  });

  it('should handle blocks with has_children false', async () => {
    const testId = 'test-id';
    const blockWithoutChildren = { ...paragraphEmpty, id: 'no-children-block' };
    const expected = [{ ...blockWithoutChildren, has_children: false }];
    vi.spyOn(client.blocks.children, 'list').mockResolvedValue({
      results: [blockWithoutChildren],
      has_more: false,
      next_cursor: null,
      object: 'list',
      type: 'block',
      block: {},
    });

    const result = await getBlocks(client, testId);

    expect(result).toEqual(expected);
  });

  it('should handle synced blocks with synced_from reference', async () => {
    const syncedBlockId = 'synced-block-id';
    const originalBlockId = 'original-block-id';
    const syncedBlock = {
      id: syncedBlockId,
      type: 'synced_block',
      synced_block: {
        synced_from: {
          type: 'block_id',
          block_id: originalBlockId,
        },
      },
      has_children: true,
      archived: false,
      in_trash: false,
      created_time: defaultTime,
      last_edited_time: defaultTime,
      created_by: { id: 'user', object: 'user' },
      last_edited_by: { id: 'user', object: 'user' },
      parent: { type: 'page_id', page_id: 'parent-page' },
      object: 'block',
    } satisfies NotionAPIBlock;
    const childBlocks = [
      {
        id: 'child-1',
        type: 'paragraph',
        paragraph: {
          rich_text: [createPlainText('Child content')],
          color: defaultColor,
        },
        has_children: false,
        archived: false,
        in_trash: false,
        created_time: defaultTime,
        last_edited_time: defaultTime,
        created_by: { id: 'user', object: 'user' },
        last_edited_by: { id: 'user', object: 'user' },
        parent: { type: 'block_id', block_id: originalBlockId },
        object: 'block',
      } satisfies NotionAPIBlock,
    ];
    vi.spyOn(client.blocks.children, 'list')
      .mockResolvedValueOnce({
        results: [syncedBlock],
        has_more: false,
        next_cursor: null,
        object: 'list',
        type: 'block',
        block: {},
      })
      .mockResolvedValueOnce({
        results: childBlocks,
        has_more: false,
        next_cursor: null,
        object: 'list',
        type: 'block',
        block: {},
      });

    const result = await getBlocks(client, 'parent-id');

    expect(client.blocks.children.list).toHaveBeenCalledTimes(2);
    expect(client.blocks.children.list).toHaveBeenNthCalledWith(1, {
      block_id: 'parent-id',
      page_size: 100,
    });
    expect(client.blocks.children.list).toHaveBeenNthCalledWith(2, {
      block_id: originalBlockId,
      page_size: 100,
    });
    expect(result[0]).toMatchObject({
      id: syncedBlockId,
      type: 'synced_block',
      has_children: true,
      children: childBlocks,
    });
  });

  it('should handle synced blocks without synced_from (original block)', async () => {
    const syncedBlockId = 'original-synced-block';
    const syncedBlock = {
      id: syncedBlockId,
      type: 'synced_block',
      synced_block: {
        synced_from: null,
      },
      has_children: true,
      archived: false,
      in_trash: false,
      created_time: defaultTime,
      last_edited_time: defaultTime,
      created_by: { id: 'user', object: 'user' },
      last_edited_by: { id: 'user', object: 'user' },
      parent: { type: 'page_id', page_id: 'parent-page' },
      object: 'block',
    } satisfies NotionAPIBlock;
    const childBlocks = [
      {
        id: 'child-1',
        type: 'paragraph',
        paragraph: {
          rich_text: [createPlainText('Original content')],
          color: defaultColor,
        },
        has_children: false,
        archived: false,
        in_trash: false,
        created_time: defaultTime,
        last_edited_time: defaultTime,
        created_by: { id: 'user', object: 'user' },
        last_edited_by: { id: 'user', object: 'user' },
        parent: { type: 'block_id', block_id: syncedBlockId },
        object: 'block',
      } satisfies NotionAPIBlock,
    ];
    vi.spyOn(client.blocks.children, 'list')
      .mockResolvedValueOnce({
        results: [syncedBlock],
        has_more: false,
        next_cursor: null,
        object: 'list',
        type: 'block',
        block: {},
      })
      .mockResolvedValueOnce({
        results: childBlocks,
        has_more: false,
        next_cursor: null,
        object: 'list',
        type: 'block',
        block: {},
      });

    const result = await getBlocks(client, 'parent-id');

    expect(client.blocks.children.list).toHaveBeenNthCalledWith(2, {
      block_id: syncedBlockId,
      page_size: 100,
    });
    expect(result[0]).toMatchObject({
      id: syncedBlockId,
      type: 'synced_block',
      has_children: true,
      children: childBlocks,
    });
  });

  it('should limit recursive block fetch concurrency when configured', async () => {
    const rootBlocks: NotionAPIBlock[] = ['child-a', 'child-b', 'child-c'].map(
      (id) =>
        ({
          ...defaultBlockProperties,
          id,
          type: 'paragraph',
          paragraph: { rich_text: [], color: 'default' },
          has_children: true,
        }) satisfies NotionAPIBlock,
    );

    let activeChildRequests = 0;
    let maxChildRequests = 0;

    vi.spyOn(client.blocks.children, 'list').mockImplementation(
      async ({ block_id }) => {
        if (block_id === 'parent-id') {
          return {
            results: rootBlocks,
            has_more: false,
            next_cursor: null,
            object: 'list',
            type: 'block',
            block: {},
          };
        }

        activeChildRequests += 1;
        maxChildRequests = Math.max(maxChildRequests, activeChildRequests);
        await new Promise((resolve) => setTimeout(resolve, 10));
        activeChildRequests -= 1;

        return {
          results: [],
          has_more: false,
          next_cursor: null,
          object: 'list',
          type: 'block',
          block: {},
        };
      },
    );

    await getBlocks(client, 'parent-id', { concurrency: 1 });

    expect(maxChildRequests).toBe(1);
  });

  it('should use default recursive block fetch concurrency when omitted', async () => {
    const rootBlocks: NotionAPIBlock[] = Array.from(
      { length: 30 },
      (_, index) =>
        ({
          ...defaultBlockProperties,
          id: `child-${index}`,
          type: 'paragraph',
          paragraph: { rich_text: [], color: 'default' },
          has_children: true,
        }) satisfies NotionAPIBlock,
    );

    let activeChildRequests = 0;
    let maxChildRequests = 0;

    vi.spyOn(client.blocks.children, 'list').mockImplementation(
      async ({ block_id }) => {
        if (block_id === 'parent-id') {
          return {
            results: rootBlocks,
            has_more: false,
            next_cursor: null,
            object: 'list',
            type: 'block',
            block: {},
          };
        }

        activeChildRequests += 1;
        maxChildRequests = Math.max(maxChildRequests, activeChildRequests);
        await new Promise((resolve) => setTimeout(resolve, 10));
        activeChildRequests -= 1;

        return {
          results: [],
          has_more: false,
          next_cursor: null,
          object: 'list',
          type: 'block',
          block: {},
        };
      },
    );

    await getBlocks(client, 'parent-id');

    expect(maxChildRequests).toBe(DEFAULT_CONCURRENCY);
  });

  it('should throw for invalid traversal concurrency', async () => {
    await expect(
      getBlocks(client, 'parent-id', { concurrency: 0 }),
    ).rejects.toThrow(/concurrency must be a positive integer/);
  });

  it('should throw AbortError when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      getBlocks(client, 'any-id', { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('fn:createChildrenBlockTransformer', () => {
  it('should transform blocks with children recursively', async () => {
    const baseTransformer: NotionTransformer<string> = {
      block: (block) => `${block.type}:${block.children.length}`,
      page: vi.fn(),
    };
    const transformer = createChildrenBlockTransformer(baseTransformer);
    const blockWithChildren: NotionBlock = {
      ...paragraphSingleline,
      id: 'parent',
      has_children: true,
      children: [
        { ...header1, id: 'child1', has_children: false },
        {
          ...paragraphSingleline,
          id: 'child2',
          has_children: true,
          children: [
            {
              ...defaultBlockProperties,
              id: 'grandchild',
              type: 'bulleted_list_item',
              bulleted_list_item: { rich_text: [], color: 'default' },
              has_children: false,
            } as NotionBlock,
          ],
        },
      ],
    };
    const expected = 'paragraph:2';

    const result = await transformer(blockWithChildren);

    expect(result).toBe(expected);
  });

  it('should handle blocks without children', async () => {
    const baseTransformer: NotionTransformer<string> = {
      block: (block) => `${block.type}:empty`,
      page: vi.fn(),
    };
    const transformer = createChildrenBlockTransformer(baseTransformer);
    const blockWithoutChildren: NotionBlock = {
      ...paragraphEmpty,
      id: 'leaf',
    };
    const expected = 'paragraph:empty';

    const result = await transformer(blockWithoutChildren);

    expect(result).toBe(expected);
  });

  it('should filter out null values returned by transformer', async () => {
    const transformer = {
      block: vi.fn((block) => {
        // return null for heading blocks
        return (block.type as string).startsWith('heading')
          ? null
          : `${block.type}`;
      }),
      page: vi.fn(),
    } satisfies NotionTransformer<string | null>;
    const transformChildren = createChildrenBlockTransformer(transformer);
    const blockWithNativeChildren: NotionBlock = {
      ...paragraphSingleline,
      id: 'parent',
      has_children: true,
      children: [
        { ...header1, id: 'child1', has_children: false },
        { ...paragraphEmpty, id: 'child2' },
        {
          ...defaultBlockProperties,
          id: 'child3',
          type: 'heading_2',
          heading_2: { rich_text: [], color: 'default', is_toggleable: false },
          has_children: false,
        } as NotionBlock,
      ],
    };
    const expected = 'paragraph';

    const result = await transformChildren(blockWithNativeChildren);

    expect(result).toBe(expected);
    const callCount = 4;
    expect(transformer.block.mock.calls.length).toBe(callCount);
  });

  it('should handle transformer returning null for all blocks', async () => {
    const baseTransformer: NotionTransformer<null> = {
      block: () => null,
      page: vi.fn(),
    };
    const transformer = createChildrenBlockTransformer(baseTransformer);
    const block: NotionBlock = {
      ...paragraphSingleline,
      id: 'test',
      has_children: true,
      children: [{ ...paragraphEmpty, id: 'child' }],
    };

    const result = await transformer(block);

    expect(result).toBeNull();
  });

  it('should handle deeply nested block structures', async () => {
    const baseTransformer: NotionTransformer<number> = {
      block: (block) =>
        1 +
        block.children.reduce((sum: number, child: number) => sum + child, 0),
      page: vi.fn(),
    };
    const transformer = createChildrenBlockTransformer(baseTransformer);
    // use the existing nested paragraph fixture and extend it
    const deeplyNestedBlock: NotionBlock = {
      ...paragraphIndented,
      id: 'level1',
      has_children: true,
      children: [
        {
          ...paragraphIndented.children[0],
          id: 'level2',
          children: [
            {
              ...paragraphIndented.children[0].children[0],
              id: 'level3',
              has_children: true,
              children: [
                {
                  ...paragraphEmpty,
                  id: 'level4',
                },
              ],
            },
          ],
        },
      ],
    };
    const expected = 4; // 1 + (1 + (1 + (1 + 0)))

    const result = await transformer(deeplyNestedBlock);

    expect(result).toBe(expected);
  });

  it('should handle transformer errors gracefully', async () => {
    const baseTransformer: NotionTransformer<string> = {
      block: () => {
        throw new Error('Transform error');
      },
      page: vi.fn(),
    };
    const transformer = createChildrenBlockTransformer(baseTransformer);
    const blockWithError: NotionBlock = {
      ...paragraphEmpty,
      id: 'parent',
      has_children: false,
    };

    await expect(transformer(blockWithError)).rejects.toThrow(
      'Transform error',
    );
  });

  it('should process multiple children in parallel', async () => {
    const processingOrder: string[] = [];
    const baseTransformer: NotionTransformer<string> = {
      block: async (block) => {
        processingOrder.push(block.id);
        // simulate async processing
        await new Promise((resolve) => setTimeout(resolve, 10));

        return block.id;
      },
      page: vi.fn(),
    };
    const transformer = createChildrenBlockTransformer(baseTransformer);
    const blockWithMultipleChildren: NotionBlock = {
      ...paragraphSingleline,
      id: 'parent',
      has_children: true,
      children: [
        { ...paragraphEmpty, id: 'child1' },
        { ...paragraphEmpty, id: 'child2' },
        { ...paragraphEmpty, id: 'child3' },
      ],
    };
    const expected = 'parent';

    const result = await transformer(blockWithMultipleChildren);

    expect(result).toBe(expected);
    expect(processingOrder.slice(0, 3)).toContain('child1');
    expect(processingOrder.slice(0, 3)).toContain('child2');
    expect(processingOrder.slice(0, 3)).toContain('child3');
    expect(processingOrder[3]).toBe('parent');
  });
});
