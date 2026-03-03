import { Client } from '@notionhq/client';
import { describe, expect, it, vi } from 'vitest';

import { NotionDataSource } from '#datasource';
import * as takeModule from '#take';
import { UserResolver } from '#user';

import { defaultTime } from './fixtures/common';
import { buildDummyDataSource } from './fixtures/factories/datasource';
import { buildDummyPage } from './fixtures/factories/page';
import { setupDataSource } from './mocks/api';

import type { EntityCache } from '#entity';
import type { NotionAPIDataSource } from '#types';

describe('cl:NotionDataSource', () => {
  // use global fetch instead of the default node-fetch from @notionhq/client so that we can mock the API
  const client = new Client({ fetch });

  const dataSource = new NotionDataSource(client, buildDummyDataSource());

  describe('mt:getMetadata', () => {
    it('should include all metadata of the datasource', () => {
      const expected = {
        coverImage: 'https://www.notion.so/cover.png',
        createdByAvatar: 'url',
        createdByEmail: 'email',
        createdByName: 'Name',
        createdAt: defaultTime,
        iconEmoji: '📚',
        iconImage: null,
        id: 'database-id',
        lastEditedByAvatar: 'url',
        lastEditedByEmail: 'email',
        lastEditedByName: 'Name',
        lastEditedAt: defaultTime,
        title: 'Title',
        url: 'https://www.notion.so/workspace/database-id',
        publicUrl: null,
        inTrash: false,
      };

      const result = dataSource.getMetadata();

      expect(result).toEqual(expected);
    });
  });

  describe('op:search', () => {
    it('should return a list of pages', async () => {
      const dataSource = new NotionDataSource(
        client,
        buildDummyDataSource({ id: 'database-for-listing-id' }),
      );
      setupDataSource({
        id: 'database-for-listing-id',
        pages: 5,
        blocks: 2,
      });
      const expected = 2;

      const result = await dataSource.search({ limit: 2 });

      expect(result.pages.length).toBe(expected);
      expect(result.pages[0].id).toBe('database-for-listing-id-page0');
    });

    it('should handle filter parameter in search', async () => {
      const dataSource = new NotionDataSource(
        client,
        buildDummyDataSource({ id: 'filtered-db' }),
      );
      const filter = {
        property: 'Status',
        select: {
          equals: 'Done',
        },
      };
      const takeSpy = vi.spyOn(takeModule, 'take').mockResolvedValue({
        entities: [
          buildDummyPage({
            pageID: 'page1',
            parent: { type: 'database_id', database_id: 'filtered-db' },
            properties: {
              Status: {
                id: 'status',
                type: 'select',
                select: { id: '1', name: 'Done', color: 'green' },
              },
            },
          }),
          buildDummyPage({
            pageID: 'page2',
            parent: { type: 'database_id', database_id: 'filtered-db' },
            properties: {
              Status: {
                id: 'status',
                type: 'select',
                select: { id: '1', name: 'Done', color: 'green' },
              },
            },
          }),
        ],
      });

      const result = await dataSource.search({ filter });

      expect(takeSpy).toHaveBeenCalledWith(
        client.dataSources.query,
        {
          data_source_id: 'filtered-db',
          filter,
          sorts: undefined,
        },
        { limit: undefined, cursor: undefined },
      );
      expect(result.pages.length).toBe(2);
    });

    it('should handle sorts parameter in search', async () => {
      const dataSource = new NotionDataSource(
        client,
        buildDummyDataSource({ id: 'sorted-db' }),
      );

      const takeSpy = vi.spyOn(takeModule, 'take').mockResolvedValue({
        entities: [
          buildDummyPage({
            pageID: 'page1',
            parent: { type: 'database_id', database_id: 'sorted-db' },
          }),
          buildDummyPage({
            pageID: 'page2',
            parent: { type: 'database_id', database_id: 'sorted-db' },
          }),
        ],
      });

      const result = await dataSource.search({
        sorts: [{ field: 'Created', order: 'desc' }],
      });

      expect(takeSpy).toHaveBeenCalledWith(
        client.dataSources.query,
        {
          data_source_id: 'sorted-db',
          filter: undefined,
          sorts: [{ property: 'Created', direction: 'descending' }],
        },
        { limit: undefined, cursor: undefined },
      );
      expect(result.pages.length).toBe(2);
    });

    it('should handle limit parameter in search', async () => {
      const dataSource = new NotionDataSource(
        client,
        buildDummyDataSource({ id: 'limited-db' }),
      );

      const takeSpy = vi.spyOn(takeModule, 'take').mockResolvedValue({
        entities: [
          buildDummyPage({
            pageID: 'page1',
            parent: { type: 'database_id', database_id: 'limited-db' },
          }),
          buildDummyPage({
            pageID: 'page2',
            parent: { type: 'database_id', database_id: 'limited-db' },
          }),
          buildDummyPage({
            pageID: 'page3',
            parent: { type: 'database_id', database_id: 'limited-db' },
          }),
        ],
      });

      const result = await dataSource.search({ limit: 3 });

      expect(takeSpy).toHaveBeenCalledWith(
        client.dataSources.query,
        {
          data_source_id: 'limited-db',
          filter: undefined,
          sorts: undefined,
        },
        { limit: 3, cursor: undefined },
      );
      expect(result.pages.length).toBe(3);
    });

    it('should handle cursor parameter for pagination', async () => {
      const dataSource = new NotionDataSource(
        client,
        buildDummyDataSource({ id: 'paginated-db' }),
      );

      const takeSpy = vi.spyOn(takeModule, 'take').mockResolvedValue({
        entities: [
          buildDummyPage({
            pageID: 'page3',
            parent: { type: 'database_id', database_id: 'paginated-db' },
          }),
          buildDummyPage({
            pageID: 'page4',
            parent: { type: 'database_id', database_id: 'paginated-db' },
          }),
        ],
        next: 'next-cursor',
      });

      const result = await dataSource.search({
        cursor: 'start-cursor',
        limit: 2,
      });

      expect(takeSpy).toHaveBeenCalledWith(
        client.dataSources.query,
        {
          data_source_id: 'paginated-db',
          filter: undefined,
          sorts: undefined,
        },
        { limit: 2, cursor: 'start-cursor' },
      );
      expect(result.pages.length).toBe(2);
      expect(result.cursor).toBe('next-cursor');
    });

    it('should handle all parameters combined', async () => {
      const dataSource = new NotionDataSource(
        client,
        buildDummyDataSource({ id: 'complex-db' }),
      );

      const filter = {
        and: [
          { property: 'Status', select: { equals: 'In Progress' } },
          { property: 'Priority', select: { equals: 'High' } },
        ],
      };

      const takeSpy = vi.spyOn(takeModule, 'take').mockResolvedValue({
        entities: [
          buildDummyPage({
            pageID: 'page1',
            parent: { type: 'database_id', database_id: 'complex-db' },
          }),
        ],
        next: 'cursor',
      });

      const result = await dataSource.search({
        filter,
        sorts: [
          { field: 'Due Date', order: 'asc' },
          { field: 'Priority', order: 'desc' },
        ],
        cursor: 'start',
        limit: 10,
      });

      expect(takeSpy).toHaveBeenCalledWith(
        client.dataSources.query,
        {
          data_source_id: 'complex-db',
          filter,
          sorts: [
            { property: 'Due Date', direction: 'ascending' },
            { property: 'Priority', direction: 'descending' },
          ],
        },
        { limit: 10, cursor: 'start' },
      );
      expect(result.pages.length).toBe(1);
      expect(result.cursor).toBe('cursor');
    });

    it('should handle empty results', async () => {
      const dataSource = new NotionDataSource(
        client,
        buildDummyDataSource({ id: 'empty-db' }),
      );

      vi.spyOn(takeModule, 'take').mockResolvedValue({
        entities: [],
      });

      const result = await dataSource.search({});

      expect(result.pages).toEqual([]);
    });

    it('should handle API errors in search', async () => {
      const dataSource = new NotionDataSource(
        client,
        buildDummyDataSource({ id: 'error-db' }),
      );

      vi.spyOn(takeModule, 'take').mockRejectedValue(
        new Error('Database not found'),
      );

      await expect(dataSource.search({})).rejects.toThrow('Database not found');
    });

    it('should use default parameters when none provided', async () => {
      const dataSource = new NotionDataSource(
        client,
        buildDummyDataSource({ id: 'default-db' }),
      );

      const takeSpy = vi.spyOn(takeModule, 'take').mockResolvedValue({
        entities: [
          buildDummyPage({
            pageID: 'page1',
            parent: { type: 'database_id', database_id: 'default-db' },
          }),
        ],
      });

      await dataSource.search();

      expect(takeSpy).toHaveBeenCalledWith(
        client.dataSources.query,
        {
          data_source_id: 'default-db',
          filter: undefined,
          sorts: undefined,
        },
        { limit: undefined, cursor: undefined },
      );
    });

    it('should enrich page users when resolver is provided', async () => {
      const resolver = new UserResolver(client);
      const dataSource = new NotionDataSource(
        client,
        buildDummyDataSource({ id: 'enriched-db' }),
        { userResolver: resolver },
      );

      vi.spyOn(takeModule, 'take').mockResolvedValue({
        entities: [
          buildDummyPage({
            pageID: 'enriched-page',
            parent: { type: 'database_id', database_id: 'enriched-db' },
          }),
        ],
      });

      const result = await dataSource.search();

      expect(result.pages.length).toBe(1);
      expect(result.pages[0].id).toBe('enriched-page');
    });

    it('should emulate offset by over-fetching and slicing', async () => {
      const dataSource = new NotionDataSource(
        client,
        buildDummyDataSource({ id: 'offset-db' }),
      );

      const takeSpy = vi.spyOn(takeModule, 'take').mockResolvedValue({
        entities: [
          buildDummyPage({
            pageID: 'page0',
            parent: { type: 'database_id', database_id: 'offset-db' },
          }),
          buildDummyPage({
            pageID: 'page1',
            parent: { type: 'database_id', database_id: 'offset-db' },
          }),
          buildDummyPage({
            pageID: 'page2',
            parent: { type: 'database_id', database_id: 'offset-db' },
          }),
          buildDummyPage({
            pageID: 'page3',
            parent: { type: 'database_id', database_id: 'offset-db' },
          }),
          buildDummyPage({
            pageID: 'page4',
            parent: { type: 'database_id', database_id: 'offset-db' },
          }),
        ],
      });

      const result = await dataSource.search({ offset: 2, limit: 3 });

      expect(takeSpy).toHaveBeenCalledWith(
        client.dataSources.query,
        {
          data_source_id: 'offset-db',
          filter: undefined,
          sorts: undefined,
        },
        { limit: 5, cursor: undefined },
      );
      expect(result.pages.length).toBe(3);
      expect(result.pages[0].id).toBe('page2');
    });

    it('should pass signal to take when provided', async () => {
      const dataSource = new NotionDataSource(
        client,
        buildDummyDataSource({ id: 'signal-db' }),
      );

      const controller = new AbortController();
      const takeSpy = vi.spyOn(takeModule, 'take').mockResolvedValue({
        entities: [
          buildDummyPage({
            pageID: 'page1',
            parent: { type: 'database_id', database_id: 'signal-db' },
          }),
        ],
      });

      await dataSource.search({ signal: controller.signal });

      expect(takeSpy).toHaveBeenCalledWith(
        client.dataSources.query,
        expect.any(Object),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it('should populate cache with page entities from search results', async () => {
      const entityCache: EntityCache = {
        pages: new Map(),
        databases: new Map(),
        dataSources: new Map(),
      };
      const dataSource = new NotionDataSource(
        client,
        buildDummyDataSource({ id: 'cache-pop-db' }),
        { cache: entityCache },
      );

      vi.spyOn(takeModule, 'take').mockResolvedValue({
        entities: [
          buildDummyPage({
            pageID: 'cached-search-page',
            parent: { type: 'database_id', database_id: 'cache-pop-db' },
          }),
        ],
      });

      const result = await dataSource.search();

      expect(result.pages).toHaveLength(1);
      expect(entityCache.pages.has('cached-search-page')).toBe(true);

      const cachedPage = await entityCache.pages.get('cached-search-page');
      expect(cachedPage).toBe(result.pages[0]);
    });

    it('should ignore offset when cursor is provided', async () => {
      const dataSource = new NotionDataSource(
        client,
        buildDummyDataSource({ id: 'cursor-offset-db' }),
      );

      const takeSpy = vi.spyOn(takeModule, 'take').mockResolvedValue({
        entities: [
          buildDummyPage({
            pageID: 'page0',
            parent: {
              type: 'database_id',
              database_id: 'cursor-offset-db',
            },
          }),
          buildDummyPage({
            pageID: 'page1',
            parent: {
              type: 'database_id',
              database_id: 'cursor-offset-db',
            },
          }),
        ],
        next: 'next',
      });

      const result = await dataSource.search({
        cursor: 'some-cursor',
        offset: 5,
        limit: 2,
      });

      expect(takeSpy).toHaveBeenCalledWith(
        client.dataSources.query,
        {
          data_source_id: 'cursor-offset-db',
          filter: undefined,
          sorts: undefined,
        },
        { limit: 2, cursor: 'some-cursor' },
      );
      expect(result.pages.length).toBe(2);
      expect(result.pages[0].id).toBe('page0');
    });
  });

  describe('gt:properties', () => {
    it('should return datasource properties', () => {
      const expected = {
        Status: {
          id: 'status-id',
          name: 'Status',
          type: 'select',
          description: null,
          select: {
            options: [
              { id: '1', name: 'To Do', color: 'red', description: null },
              { id: '2', name: 'Done', color: 'green', description: null },
            ],
          },
        },
        Priority: {
          id: 'priority-id',
          name: 'Priority',
          type: 'number',
          description: null,
          number: {
            format: 'number',
          },
        },
      } satisfies NotionAPIDataSource['properties'];

      const dataSource = new NotionDataSource(
        client,
        buildDummyDataSource({ properties: expected }),
      );

      const result = dataSource.properties;

      expect(result).toEqual(expected);
    });

    it('should return empty object when no properties', () => {
      const dataSource = new NotionDataSource(
        client,
        buildDummyDataSource({ properties: {} }),
      );

      const result = dataSource.properties;

      expect(result).toEqual({});
    });
  });

  describe('gt:archived', () => {
    it('should return false when datasource is not archived', () => {
      const result = dataSource.archived;

      expect(result).toBe(false);
    });
  });

  describe('gt:isInline', () => {
    it('should return false when datasource is not inline', () => {
      const result = dataSource.isInline;

      expect(result).toBe(false);
    });
  });

  describe('gt:description', () => {
    it('should return empty string when description is empty', () => {
      const result = dataSource.description;

      expect(result).toBe('');
    });
  });
});
