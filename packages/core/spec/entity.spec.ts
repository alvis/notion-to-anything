import { Client } from '@notionhq/client';
import { describe, expect, it, vi } from 'vitest';

import { NotionEntity } from '#entities/entity';
import { defaultEntityFactory } from '#entities/entity-factory';
import { UserResolver } from '#entities/user';

import { defaultTime } from '../../../fixtures/common';
import { buildDummyDatabase } from '../../../fixtures/factories/database';
import { buildDummyDataSource } from '../../../fixtures/factories/datasource';
import { buildDummyPage } from '../../../fixtures/factories/page';

import type { EntityCache } from '#entities/entity';
import type { NotionAPIPage, NotionMetadata } from '#types/index';

const defaultMetadata = {
  id: 'test-id',
  title: 'Title',
  url: 'https://www.notion.so/workspace/test-id',
  publicUrl: null,
  inTrash: false,
  createdByAvatar: 'url',
  createdByEmail: 'email',
  createdByName: 'Name',
  createdAt: defaultTime,
  lastEditedByAvatar: 'url',
  lastEditedByEmail: 'email',
  lastEditedByName: 'Name',
  lastEditedAt: defaultTime,
  coverImage: 'https://www.notion.so/cover.png',
  iconEmoji: '📚',
  iconImage: null,
} satisfies NotionMetadata;

const client = new Client({ fetch });
const page = buildDummyPage({ pageID: 'test-id' });
const dataSource = buildDummyDataSource({ id: 'db-test-id' });
const database = buildDummyDatabase({ id: 'db-test-id' });

const getMetadata = vi.hoisted(() =>
  vi.fn<() => NotionMetadata>(() => defaultMetadata),
);
vi.mock(
  '#entities/metadata',
  () => ({ getMetadata }) satisfies Partial<typeof import('#entities/metadata')>,
);

