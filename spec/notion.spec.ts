import { APIErrorCode, APIResponseError, Client } from '@notionhq/client';
import { describe, expect, it, vi } from 'vitest';

import { NotionDatabase } from '#database';
import { NotionDataSource } from '#datasource';
import { Notion } from '#notion';
import { NotionPage } from '#page';
import { NotionUser } from '#user';

import { buildDummyDatabase } from './fixtures/factories/database';
import { buildDummyDataSource } from './fixtures/factories/datasource';
import { buildDummyPage } from './fixtures/factories/page';
import { buildUser } from './fixtures/factories/user';

import type { NotionAPIDataSource, NotionAPIPage } from '#types';

describe('cl:Notion', () => {
  const fetch = vi.fn<typeof globalThis.fetch>();
  const client = new Notion({
    // disable error logging by specifying an empty logger
    client: new Client({ fetch, logger: () => undefined }),
  });

  const searchResponse = (results: unknown[]) => ({
    type: 'page_or_data_source',
    page_or_data_source: {},
    object: 'list',
    results,
    next_cursor: null,
    has_more: false,
  });

  describe('op:getUser', () => {
    it('should return user instance when user exists', async () => {
      const userId = 'user-id';
      const userResponse = buildUser({ id: userId, name: 'Alice' });
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(userResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await client.getUser(userId);

      expect(result).toBeInstanceOf(NotionUser);
      expect(result.id).toBe(userId);
      expect(result.name).toBe('Alice');
    });

    it('should throw error when user is not accessible', async () => {
      const userId = 'bad-user';
      const errorResponse = {
        code: 'object_not_found',
        message: 'Not found',
        object: 'error',
        request_id: 'request-id',
        status: 404,
      };
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(errorResponse), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await expect(client.getUser(userId)).rejects.toThrow(
        'user bad-user is not accessible',
      );
    });

    it('should throw error when API request fails', async () => {
      const userId = 'auth-error-user';
      const errorResponse = {
        code: APIErrorCode.Unauthorized,
        message: 'API token is invalid.',
        object: 'error',
        request_id: 'request-id',
        status: 401,
      };
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(errorResponse), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await expect(client.getUser(userId)).rejects.toThrow(
        'user auth-error-user is not accessible',
      );
    });
  });

  describe('op:getDatabase', () => {
    it('should return database instance when database exists', async () => {
      const databaseId = 'database-id';
      const databaseResponse = buildDummyDatabase({ id: databaseId });
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(databaseResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await client.getDatabase(databaseId);

      expect(result).toBeInstanceOf(NotionDatabase);
      expect(result.id).toBe(databaseId);
      expect(result.title).toBe('Title');
    });

    it('should throw error when database is not accessible', async () => {
      const databaseId = 'database-id';
      const inaccessibleDatabase = {
        object: 'database',
        id: databaseId,
      };
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(inaccessibleDatabase), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await expect(client.getDatabase(databaseId)).rejects.toThrow(
        'database database-id is not accessible',
      );
    });

    it('should throw APIResponseError when API request fails', async () => {
      const databaseId = 'database-id';
      const errorResponse = {
        code: APIErrorCode.Unauthorized,
        message: 'API token is invalid.',
        object: 'error',
        request_id: 'request-id',
        status: 401,
      };
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(errorResponse), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await expect(client.getDatabase(databaseId)).rejects.toThrow(
        APIResponseError,
      );
    });
  });

  describe('op:getDataSource', () => {
    it('should return datasource instance when datasource exists', async () => {
      const dataSourceId = 'database-id';
      const dataSourceResponse = buildDummyDataSource({ id: dataSourceId });
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(dataSourceResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await client.getDataSource(dataSourceId);

      expect(result).toBeInstanceOf(NotionDataSource);
      expect(result.id).toBe(dataSourceId);
      expect(result.title).toBe('Title');
    });

    it('should throw error when datasource is not accessible', async () => {
      const dataSourceId = 'database-id';
      const inaccessibleDataSource = {
        ...buildDummyDataSource({ id: dataSourceId }),
        parent: undefined, // remove the parent object to simulate the error as if full datasource is not accessible
      };
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(inaccessibleDataSource), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await expect(client.getDataSource(dataSourceId)).rejects.toThrow(
        'datasource database-id is not accessible',
      );
    });

    it('should throw APIResponseError when API request fails', async () => {
      const dataSourceId = 'database-id';
      const errorResponse = {
        code: APIErrorCode.Unauthorized,
        message: 'API token is invalid.',
        object: 'error',
        request_id: 'request-id',
        status: 401,
      };
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(errorResponse), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await expect(client.getDataSource(dataSourceId)).rejects.toThrow(
        APIResponseError,
      );
    });
  });

  describe('op:getPage', () => {
    it('should return page instance when page exists', async () => {
      const pageId = 'page-id';
      const pageResponse = buildDummyPage({ pageID: pageId });
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(pageResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await client.getPage(pageId);

      expect(result).toBeInstanceOf(NotionPage);
      expect(result.id).toBe(pageId);
      expect(result.title).toBe('Title');
    });

    it('should throw error when page is not accessible', async () => {
      const pageId = 'page-id';
      const inaccessiblePage = {
        ...buildDummyPage({ pageID: pageId }),
        parent: undefined, // remove the parent object to simulate the error as if full datasource is not accessible
      };
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(inaccessiblePage), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await expect(client.getPage(pageId)).rejects.toThrow();
    });

    it('should throw error when API request fails', async () => {
      const pageId = 'page-id';
      const errorResponse = {
        code: APIErrorCode.Unauthorized,
        message: 'API token is invalid.',
        object: 'error',
        request_id: 'request-id',
        status: 401,
      };
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(errorResponse), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await expect(client.getPage(pageId)).rejects.toThrow();
    });
  });

  describe('op:searchPages', () => {
    it('should return page instances matching query', async () => {
      const pages = [
        buildDummyPage({ pageID: 'page-1' }),
        buildDummyPage({ pageID: 'page-2' }),
      ];
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(searchResponse(pages)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await client.searchPages({ query: 'test' });

      expect(result.pages).toHaveLength(2);
      expect(result.pages[0]).toBeInstanceOf(NotionPage);
      expect(result.pages[1]).toBeInstanceOf(NotionPage);
      expect(result.pages[0].id).toBe('page-1');
      expect(result.pages[1].id).toBe('page-2');
    });

    it('should filter out inaccessible pages', async () => {
      const accessible = buildDummyPage({ pageID: 'page-accessible' });
      const inaccessible: Pick<NotionAPIPage, 'id' | 'object'> = {
        object: 'page',
        id: 'page-inaccessible',
      };
      fetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify(searchResponse([accessible, inaccessible])),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

      const result = await client.searchPages({ query: 'test' });

      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].id).toBe('page-accessible');
    });

    it('should respect the limit option', async () => {
      const pages = [
        buildDummyPage({ pageID: 'page-1' }),
        buildDummyPage({ pageID: 'page-2' }),
      ];
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(searchResponse(pages)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await client.searchPages({ query: 'test', limit: 2 });

      expect(result.pages).toHaveLength(2);
    });

    it('should return empty array when no results', async () => {
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(searchResponse([])), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await client.searchPages({ query: 'test' });

      expect(result.pages).toEqual([]);
    });

    it('should throw APIResponseError on failure', async () => {
      const errorResponse = {
        code: APIErrorCode.Unauthorized,
        message: 'API token is invalid.',
        object: 'error',
        request_id: 'request-id',
        status: 401,
      };
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(errorResponse), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await expect(client.searchPages({ query: 'test' })).rejects.toThrow(
        APIResponseError,
      );
    });

    it('should return cursor from paginated results', async () => {
      const pages = [buildDummyPage({ pageID: 'page-1' })];
      const response = {
        ...searchResponse(pages),
        next_cursor: 'next-page-cursor',
        has_more: true,
      };
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(response), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await client.searchPages({ query: 'test', limit: 1 });

      expect(result.pages).toHaveLength(1);
      expect(result.cursor).toBe('next-page-cursor');
    });

    it('should emulate offset by over-fetching and slicing', async () => {
      const pages = [
        buildDummyPage({ pageID: 'page-0' }),
        buildDummyPage({ pageID: 'page-1' }),
        buildDummyPage({ pageID: 'page-2' }),
      ];
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(searchResponse(pages)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await client.searchPages({
        query: 'test',
        offset: 1,
        limit: 2,
      });

      expect(result.pages).toHaveLength(2);
      expect(result.pages[0].id).toBe('page-1');
      expect(result.pages[1].id).toBe('page-2');
    });

    it('should pass sort option to search', async () => {
      const pages = [buildDummyPage({ pageID: 'page-sorted' })];
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(searchResponse(pages)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await client.searchPages({
        query: 'test',
        sorts: [{ field: 'last_edited_time', order: 'desc' }],
      });

      expect(result.pages).toHaveLength(1);
    });

    it('should pass ascending sort option to search', async () => {
      const pages = [buildDummyPage({ pageID: 'page-asc' })];
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(searchResponse(pages)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await client.searchPages({
        query: 'test',
        sorts: [{ field: 'last_edited_time', order: 'asc' }],
      });

      expect(result.pages).toHaveLength(1);
    });

    it('should reset offset to zero and default query when cursor is provided', async () => {
      const pages = [buildDummyPage({ pageID: 'page-cursor' })];
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(searchResponse(pages)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await client.searchPages({
        cursor: 'some-cursor',
        offset: 5,
      });

      expect(result.pages).toHaveLength(1);
      expect(result.pages[0].id).toBe('page-cursor');
    });
  });

  describe('op:searchDataSources', () => {
    it('should return datasource instances matching query', async () => {
      const dataSources = [
        buildDummyDataSource({ id: 'ds-1' }),
        buildDummyDataSource({ id: 'ds-2' }),
      ];
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(searchResponse(dataSources)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await client.searchDataSources({ query: 'test' });

      expect(result.dataSources).toHaveLength(2);
      expect(result.dataSources[0]).toBeInstanceOf(NotionDataSource);
      expect(result.dataSources[1]).toBeInstanceOf(NotionDataSource);
      expect(result.dataSources[0].id).toBe('ds-1');
      expect(result.dataSources[1].id).toBe('ds-2');
    });

    it('should filter out inaccessible datasources', async () => {
      const accessible = buildDummyDataSource({ id: 'ds-accessible' });
      const inaccessible: Pick<NotionAPIDataSource, 'id' | 'object'> = {
        object: 'data_source',
        id: 'ds-inaccessible',
      };
      fetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify(searchResponse([accessible, inaccessible])),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

      const result = await client.searchDataSources({ query: 'test' });

      expect(result.dataSources).toHaveLength(1);
      expect(result.dataSources[0].id).toBe('ds-accessible');
    });

    it('should respect the limit option', async () => {
      const dataSources = [
        buildDummyDataSource({ id: 'ds-1' }),
        buildDummyDataSource({ id: 'ds-2' }),
      ];
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(searchResponse(dataSources)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await client.searchDataSources({
        query: 'test',
        limit: 2,
      });

      expect(result.dataSources).toHaveLength(2);
    });

    it('should return empty array when no results', async () => {
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(searchResponse([])), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await client.searchDataSources({ query: 'test' });

      expect(result.dataSources).toEqual([]);
    });

    it('should throw APIResponseError on failure', async () => {
      const errorResponse = {
        code: APIErrorCode.Unauthorized,
        message: 'API token is invalid.',
        object: 'error',
        request_id: 'request-id',
        status: 401,
      };
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(errorResponse), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await expect(client.searchDataSources({ query: 'test' })).rejects.toThrow(
        APIResponseError,
      );
    });

    it('should return cursor from paginated results', async () => {
      const dataSources = [buildDummyDataSource({ id: 'ds-1' })];
      const response = {
        ...searchResponse(dataSources),
        next_cursor: 'next-ds-cursor',
        has_more: true,
      };
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(response), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await client.searchDataSources({
        query: 'test',
        limit: 1,
      });

      expect(result.dataSources).toHaveLength(1);
      expect(result.cursor).toBe('next-ds-cursor');
    });

    it('should emulate offset by over-fetching and slicing', async () => {
      const dataSources = [
        buildDummyDataSource({ id: 'ds-0' }),
        buildDummyDataSource({ id: 'ds-1' }),
        buildDummyDataSource({ id: 'ds-2' }),
      ];
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(searchResponse(dataSources)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await client.searchDataSources({
        query: 'test',
        offset: 1,
        limit: 2,
      });

      expect(result.dataSources).toHaveLength(2);
      expect(result.dataSources[0].id).toBe('ds-1');
      expect(result.dataSources[1].id).toBe('ds-2');
    });

    it('should pass sort option to search', async () => {
      const dataSources = [buildDummyDataSource({ id: 'ds-sorted' })];
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(searchResponse(dataSources)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await client.searchDataSources({
        query: 'test',
        sorts: [{ field: 'last_edited_time', order: 'asc' }],
      });

      expect(result.dataSources).toHaveLength(1);
    });

    it('should reset offset to zero and default query when cursor is provided', async () => {
      const dataSources = [buildDummyDataSource({ id: 'ds-cursor' })];
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(searchResponse(dataSources)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await client.searchDataSources({
        cursor: 'some-cursor',
        offset: 5,
      });

      expect(result.dataSources).toHaveLength(1);
      expect(result.dataSources[0].id).toBe('ds-cursor');
    });
  });

  describe('entity caching', () => {
    it('should return cached page on second getPage call when cache is enabled globally', async () => {
      const pageResponse = buildDummyPage({ pageID: 'cached-page' });
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(pageResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      const cachedClient = new Notion({
        client: new Client({ fetch, logger: () => undefined }),
        cache: true,
      });

      const first = await cachedClient.getPage('cached-page');
      const second = await cachedClient.getPage('cached-page');

      expect(first).toBe(second);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should return cached database on second getDatabase call when cache is enabled globally', async () => {
      const dbResponse = buildDummyDatabase({ id: 'cached-db' });
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(dbResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      const cachedClient = new Notion({
        client: new Client({ fetch, logger: () => undefined }),
        cache: true,
      });

      const first = await cachedClient.getDatabase('cached-db');
      const second = await cachedClient.getDatabase('cached-db');

      expect(first).toBe(second);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should return cached datasource on second getDataSource call when cache is enabled globally', async () => {
      const dsResponse = buildDummyDataSource({ id: 'cached-ds' });
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(dsResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      const cachedClient = new Notion({
        client: new Client({ fetch, logger: () => undefined }),
        cache: true,
      });

      const first = await cachedClient.getDataSource('cached-ds');
      const second = await cachedClient.getDataSource('cached-ds');

      expect(first).toBe(second);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should cache per-call when cache option overrides default off', async () => {
      const pageResponse = buildDummyPage({ pageID: 'per-call-page' });
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(pageResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      const uncachedClient = new Notion({
        client: new Client({ fetch, logger: () => undefined }),
      });

      const first = await uncachedClient.getPage('per-call-page', {
        cache: true,
      });
      const second = await uncachedClient.getPage('per-call-page', {
        cache: true,
      });

      expect(first).toBe(second);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should bypass cache per-call when cache option overrides global on', async () => {
      const pageResponse = buildDummyPage({ pageID: 'bypass-page' });
      fetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify(pageResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(pageResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      const cachedClient = new Notion({
        client: new Client({ fetch, logger: () => undefined }),
        cache: true,
      });

      await cachedClient.getPage('bypass-page');
      await cachedClient.getPage('bypass-page', { cache: false });

      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should evict failed page from cache on rejection', async () => {
      const errorResponse = {
        code: 'object_not_found',
        message: 'Not found',
        object: 'error',
        request_id: 'request-id',
        status: 404,
      };
      const pageResponse = buildDummyPage({ pageID: 'evict-page' });
      fetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify(errorResponse), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(pageResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      const cachedClient = new Notion({
        client: new Client({ fetch, logger: () => undefined }),
        cache: true,
      });

      await expect(cachedClient.getPage('evict-page')).rejects.toThrow();

      const result = await cachedClient.getPage('evict-page');

      expect(result).toBeInstanceOf(NotionPage);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should disable user resolution cache when cache is explicitly false', async () => {
      const userResponse = buildUser({ id: 'user-1', name: 'Alice' });
      const pageResponse = {
        ...buildDummyPage({ pageID: 'no-user-cache-page' }),
        created_by: { object: 'user' as const, id: 'user-1' },
      };
      fetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify(pageResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(userResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(pageResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(userResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      const noCacheClient = new Notion({
        client: new Client({ fetch, logger: () => undefined }),
        cache: false,
      });

      await noCacheClient.getPage('no-user-cache-page');
      await noCacheClient.getPage('no-user-cache-page');

      // 2 page fetches + 2 user resolves (user cache disabled, no dedup)
      expect(fetch).toHaveBeenCalledTimes(4);
    });

    it('should populate page cache from searchPages results', async () => {
      const pages = [buildDummyPage({ pageID: 'search-cached-page' })];
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(searchResponse(pages)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      const cachedClient = new Notion({
        client: new Client({ fetch, logger: () => undefined }),
        cache: true,
      });

      const { pages: searchResults } = await cachedClient.searchPages({
        query: 'test',
      });
      const direct = await cachedClient.getPage('search-cached-page');

      expect(direct).toBe(searchResults[0]);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should populate datasource cache from searchDataSources results', async () => {
      const dataSources = [buildDummyDataSource({ id: 'search-cached-ds' })];
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(searchResponse(dataSources)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      const cachedClient = new Notion({
        client: new Client({ fetch, logger: () => undefined }),
        cache: true,
      });

      const { dataSources: searchResults } =
        await cachedClient.searchDataSources({ query: 'test' });
      const direct = await cachedClient.getDataSource('search-cached-ds');

      expect(direct).toBe(searchResults[0]);
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('concurrency option', () => {
    it('should reject invalid global concurrency in constructor', () => {
      expect(
        () =>
          new Notion({
            client: new Client({ fetch, logger: () => undefined }),
            concurrency: 0,
          }),
      ).toThrow('concurrency must be a positive integer');
    });

    it('should reject non-integer global concurrency in constructor', () => {
      expect(
        () =>
          new Notion({
            client: new Client({ fetch, logger: () => undefined }),
            concurrency: 1.5,
          }),
      ).toThrow('concurrency must be a positive integer');
    });

    it('should accept valid global concurrency in constructor', () => {
      expect(
        () =>
          new Notion({
            client: new Client({ fetch, logger: () => undefined }),
            concurrency: 5,
          }),
      ).not.toThrow();
    });
  });
});
