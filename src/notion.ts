import { Client } from '@notionhq/client';

import { mapWithConcurrency, resolveConcurrency } from '#concurrency';
import { NotionDatabase } from '#database';
import { NotionDataSource } from '#datasource';
import { defaultEntityFactory } from '#entity-factory';
import { NotionPage } from '#page';
import { take } from '#take';
import { NotionUser, UserResolver, resolveEntityUsers } from '#user';

import type { EntityCache } from '#entity';
import type { NotionAPIDataSource, NotionAPIPage, QueryOptions } from '#types';

/** configuration options for creating a Notion client */
export interface NotionOptions {
  /** optional pre-configured Notion client to use instead of creating a new one */
  client?: Client;
  /** default maximum number of concurrent operations for all methods */
  concurrency?: number;
  /**
   * enable entity caching for all entity retrieval (default: false);
   * set to false to also disable user resolution caching (default: true)
   */
  cache?: boolean;
}

/** options for individual entity retrieval */
export interface GetEntityOptions {
  /** override caching for this call (default: inherited from global) */
  cache?: boolean;
}

/** a simple Notion client */
export class Notion {
  readonly #client: Client;
  readonly #userResolver: UserResolver;
  readonly #concurrency?: number;
  readonly #cache: boolean;
  readonly #entityCache: EntityCache;

