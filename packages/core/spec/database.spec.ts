import { Client } from '@notionhq/client';
import { describe, expect, it, vi } from 'vitest';

import { NotionDatabase } from '#entities/database';
import { NotionDataSource } from '#entities/datasource';
import { defaultEntityFactory } from '#entities/entity-factory';
import { UserResolver } from '#entities/user';

import { defaultTime } from '../../../fixtures/common';
import { buildDummyDatabase } from '../../../fixtures/factories/database';
import { buildDummyDataSource } from '../../../fixtures/factories/datasource';
import { createPlainText } from '../../../fixtures/factories/richtext';

import type { EntityCache } from '#entities/entity';

describe('cl:NotionDatabase', () => {
  describe('mt:getMetadata', () => {
    it('should include all metadata of the database', () => {
      const client = new Client({ fetch });
      const database = new NotionDatabase(client, buildDummyDatabase());

      const expected = {
        coverImage: 'https://www.notion.so/cover.png',
        createdByAvatar: null,
        createdByEmail: null,
        createdByName: null,
        createdAt: defaultTime,
        iconEmoji: '📚',
        iconImage: null,
        id: 'database-id',
        lastEditedByAvatar: null,
        lastEditedByEmail: null,
        lastEditedByName: null,
        lastEditedAt: defaultTime,
        title: 'Title',
        url: 'https://www.notion.so/workspace/database-id',
        publicUrl: null,
        inTrash: false,
      };

      const result = database.getMetadata();

      expect(result).toEqual(expected);
    });
  });

  describe('gt:isInline', () => {
    it('should return false when database is not inline', () => {
      const client = new Client({ fetch });
      const database = new NotionDatabase(client, buildDummyDatabase());
      const result = database.isInline;

      expect(result).toBe(false);
    });

    it('should return true when database is inline', () => {
      const client = new Client({ fetch });
      const inlineDb = new NotionDatabase(
        client,
        buildDummyDatabase({ isInline: true }),
      );

      const result = inlineDb.isInline;

      expect(result).toBe(true);
    });
  });

  describe('gt:isLocked', () => {
    it('should return false when database is not locked', () => {
      const client = new Client({ fetch });
      const database = new NotionDatabase(client, buildDummyDatabase());
      const result = database.isLocked;

      expect(result).toBe(false);
    });

    it('should return true when database is locked', () => {
      const client = new Client({ fetch });
      const lockedDb = new NotionDatabase(
        client,
        buildDummyDatabase({ isLocked: true }),
      );

      const result = lockedDb.isLocked;

      expect(result).toBe(true);
    });
  });

  describe('gt:description', () => {
    it('should return empty string when description is empty', () => {
      const client = new Client({ fetch });
      const database = new NotionDatabase(client, buildDummyDatabase());
      const result = database.description;

      expect(result).toBe('');
    });

    it('should return description text from rich text array', () => {
      const client = new Client({ fetch });
      const db = new NotionDatabase(
        client,
        buildDummyDatabase({
          description: [createPlainText('A test database')],
        }),
      );

      const result = db.description;

      expect(result).toBe('A test database');
    });
  });

  describe('op:getDataSources', () => {
    it('should retrieve all accessible datasources', async () => {
      const fetch = vi.fn<typeof globalThis.fetch>();
      const testClient = new Client({
        fetch,
        logger: () => undefined,
      });

      const ds = buildDummyDataSource({ id: 'ds-1' });
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(ds), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const db = new NotionDatabase(
        testClient,
        buildDummyDatabase({
          dataSources: [{ id: 'ds-1', name: 'Default' }],
        }),
        { entityFactory: defaultEntityFactory },
      );

      const result = await db.getDataSources();

      expect(result).toEqual([expect.objectContaining({ id: 'ds-1' })]);
    });

    it('should filter out inaccessible datasources', async () => {
      const fetch = vi.fn<typeof globalThis.fetch>();
      const testClient = new Client({
        fetch,
        logger: () => undefined,
      });

      const inaccessible = {
        object: 'data_source',
        id: 'ds-2',
        properties: {},
      };
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(inaccessible), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const db = new NotionDatabase(
        testClient,
        buildDummyDatabase({
          dataSources: [{ id: 'ds-2', name: 'Inaccessible' }],
        }),
        { entityFactory: defaultEntityFactory },
      );

      const result = await db.getDataSources();

      expect(result).toEqual([]);
    });

    it('should return empty array when no datasources', async () => {
      const testClient = new Client({
        fetch,
        logger: () => undefined,
      });
      const db = new NotionDatabase(
        testClient,
        buildDummyDatabase({ dataSources: [] }),
        { entityFactory: defaultEntityFactory },
      );

      const result = await db.getDataSources();

      expect(result).toEqual([]);
    });

    it('should enrich datasource users when resolver is provided', async () => {
      const fetch = vi.fn<typeof globalThis.fetch>();
      const testClient = new Client({
        fetch,
        logger: () => undefined,
      });
      const resolver = new UserResolver(testClient);

      const ds = buildDummyDataSource({ id: 'ds-enriched' });
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(ds), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const db = new NotionDatabase(
        testClient,
        buildDummyDatabase({
          dataSources: [{ id: 'ds-enriched', name: 'Enriched' }],
        }),
        { userResolver: resolver, entityFactory: defaultEntityFactory },
      );

      const result = await db.getDataSources();

      expect(result).toEqual([expect.objectContaining({ id: 'ds-enriched' })]);
    });

    it('should return cached datasource without API call', async () => {
      const fetch = vi.fn<typeof globalThis.fetch>();
      const testClient = new Client({
        fetch,
        logger: () => undefined,
      });

      const ds = buildDummyDataSource({ id: 'ds-cached' });

      const entityCache: EntityCache = {
        pages: new Map(),
        databases: new Map(),
        dataSources: new Map(),
      };

      // pre-populate cache
      const cachedDs = new NotionDataSource(testClient, ds);
      entityCache.dataSources.set('ds-cached', Promise.resolve(cachedDs));

      const db = new NotionDatabase(
        testClient,
        buildDummyDatabase({
          dataSources: [{ id: 'ds-cached', name: 'Cached' }],
        }),
        { entityFactory: defaultEntityFactory, cache: entityCache },
      );

      const result = await db.getDataSources();

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(cachedDs);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should populate cache after retrieving datasources', async () => {
      const fetch = vi.fn<typeof globalThis.fetch>();
      const testClient = new Client({
        fetch,
        logger: () => undefined,
      });

      const ds = buildDummyDataSource({ id: 'ds-pop' });
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(ds), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const entityCache: EntityCache = {
        pages: new Map(),
        databases: new Map(),
        dataSources: new Map(),
      };

      const db = new NotionDatabase(
        testClient,
        buildDummyDatabase({
          dataSources: [{ id: 'ds-pop', name: 'Pop' }],
        }),
        { entityFactory: defaultEntityFactory, cache: entityCache },
      );

      const result = await db.getDataSources();

      expect(entityCache.dataSources.has('ds-pop')).toBe(true);

      const cached = await entityCache.dataSources.get('ds-pop');
      expect(cached).toBe(result[0]);
    });
  });
});
