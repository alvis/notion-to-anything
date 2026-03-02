import { APIErrorCode } from '@notionhq/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotionDatabase } from '#database';
import { NotionDataSource } from '#datasource';
import { NotionAnythingError, NotionAPIError } from '#errors';
import { Notion } from '#notion';
import { NotionPage } from '#page';
import { RequestMetrics } from '#request';
import { NotionUser } from '#user';

import { buildDummyDatabase } from './fixtures/factories/database';
import { buildDummyDataSource } from './fixtures/factories/datasource';
import { buildDummyPage } from './fixtures/factories/page';
import { buildUser } from './fixtures/factories/user';

import type { NotionAPIDataSource, NotionAPIPage } from '#types';

/**
 * builds a fresh fetch mock + Notion client pair for a single test
 * isolates the response queue per test so leftover `mockResolvedValueOnce`
 * entries from one case cannot bleed into the next
 * @returns the fresh mock and the Notion client wired to it
 */
function buildFixture(): {
  fetch: ReturnType<typeof vi.fn<typeof globalThis.fetch>>;
  client: Notion;
} {
  const fetch = vi.fn<typeof globalThis.fetch>();
  const client = new Notion({
    token: 'secret_test_token',
    fetch,
    // disable error logging by specifying an empty logger
    logger: () => undefined,
  });

  return { fetch, client };
}