  /**
   * creates a Notion client with plugin options
   * @param options configuration options
   * @returns a Notion client
   */
  constructor(options?: NotionOptions) {
    if (options?.concurrency !== undefined) {
      resolveConcurrency(options.concurrency);
    }

    // use fetch from the global scope
    const { client = new Client({ fetch }) } = { ...options };

    this.#client = client;
    this.#userResolver = new UserResolver(client, {
      cache: options?.cache !== false,
    });
    this.#concurrency = options?.concurrency;
    this.#cache = options?.cache ?? false;
    this.#entityCache = {
      pages: new Map(),
      databases: new Map(),
      dataSources: new Map(),
    };
  }

  /**
   * retrieves a user by their uuid
   * @param id the uuid of the user
   * @returns a NotionUser instance with full user details
   */
  public async getUser(id: string): Promise<NotionUser> {
    const user = await this.#userResolver.resolve(id);

    if (!user) {
      throw new Error(`user ${id} is not accessible`);
    }

    return new NotionUser(user);
  }

  /**
   * retrieves a database by its uuid
   * @param id the uuid of the database
   * @param options optional per-call caching configuration
   * @returns a NotionDatabase instance that allows further operations
   */
  public async getDatabase(
    id: string,
    options?: GetEntityOptions,
  ): Promise<NotionDatabase> {
    const useCache = options?.cache ?? this.#cache;
    const effectiveCache = useCache ? this.#entityCache : undefined;

    const cached = effectiveCache?.databases.get(id);
    if (cached) {
      return cached;
    }

    const promise = (async () => {
      const database = await this.#client.databases.retrieve({
        database_id: id,
      });

      if (!('url' in database)) {
        throw new Error(`database ${id} is not accessible`);
      }

      return new NotionDatabase(this.#client, database, {
        userResolver: this.#userResolver,
        concurrency: this.#concurrency,
        entityFactory: defaultEntityFactory,
        cache: effectiveCache,
      });
    })();

    effectiveCache?.databases.set(id, promise);
    promise.catch(() => effectiveCache?.databases.delete(id));

    return promise;
  }

  /**
   * retrieves a datasource by its uuid
   * @param id the uuid of the datasource
   * @param options optional per-call caching configuration
   * @returns a NotionDataSource instance that allows further operations
   */
  public async getDataSource(
    id: string,
    options?: GetEntityOptions,
  ): Promise<NotionDataSource> {
    const useCache = options?.cache ?? this.#cache;
    const effectiveCache = useCache ? this.#entityCache : undefined;

    const cached = effectiveCache?.dataSources.get(id);
    if (cached) {
      return cached;
    }

    const promise = (async () => {
      const dataSource = await this.#client.dataSources.retrieve({
        data_source_id: id,
      });

      if (!('parent' in dataSource)) {
        throw new Error(`datasource ${id} is not accessible`);
      }

      const enriched = await resolveEntityUsers(dataSource, this.#userResolver);

      return new NotionDataSource(this.#client, enriched, {
        userResolver: this.#userResolver,
        concurrency: this.#concurrency,
        entityFactory: defaultEntityFactory,
        cache: effectiveCache,
      });
    })();

    effectiveCache?.dataSources.set(id, promise);
    promise.catch(() => effectiveCache?.dataSources.delete(id));

    return promise;
  }

  /**
   * retrieves a page by its uuid
   * @param id the uuid of the page
   * @param options optional per-call caching configuration
   * @returns a NotionPage instance that allows further operations
   */
  public async getPage(
    id: string,
    options?: GetEntityOptions,
  ): Promise<NotionPage> {
    const useCache = options?.cache ?? this.#cache;
    const effectiveCache = useCache ? this.#entityCache : undefined;

    const cached = effectiveCache?.pages.get(id);
    if (cached) {
      return cached;
    }

    const promise = (async () => {
      const page = await this.#client.pages.retrieve({ page_id: id });

      if (!('parent' in page)) {
        throw new Error(`page ${id} is not accessible`);
      }

      const enriched = await resolveEntityUsers(page, this.#userResolver);

      return new NotionPage(this.#client, enriched, {
        userResolver: this.#userResolver,
        concurrency: this.#concurrency,
        entityFactory: defaultEntityFactory,
        cache: effectiveCache,
      });
    })();

    effectiveCache?.pages.set(id, promise);
    promise.catch(() => effectiveCache?.pages.delete(id));

    return promise;
  }

  /**
   * searches for pages across the workspace by title
   * @param options query options for search, pagination, and sorting
   * @returns pages and optional cursor for next page
   */
  public async searchPages(
    options?: QueryOptions<'last_edited_time'>,
  ): Promise<{ pages: NotionPage[]; cursor?: string }> {
    const effectiveOffset = options?.cursor ? 0 : (options?.offset ?? 0);
    const effectiveLimit =
      options?.limit !== undefined
        ? effectiveOffset + options.limit
        : undefined;

    const sort = options?.sorts?.[0]
      ? mapWorkspaceSort(options.sorts[0])
      : undefined;

    const concurrency = resolveConcurrency(
      options?.concurrency ?? this.#concurrency,
    );

    const { next, entities } = await take(
      this.#client.search,
      {
        query: options?.query ?? '',
        filter: { property: 'object' as const, value: 'page' as const },
        ...(sort ? { sort } : {}),
      },
      {
        limit: effectiveLimit,
        cursor: options?.cursor,
        signal: options?.signal,
      },
    );

    const accessiblePages = entities
      .filter(
        (entity): entity is NotionAPIPage =>
          entity.object === 'page' && 'parent' in entity,
      )
      .slice(effectiveOffset);

    const effectiveCache = this.#cache ? this.#entityCache : undefined;

    const pages = await mapWithConcurrency(
      accessiblePages,
      async (page) => {
        const enriched = await resolveEntityUsers(page, this.#userResolver);

        const notionPage = new NotionPage(this.#client, enriched, {
          userResolver: this.#userResolver,
          concurrency: this.#concurrency,
          entityFactory: defaultEntityFactory,
          cache: effectiveCache,
        });

        effectiveCache?.pages.set(notionPage.id, Promise.resolve(notionPage));

        return notionPage;
      },
      concurrency,
      { signal: options?.signal },
    );

    return { pages, cursor: next };
  }

  /**
   * searches for datasources across the workspace by title
   * @param options query options for search, pagination, and sorting
   * @returns dataSources and optional cursor for next page
   */
  public async searchDataSources(
    options?: QueryOptions<'last_edited_time'>,
  ): Promise<{ dataSources: NotionDataSource[]; cursor?: string }> {
    const effectiveOffset = options?.cursor ? 0 : (options?.offset ?? 0);
    const effectiveLimit =
      options?.limit !== undefined
        ? effectiveOffset + options.limit
        : undefined;
    const sort = options?.sorts?.[0]
      ? mapWorkspaceSort(options.sorts[0])
      : undefined;
    const concurrency = resolveConcurrency(
      options?.concurrency ?? this.#concurrency,
    );

    const { next, entities } = await take(
      this.#client.search,
      {
        query: options?.query ?? '',
        filter: {
          property: 'object' as const,
          value: 'data_source' as const,
        },
        ...(sort ? { sort } : {}),
      },
      {
        limit: effectiveLimit,
        cursor: options?.cursor,
        signal: options?.signal,
      },
    );

    const accessibleDataSources = entities
      .filter(
        (entity): entity is NotionAPIDataSource =>
          entity.object === 'data_source' && 'parent' in entity,
      )
      .slice(effectiveOffset);
    const effectiveCache = this.#cache ? this.#entityCache : undefined;

    const dataSources = await mapWithConcurrency(
      accessibleDataSources,
      async (source) => {
        const enriched = await resolveEntityUsers(source, this.#userResolver);
        const entity = new NotionDataSource(this.#client, enriched, {
          userResolver: this.#userResolver,
          concurrency: this.#concurrency,
          entityFactory: defaultEntityFactory,
          cache: effectiveCache,
        });
        effectiveCache?.dataSources.set(entity.id, Promise.resolve(entity));

        return entity;
      },
      concurrency,
      { signal: options?.signal },
    );

    return { dataSources, cursor: next };
  }
}

/**
 * maps QueryOptions sort to Notion API workspace search sort format
 * @param sort sort criteria with field/order
 * @param sort.field the timestamp field to sort by
 * @param sort.order the sort direction
 * @returns Notion API sort object with timestamp/direction
 */
function mapWorkspaceSort(sort: {
  field: 'last_edited_time';
  order: 'asc' | 'desc';
}): { timestamp: 'last_edited_time'; direction: 'ascending' | 'descending' } {
  return {
    timestamp: sort.field,
    direction: sort.order === 'asc' ? 'ascending' : 'descending',
  };
}
