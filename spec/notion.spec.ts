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