describe('cl:Notion', () => {
  // NOTE: per-test fixtures via beforeEach — every `it` gets its own fresh
  // `fetch` mock + `client`, so `mockResolvedValueOnce` queues cannot leak
  // across cases. The `let` is a test-fixture mutable, not production state.
  let fetch: ReturnType<typeof vi.fn<typeof globalThis.fetch>>;
  let client: Notion;

  beforeEach(() => {
    ({ fetch, client } = buildFixture());
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

      const error = await client
        .getUser(userId)
        .catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(NotionAnythingError);
      expect(error).toMatchObject({
        code: 'ENTITY_NOT_ACCESSIBLE',
        message: 'user bad-user is not accessible',
      });
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
      // string token => no refresh; both attempts return 401 and the second
      // 401 response surfaces to the SDK which treats it as inaccessible
      fetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify(errorResponse), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(errorResponse), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
        );

      const error = await client
        .getUser(userId)
        .catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(NotionAnythingError);
      expect(error).toMatchObject({
        code: 'ENTITY_NOT_ACCESSIBLE',
        message: 'user auth-error-user is not accessible',
      });
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

      const error = await client
        .getDatabase(databaseId)
        .catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(NotionAnythingError);
      expect(error).toMatchObject({
        code: 'ENTITY_NOT_ACCESSIBLE',
        message: 'database database-id is not accessible',
      });
    });

    it('should throw NotionAPIError when API request fails', async () => {
      const databaseId = 'database-id';
      const errorResponse = {
        code: APIErrorCode.Unauthorized,
        message: 'API token is invalid.',
        object: 'error',
        request_id: 'request-id',
        status: 401,
      };
      // 401 retried once; both attempts return 401 and the second surfaces
      fetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify(errorResponse), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(errorResponse), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
        );

      const error = await client
        .getDatabase(databaseId)
        .catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(NotionAPIError);
      expect(error).toMatchObject({
        code: APIErrorCode.Unauthorized,
        status: 401,
      });
      expect(error instanceof NotionAPIError && error.cause).toBeDefined();
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
      // drop the parent field to simulate the partial response the SDK returns
      // for an inaccessible datasource
      const { parent: _parent, ...inaccessibleDataSource } =
        buildDummyDataSource({ id: dataSourceId });
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(inaccessibleDataSource), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const error = await client
        .getDataSource(dataSourceId)
        .catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(NotionAnythingError);
      expect(error).toMatchObject({
        code: 'ENTITY_NOT_ACCESSIBLE',
        message: 'datasource database-id is not accessible',
      });
    });

    it('should throw NotionAPIError when API request fails', async () => {
      const dataSourceId = 'database-id';
      const errorResponse = {
        code: APIErrorCode.Unauthorized,
        message: 'API token is invalid.',
        object: 'error',
        request_id: 'request-id',
        status: 401,
      };
      fetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify(errorResponse), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(errorResponse), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
        );

      const error = await client
        .getDataSource(dataSourceId)
        .catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(NotionAPIError);
      expect(error).toMatchObject({
        code: APIErrorCode.Unauthorized,
        status: 401,
      });
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
      // drop the parent field to simulate the partial response the SDK returns
      // for an inaccessible page
      const { parent: _parent, ...inaccessiblePage } = buildDummyPage({
        pageID: pageId,
      });
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(inaccessiblePage), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const error = await client
        .getPage(pageId)
        .catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(NotionAnythingError);
      expect(error).toMatchObject({
        code: 'ENTITY_NOT_ACCESSIBLE',
        message: 'page page-id is not accessible',
      });
    });

    it('should throw NotionAPIError when API request fails', async () => {
      const pageId = 'page-id';
      const errorResponse = {
        code: APIErrorCode.Unauthorized,
        message: 'API token is invalid.',
        object: 'error',
        request_id: 'request-id',
        status: 401,
      };
      fetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify(errorResponse), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(errorResponse), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
        );

      const error = await client
        .getPage(pageId)
        .catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(NotionAPIError);
      expect(error).toMatchObject({
        code: APIErrorCode.Unauthorized,
        status: 401,
      });
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

    it('should throw NotionAPIError on failure', async () => {
      const errorResponse = {
        code: APIErrorCode.Unauthorized,
        message: 'API token is invalid.',
        object: 'error',
        request_id: 'request-id',
        status: 401,
      };
      fetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify(errorResponse), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(errorResponse), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
        );

      const error = await client
        .searchPages({ query: 'test' })
        .catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(NotionAPIError);
      expect(error).toMatchObject({
        code: APIErrorCode.Unauthorized,
        status: 401,
      });
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

    it('should throw NotionAPIError on failure', async () => {
      const errorResponse = {
        code: APIErrorCode.Unauthorized,
        message: 'API token is invalid.',
        object: 'error',
        request_id: 'request-id',
        status: 401,
      };
      fetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify(errorResponse), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(errorResponse), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }),
        );

      const error = await client
        .searchDataSources({ query: 'test' })
        .catch((reason: unknown) => reason);

      expect(error).toBeInstanceOf(NotionAPIError);
      expect(error).toMatchObject({
        code: APIErrorCode.Unauthorized,
        status: 401,
      });
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
        token: 'secret_test',
        fetch,
        logger: () => undefined,
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
        token: 'secret_test',
        fetch,
        logger: () => undefined,
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
        token: 'secret_test',
        fetch,
        logger: () => undefined,
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
        token: 'secret_test',
        fetch,
        logger: () => undefined,
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
        token: 'secret_test',
        fetch,
        logger: () => undefined,
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
        token: 'secret_test',
        fetch,
        logger: () => undefined,
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
        token: 'secret_test',
        fetch,
        logger: () => undefined,
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
        token: 'secret_test',
        fetch,
        logger: () => undefined,
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
        token: 'secret_test',
        fetch,
        logger: () => undefined,
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
            token: 'secret_test',
            fetch,
            logger: () => undefined,
            concurrency: 0,
          }),
      ).toThrow('concurrency must be a positive integer');
    });

    it('should reject non-integer global concurrency in constructor', () => {
      expect(
        () =>
          new Notion({
            token: 'secret_test',
            fetch,
            logger: () => undefined,
            concurrency: 1.5,
          }),
      ).toThrow('concurrency must be a positive integer');
    });

    it('should accept valid global concurrency in constructor', () => {
      expect(
        () =>
          new Notion({
            token: 'secret_test',
            fetch,
            logger: () => undefined,
            concurrency: 5,
          }),
      ).not.toThrow();
    });

    it('should limit standalone client requests to the configured concurrency', async () => {
      let active = 0;
      let maxActive = 0;
      const fetchMock = vi.fn<typeof globalThis.fetch>(
        async (_input) =>
          new Promise<Response>((resolve) => {
            active++;
            maxActive = Math.max(maxActive, active);
            setTimeout(() => {
              active--;
              resolve(
                new Response(
                  JSON.stringify(
                    buildUser({
                      id: typeof _input === 'string' ? _input : 'unknown',
                    }),
                  ),
                  {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                  },
                ),
              );
            }, 10);
          }),
      );

      const standalone = new Notion({
        token: 'secret_test',
        fetch: fetchMock,
        concurrency: 1,
      });

      await Promise.all([
        standalone.getUser('user-a'),
        standalone.getUser('user-b'),
      ]);

      expect(maxActive).toBe(1);
    });
  });

  describe('public api', () => {
    it('should expose the underlying SDK client through the `client` getter', () => {
      const exposed = client.client;

      expect(exposed).toBeDefined();
      expect(typeof exposed.users.retrieve).toBe('function');
    });

    it('should expose the live single RequestMetrics instance through the `metrics` getter', async () => {
      const fetchMock = vi.fn<typeof globalThis.fetch>(
        async () =>
          new Response(JSON.stringify(buildUser({ id: 'metrics-getter' })), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
      );

      const standalone = new Notion({
        token: 'secret_test',
        fetch: fetchMock,
        logger: () => undefined,
      });

      const exposed = standalone.metrics;

      // the getter returns a genuine RequestMetrics instance
      expect(exposed).toBeInstanceOf(RequestMetrics);

      // the getter returns the same single instance on every read (identity)
      expect(standalone.metrics).toBe(exposed);

      // a recorded request is reflected through the live instance
      const before = exposed.snapshot().requests;

      await standalone.getUser('metrics-getter');

      expect(exposed.snapshot().requests).toBe(before + 1);
      // the same instance observed before and after the request
      expect(standalone.metrics).toBe(exposed);

      // the accessor is read-only: assigning to it must throw in strict mode
      expect(() => {
        (standalone as unknown as { metrics: RequestMetrics }).metrics =
          new RequestMetrics();
      }).toThrow(TypeError);

      // and the live instance is unchanged after the rejected assignment
      expect(standalone.metrics).toBe(exposed);
    });

    it('should accept a string token literal', async () => {
      const fetchMock = vi.fn<typeof globalThis.fetch>(
        async () =>
          new Response(JSON.stringify(buildUser({ id: 'string-token' })), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
      );

      const stringTokenClient = new Notion({
        token: 'secret_literal',
        fetch: fetchMock,
        logger: () => undefined,
      });

      const user = await stringTokenClient.getUser('string-token');

      expect(user.id).toBe('string-token');
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const headers = new Headers(fetchMock.mock.calls[0][1]!.headers);

      expect(headers.get('Authorization')).toBe('Bearer secret_literal');
    });

    it('should accept an async token provider', async () => {
      const provider = vi.fn<(init: boolean) => Promise<string>>(
        async () => 'secret_dynamic',
      );
      const fetchMock = vi.fn<typeof globalThis.fetch>(
        async () =>
          new Response(JSON.stringify(buildUser({ id: 'provider-token' })), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
      );

      const providerClient = new Notion({
        token: provider,
        fetch: fetchMock,
        logger: () => undefined,
      });

      const user = await providerClient.getUser('provider-token');

      expect(user.id).toBe('provider-token');
      expect(provider).toHaveBeenCalledTimes(1);
      expect(provider).toHaveBeenCalledWith(true);

      const headers = new Headers(fetchMock.mock.calls[0][1]!.headers);

      expect(headers.get('Authorization')).toBe('Bearer secret_dynamic');
    });

    it('should increment metrics.requests when requesting through anything.client', async () => {
      const fetchMock = vi.fn<typeof globalThis.fetch>(
        async () =>
          new Response(JSON.stringify(buildUser({ id: 'client-user' })), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
      );

      const standalone = new Notion({
        token: 'secret_test',
        fetch: fetchMock,
        logger: () => undefined,
      });

      const before = standalone.metrics.snapshot().requests;

      await standalone.client.users.retrieve({ user_id: 'client-user' });

      expect(standalone.metrics.snapshot().requests).toBe(before + 1);
    });
  });

  describe('metrics + hooks', () => {
    it('should increment metrics.requests on a 200 response', async () => {
      const userId = 'metrics-user';
      const fetchMock = vi.fn<typeof globalThis.fetch>(
        async () =>
          new Response(
            JSON.stringify(buildUser({ id: userId, name: 'Alice' })),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          ),
      );

      const standalone = new Notion({
        token: 'secret_test',
        fetch: fetchMock,
        logger: () => undefined,
      });
      const before = standalone.metrics.snapshot().requests;

      await standalone.getUser(userId);

      expect(standalone.metrics.snapshot().requests).toBe(before + 1);
    });

    it('should invoke onRequestStart and onRequestEnd on a 200 response', async () => {
      const fetchMock = vi.fn<typeof globalThis.fetch>(
        async () =>
          new Response(JSON.stringify(buildUser({ id: 'u' })), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
      );

      const onRequestStart = vi.fn();
      const onRequestEnd = vi.fn();

      const standalone = new Notion({
        token: 'secret_test',
        fetch: fetchMock,
        logger: () => undefined,
        hooks: { onRequestStart, onRequestEnd },
      });
      await standalone.getUser('u');

      expect(onRequestStart).toHaveBeenCalledTimes(1);
      expect(onRequestEnd).toHaveBeenCalledTimes(1);
      expect(onRequestEnd.mock.calls[0][0]).toMatchObject({
        method: expect.any(String),
        url: expect.any(String),
        status: 200,
        durationMs: expect.any(Number),
      });
    });

    it('should retry on 429 and fire pause + resume hooks exactly once each', async () => {
      vi.useFakeTimers();

      const onRateLimitPause = vi.fn();
      const onRateLimitResume = vi.fn();

      const fetchMock = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ code: 'rate_limited', request_id: 'rid-1' }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'retry-after': '3',
              },
            },
          ),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(buildUser({ id: 'u' })), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );

      try {
        const standalone = new Notion({
          token: 'secret_test',
          fetch: fetchMock,
          logger: () => undefined,
          hooks: { onRateLimitPause, onRateLimitResume },
        });

        const promise = standalone.getUser('u');
        // run the first fetch and trigger pause
        await vi.advanceTimersByTimeAsync(0);
        // header says 3s + 5s buffer = 8000 ms
        await vi.advanceTimersByTimeAsync(8000);
        const result = await promise;

        expect(result.id).toBe('u');
        expect(onRateLimitPause).toHaveBeenCalledTimes(1);
        expect(onRateLimitPause.mock.calls[0][0]).toMatchObject({
          delayMs: 8000,
          source: 'retry_after_header',
        });
        expect(onRateLimitResume).toHaveBeenCalledTimes(1);
        expect(onRateLimitResume.mock.calls[0][0]).toMatchObject({
          delayMs: 8000,
        });
        expect(fetchMock).toHaveBeenCalledTimes(2);
      } finally {
        vi.useRealTimers();
      }
    });

    it('should keep the 429 retry loop working without hooks', async () => {
      vi.useFakeTimers();

      const fetchMock = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ code: 'rate_limited' }), {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'retry-after': '1',
            },
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(buildUser({ id: 'u' })), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );

      try {
        const standalone = new Notion({
          token: 'secret_test',
          fetch: fetchMock,
          logger: () => undefined,
        });
        const promise = standalone.getUser('u');
        await vi.advanceTimersByTimeAsync(0);
        await vi.advanceTimersByTimeAsync(6000);
        await expect(promise).resolves.toMatchObject({ id: 'u' });
        expect(fetchMock).toHaveBeenCalledTimes(2);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