describe('cl:NotionEntity', () => {
  describe('constructor with NotionAPIPage', () => {
    it('should initialize all properties from metadata when constructed with a page', () => {
      const result = new NotionEntity(client, page);

      expect(result).toEqual(
        expect.objectContaining({
          id: page.id,
          title: defaultMetadata.title,
          url: defaultMetadata.url,
          publicUrl: defaultMetadata.publicUrl,
          inTrash: defaultMetadata.inTrash,
          createdByAvatar: defaultMetadata.createdByAvatar,
          createdByEmail: defaultMetadata.createdByEmail,
          createdByName: defaultMetadata.createdByName,
          createdAt: defaultMetadata.createdAt,
          lastEditedByAvatar: defaultMetadata.lastEditedByAvatar,
          lastEditedByEmail: defaultMetadata.lastEditedByEmail,
          lastEditedByName: defaultMetadata.lastEditedByName,
          lastEditedAt: defaultMetadata.lastEditedAt,
          coverImage: defaultMetadata.coverImage,
          iconEmoji: defaultMetadata.iconEmoji,
          iconImage: defaultMetadata.iconImage,
        }),
      );
    });

    it('should handle null values in metadata correctly', () => {
      const metadataWithNulls = {
        ...defaultMetadata,
        createdByAvatar: null,
        createdByEmail: null,
        createdByName: null,
        lastEditedByAvatar: null,
        lastEditedByEmail: null,
        lastEditedByName: null,
        coverImage: null,
        iconEmoji: null,
        iconImage: null,
      } satisfies NotionMetadata;

      getMetadata.mockReturnValueOnce(metadataWithNulls);

      const result = new NotionEntity(client, page);

      expect(result).toEqual(
        expect.objectContaining({
          createdByAvatar: null,
          createdByEmail: null,
          createdByName: null,
          lastEditedByAvatar: null,
          lastEditedByEmail: null,
          lastEditedByName: null,
          coverImage: null,
          iconEmoji: null,
          iconImage: null,
        }),
      );
    });
  });

  describe('constructor with NotionAPIDataSource', () => {
    it('should initialize all properties from metadata when constructed with a datasource', () => {
      const result = new NotionEntity(client, dataSource);

      expect(result).toEqual(
        expect.objectContaining({
          id: dataSource.id,
          title: defaultMetadata.title,
          url: defaultMetadata.url,
        }),
      );
    });

    it('should handle datasource with icon image instead of emoji', () => {
      const metadataWithIconImage = {
        ...defaultMetadata,
        iconEmoji: null,
        iconImage: 'https://icon.url/icon.png',
      } satisfies NotionMetadata;

      getMetadata.mockReturnValueOnce(metadataWithIconImage);

      const result = new NotionEntity(client, dataSource);

      expect(result).toEqual(
        expect.objectContaining({
          iconEmoji: null,
          iconImage: 'https://icon.url/icon.png',
        }),
      );
    });
  });

  describe('constructor with NotionAPIDatabase', () => {
    it('should initialize all properties from metadata when constructed with a database', () => {
      const dbMetadata = {
        ...defaultMetadata,
        createdByAvatar: null,
        createdByEmail: null,
        createdByName: null,
        lastEditedByAvatar: null,
        lastEditedByEmail: null,
        lastEditedByName: null,
      } satisfies NotionMetadata;

      getMetadata.mockReturnValueOnce(dbMetadata);

      const result = new NotionEntity(client, database);

      expect(result).toEqual(
        expect.objectContaining({
          id: database.id,
          createdByAvatar: null,
          createdByName: null,
          lastEditedByAvatar: null,
          lastEditedByName: null,
        }),
      );
    });
  });

  describe('mt:getMetadata', () => {
    it('should return the stored metadata object', () => {
      const entity = new NotionEntity(client, page);

      const result = entity.getMetadata();

      expect(result).toEqual(defaultMetadata);
    });

    it('should return the same metadata instance on multiple calls', () => {
      const entity = new NotionEntity(client, page);

      const result1 = entity.getMetadata();
      const result2 = entity.getMetadata();

      expect(result1).toBe(result2);
    });
  });

  describe('op:getParent', () => {
    it('should resolve page_id parent to a NotionPage', async () => {
      const fetch = vi.fn<typeof globalThis.fetch>();
      const testClient = new Client({
        fetch,
        logger: () => undefined,
      });

      const parentPage = buildDummyPage({ pageID: 'parent-page-id' });
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(parentPage), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const childPage = buildDummyPage({
        pageID: 'child-page-id',
        parent: { type: 'page_id', page_id: 'parent-page-id' },
      });

      const entity = new NotionEntity(testClient, childPage, {
        entityFactory: defaultEntityFactory,
      });
      const parent = await entity.getParent();

      expect(parent).not.toBeNull();
      expect(parent!.id).toBe('parent-page-id');
    });

    it('should resolve database_id parent to a NotionDatabase', async () => {
      const fetch = vi.fn<typeof globalThis.fetch>();
      const testClient = new Client({
        fetch,
        logger: () => undefined,
      });

      const parentDb = buildDummyDatabase({ id: 'parent-db-id' });
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(parentDb), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const childPage = buildDummyPage({
        pageID: 'child-page-id',
        parent: { type: 'database_id', database_id: 'parent-db-id' },
      });

      const entity = new NotionEntity(testClient, childPage, {
        entityFactory: defaultEntityFactory,
      });
      const parent = await entity.getParent();

      expect(parent).not.toBeNull();
      expect(parent!.id).toBe('parent-db-id');
    });

    it('should resolve data_source_id parent to a NotionDataSource', async () => {
      const fetch = vi.fn<typeof globalThis.fetch>();
      const testClient = new Client({
        fetch,
        logger: () => undefined,
      });

      const parentDs = buildDummyDataSource({ id: 'parent-ds-id' });
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(parentDs), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const childDs = buildDummyDataSource({ id: 'child-ds-id' });
      // override the parent to be a data_source_id type
      const childDsWithDsParent = {
        ...childDs,
        parent: {
          type: 'data_source_id' as const,
          data_source_id: 'parent-ds-id',
          database_id: 'parent-db-id',
        },
      };

      const entity = new NotionEntity(testClient, childDsWithDsParent, {
        entityFactory: defaultEntityFactory,
      });
      const parent = await entity.getParent();

      expect(parent).not.toBeNull();
      expect(parent!.id).toBe('parent-ds-id');
    });

    it('should enrich page parent users when resolver is provided', async () => {
      const fetch = vi.fn<typeof globalThis.fetch>();
      const testClient = new Client({
        fetch,
        logger: () => undefined,
      });
      const resolver = new UserResolver(testClient);

      const parentPage = buildDummyPage({ pageID: 'enriched-parent-page' });
      // first call: pages.retrieve for the parent page
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(parentPage), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const childPage = buildDummyPage({
        pageID: 'child-with-resolver',
        parent: { type: 'page_id', page_id: 'enriched-parent-page' },
      });

      const entity = new NotionEntity(testClient, childPage, {
        userResolver: resolver,
        entityFactory: defaultEntityFactory,
      });
      const parent = await entity.getParent();

      expect(parent).not.toBeNull();
      expect(parent!.id).toBe('enriched-parent-page');
    });

    it('should enrich datasource parent users when resolver is provided', async () => {
      const fetch = vi.fn<typeof globalThis.fetch>();
      const testClient = new Client({
        fetch,
        logger: () => undefined,
      });
      const resolver = new UserResolver(testClient);

      const parentDs = buildDummyDataSource({ id: 'enriched-parent-ds' });
      // first call: dataSources.retrieve for the parent datasource
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(parentDs), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const childDs = buildDummyDataSource({ id: 'child-ds-resolver' });
      const childDsWithDsParent = {
        ...childDs,
        parent: {
          type: 'data_source_id' as const,
          data_source_id: 'enriched-parent-ds',
          database_id: 'parent-db-id',
        },
      };

      const entity = new NotionEntity(testClient, childDsWithDsParent, {
        userResolver: resolver,
        entityFactory: defaultEntityFactory,
      });
      const parent = await entity.getParent();

      expect(parent).not.toBeNull();
      expect(parent!.id).toBe('enriched-parent-ds');
    });

    it('should return null for workspace parent', async () => {
      const entity = new NotionEntity(client, page, {
        entityFactory: defaultEntityFactory,
      });
      const parent = await entity.getParent();

      expect(parent).toBeNull();
    });

    it('should throw for inaccessible page parent', async () => {
      const fetch = vi.fn<typeof globalThis.fetch>();
      const testClient = new Client({
        fetch,
        logger: () => undefined,
      });

      const inaccessible = { object: 'page', id: 'inaccessible-id' };
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(inaccessible), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const childPage = buildDummyPage({
        pageID: 'child-page-id',
        parent: { type: 'page_id', page_id: 'inaccessible-id' },
      });

      const entity = new NotionEntity(testClient, childPage, {
        entityFactory: defaultEntityFactory,
      });

      await expect(entity.getParent()).rejects.toThrow(
        'page inaccessible-id is not accessible',
      );
    });

    it('should throw for inaccessible database parent', async () => {
      const fetch = vi.fn<typeof globalThis.fetch>();
      const testClient = new Client({
        fetch,
        logger: () => undefined,
      });

      const inaccessible = { object: 'database', id: 'inaccessible-db-id' };
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(inaccessible), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const childPage = buildDummyPage({
        pageID: 'child-page-id',
        parent: { type: 'database_id', database_id: 'inaccessible-db-id' },
      });

      const entity = new NotionEntity(testClient, childPage, {
        entityFactory: defaultEntityFactory,
      });

      await expect(entity.getParent()).rejects.toThrow(
        'database inaccessible-db-id is not accessible',
      );
    });

    it('should throw for inaccessible datasource parent', async () => {
      const fetch = vi.fn<typeof globalThis.fetch>();
      const testClient = new Client({
        fetch,
        logger: () => undefined,
      });

      const inaccessible = {
        object: 'data_source',
        id: 'inaccessible-ds-id',
        properties: {},
      };
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(inaccessible), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const childDs = buildDummyDataSource({ id: 'child-ds-id' });
      const childDsWithDsParent = {
        ...childDs,
        parent: {
          type: 'data_source_id' as const,
          data_source_id: 'inaccessible-ds-id',
          database_id: 'parent-db-id',
        },
      };

      const entity = new NotionEntity(testClient, childDsWithDsParent, {
        entityFactory: defaultEntityFactory,
      });

      await expect(entity.getParent()).rejects.toThrow(
        'datasource inaccessible-ds-id is not accessible',
      );
    });

    it('should return cached page parent without API call', async () => {
      const fetch = vi.fn<typeof globalThis.fetch>();
      const testClient = new Client({
        fetch,
        logger: () => undefined,
      });

      const parentPage = buildDummyPage({ pageID: 'cached-parent-page' });
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(parentPage), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const entityCache: EntityCache = {
        pages: new Map(),
        databases: new Map(),
        dataSources: new Map(),
      };

      // first entity to populate cache
      const childPage1 = buildDummyPage({
        pageID: 'child-1',
        parent: { type: 'page_id', page_id: 'cached-parent-page' },
      });
      const entity1 = new NotionEntity(testClient, childPage1, {
        entityFactory: defaultEntityFactory,
        cache: entityCache,
      });
      const parent1 = await entity1.getParent();

      // second entity using cache
      const childPage2 = buildDummyPage({
        pageID: 'child-2',
        parent: { type: 'page_id', page_id: 'cached-parent-page' },
      });
      const entity2 = new NotionEntity(testClient, childPage2, {
        entityFactory: defaultEntityFactory,
        cache: entityCache,
      });
      const parent2 = await entity2.getParent();

      expect(parent1).not.toBeNull();
      expect(parent2).not.toBeNull();
      expect(parent1).toBe(parent2);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should return cached database parent without API call', async () => {
      const fetch = vi.fn<typeof globalThis.fetch>();
      const testClient = new Client({
        fetch,
        logger: () => undefined,
      });

      const parentDb = buildDummyDatabase({ id: 'cached-parent-db' });
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(parentDb), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const entityCache: EntityCache = {
        pages: new Map(),
        databases: new Map(),
        dataSources: new Map(),
      };

      const childPage1 = buildDummyPage({
        pageID: 'child-db-1',
        parent: { type: 'database_id', database_id: 'cached-parent-db' },
      });
      const entity1 = new NotionEntity(testClient, childPage1, {
        entityFactory: defaultEntityFactory,
        cache: entityCache,
      });
      const parent1 = await entity1.getParent();

      const childPage2 = buildDummyPage({
        pageID: 'child-db-2',
        parent: { type: 'database_id', database_id: 'cached-parent-db' },
      });
      const entity2 = new NotionEntity(testClient, childPage2, {
        entityFactory: defaultEntityFactory,
        cache: entityCache,
      });
      const parent2 = await entity2.getParent();

      expect(parent1).not.toBeNull();
      expect(parent2).not.toBeNull();
      expect(parent1).toBe(parent2);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should return cached datasource parent without API call', async () => {
      const fetch = vi.fn<typeof globalThis.fetch>();
      const testClient = new Client({
        fetch,
        logger: () => undefined,
      });

      const parentDs = buildDummyDataSource({ id: 'cached-parent-ds' });
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(parentDs), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const entityCache: EntityCache = {
        pages: new Map(),
        databases: new Map(),
        dataSources: new Map(),
      };

      const childDs1 = {
        ...buildDummyDataSource({ id: 'child-ds-cache-1' }),
        parent: {
          type: 'data_source_id' as const,
          data_source_id: 'cached-parent-ds',
          database_id: 'parent-db-id',
        },
      };
      const entity1 = new NotionEntity(testClient, childDs1, {
        entityFactory: defaultEntityFactory,
        cache: entityCache,
      });
      const parent1 = await entity1.getParent();

      const childDs2 = {
        ...buildDummyDataSource({ id: 'child-ds-cache-2' }),
        parent: {
          type: 'data_source_id' as const,
          data_source_id: 'cached-parent-ds',
          database_id: 'parent-db-id',
        },
      };
      const entity2 = new NotionEntity(testClient, childDs2, {
        entityFactory: defaultEntityFactory,
        cache: entityCache,
      });
      const parent2 = await entity2.getParent();

      expect(parent1).not.toBeNull();
      expect(parent2).not.toBeNull();
      expect(parent1).toBe(parent2);
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle entities with minimal properties', () => {
      const minimalMetadata = {
        id: 'minimal-id',
        title: '',
        url: '',
        publicUrl: null,
        inTrash: false,
        createdByAvatar: null,
        createdByEmail: null,
        createdByName: null,
        createdAt: '',
        lastEditedByAvatar: null,
        lastEditedByEmail: null,
        lastEditedByName: null,
        lastEditedAt: '',
        coverImage: null,
        iconEmoji: null,
        iconImage: null,
      } satisfies NotionMetadata;

      getMetadata.mockReturnValueOnce(minimalMetadata);

      const minimalPage = {
        ...page,
        id: 'minimal-id',
        cover: null,
        icon: null,
      } as NotionAPIPage;

      const result = new NotionEntity(client, minimalPage);

      expect(result).toEqual(
        expect.objectContaining({
          id: 'minimal-id',
          title: '',
          url: '',
          createdByAvatar: null,
          coverImage: null,
          iconEmoji: null,
          iconImage: null,
        }),
      );
    });
  });
});
