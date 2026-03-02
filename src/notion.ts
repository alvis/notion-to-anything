/* eslint-disable max-lines -- cohesive Notion client: read methods, their SDK-error wrapping, and search share one class */

import { Client, isNotionClientError } from '@notionhq/client';

import { NotionDatabase } from '#database';
import { NotionDataSource } from '#datasource';
import { enrichEntity } from '#entity';
import { defaultEntityFactory } from '#entity-factory';
import { NotionAnythingError, NotionAPIError } from '#errors';
import { NotionPage } from '#page';

import {
  RequestMetrics,
  mapWithConcurrency,
  resolveConcurrency,
  resolveFetch,
  take,
} from '#request';

import { NotionUser, UserResolver } from '#user';

import type { EntityCache, EntityOptions } from '#entity';
import type { RequestHooks, RatelimitOptions, ResolveToken } from '#request';
import type { NotionAPIDataSource, NotionAPIPage, QueryOptions } from '#types';

/** logger function accepted by the underlying Notion SDK client */
type NotionSdkLogger = NonNullable<
  NonNullable<ConstructorParameters<typeof Client>[0]>['logger']
>;

/**
 * default SDK logger that prevents the Notion SDK from writing to console
 * @returns nothing
 */
const NOOP_NOTION_SDK_LOGGER: NotionSdkLogger = () => undefined;

/** configuration options for creating a Notion client */
export interface NotionOptions {
  /**
   * bearer token source — either a literal string or an async function called
   * per attempt; the function receives `init=true` for the initial attempt and
   * `init=false` only on the one-shot post-401 refresh
   */
  token: ResolveToken;
  /** optional base fetch implementation (defaults to `globalThis.fetch`) */
  fetch?: typeof global.fetch;
  /** optional logger forwarded to the underlying Notion SDK client */
  logger?: NotionSdkLogger;
  /** default maximum number of concurrent operations for all methods */
  concurrency?: number;
  /**
   * enable entity caching for all entity retrieval (default: false);
   * set to false to also disable user resolution caching (default: true)
   */
  cache?: boolean;
  /** optional hooks that receive low-level request lifecycle events */
  hooks?: RequestHooks;
  /**
   * proactive request rate cap applied to all Notion API calls; defaults are
   * always applied (count: 3, interval: 1000ms) even when omitted
   */
  ratelimit?: RatelimitOptions;
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

  /** structured paginated-request hook threaded down to the `take` helper */
  readonly #onRequest?: RequestHooks['onRequest'];

  /** low-level request metrics tracker for the built-in fetch wrapper */
  readonly #metrics = new RequestMetrics();

  /**
   * creates a Notion client with plugin options
   * @param options configuration options
   * @returns a Notion client
   */
  constructor(options: NotionOptions) {
    if (options.concurrency !== undefined) {
      resolveConcurrency(options.concurrency);
    }

    const fetch = resolveFetch({
      concurrency: options.concurrency,
      ratelimit: options.ratelimit,
      hooks: buildHooks(this.#metrics, options.hooks),
      fetch: options.fetch,
      token: options.token,
    });

    const client = new Client({
      fetch,
      logger: options.logger ?? NOOP_NOTION_SDK_LOGGER,
      retry: false,
    });

    this.#client = client;
    this.#userResolver = new UserResolver(client, {
      cache: options.cache !== false,
    });
    this.#concurrency = options.concurrency;
    this.#cache = options.cache ?? false;
    this.#onRequest = options.hooks?.onRequest;
    this.#entityCache = {
      pages: new Map(),
      databases: new Map(),
      dataSources: new Map(),
    };
  }

  /**
   * exposes the underlying Notion SDK client for advanced consumers that need
   * direct access to SDK operations not covered by the entity helpers
   * @returns the underlying SDK client
   */
  public get client(): Client {
    return this.#client;
  }

  /**
   * builds the shared options for constructing child entities
   * @param cache the effective cache to attach (or undefined to disable)
   * @returns the common entity options carrying resolver, concurrency, and hook
   */
  #entityOptions(cache: EntityCache | undefined): EntityOptions {
    return {
      userResolver: this.#userResolver,
      concurrency: this.#concurrency,
      entityFactory: defaultEntityFactory,
      cache,
      onRequest: this.#onRequest,
    };
  }

  /**
   * exposes the live request metrics tracker as a read-only accessor so the
   * single underlying instance can be observed without being reassigned
   * @returns the request metrics tracker
   */
  public get metrics(): RequestMetrics {
    return this.#metrics;
  }

  /**
   * retrieves a user by their uuid
   * @param id the uuid of the user
   * @returns a NotionUser instance with full user details
   */
  public async getUser(id: string): Promise<NotionUser> {
    const user = await this.#userResolver.resolve(id);

    if (!user) {
      throw new NotionAnythingError({
        code: 'ENTITY_NOT_ACCESSIBLE',
        message: `user ${id} is not accessible`,
      });
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
      const database = await this.#client.databases
        .retrieve({ database_id: id })
        .catch(rethrowAsNotionAPIError);

      if (!('url' in database)) {
        throw new NotionAnythingError({
          code: 'ENTITY_NOT_ACCESSIBLE',
          message: `database ${id} is not accessible`,
        });
      }

      return new NotionDatabase(
        this.#client,
        database,
        this.#entityOptions(effectiveCache),
      );
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
      const dataSource = await this.#client.dataSources
        .retrieve({ data_source_id: id })
        .catch(rethrowAsNotionAPIError);

      if (!('parent' in dataSource)) {
        throw new NotionAnythingError({
          code: 'ENTITY_NOT_ACCESSIBLE',
          message: `datasource ${id} is not accessible`,
        });
      }

      return new NotionDataSource(
        this.#client,
        await enrichEntity(dataSource, this.#userResolver),
        this.#entityOptions(effectiveCache),
      );
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
      const page = await this.#client.pages
        .retrieve({ page_id: id })
        .catch(rethrowAsNotionAPIError);

      if (!('parent' in page)) {
        throw new NotionAnythingError({
          code: 'ENTITY_NOT_ACCESSIBLE',
          message: `page ${id} is not accessible`,
        });
      }

      return new NotionPage(
        this.#client,
        await enrichEntity(page, this.#userResolver),
        this.#entityOptions(effectiveCache),
      );
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
        sort,
      },
      {
        limit: effectiveLimit,
        cursor: options?.cursor,
        signal: options?.signal,
        onRequest: this.#onRequest,
      },
    ).catch(rethrowAsNotionAPIError);

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
        const notionPage = new NotionPage(
          this.#client,
          await enrichEntity(page, this.#userResolver),
          this.#entityOptions(effectiveCache),
        );

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
        filter: { property: 'object', value: 'data_source' },
        sort,
      },
      {
        limit: effectiveLimit,
        cursor: options?.cursor,
        signal: options?.signal,
        onRequest: this.#onRequest,
      },
    ).catch(rethrowAsNotionAPIError);

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
        const entity = new NotionDataSource(
          this.#client,
          await enrichEntity(source, this.#userResolver),
          this.#entityOptions(effectiveCache),
        );
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
 * re-keys a caught SDK failure into a normalized `NotionAPIError`, preserving
 * any non-SDK error untouched so it surfaces at the original boundary; always
 * throws — a `NotionAPIError` for Notion SDK errors, otherwise the original
 * @param error the value caught from an underlying SDK call
 */
function rethrowAsNotionAPIError(error: unknown): never {
  if (isNotionClientError(error)) {
    throw NotionAPIError.from(error);
  }

  throw error;
}

/**
 * composes the user's hooks with metrics pause tracking so the metrics
 * `activeMs` correctly excludes rate-limit pause windows
 * @param metrics metrics instance owning the pause window state
 * @param hooks optional user-supplied request hooks
 * @returns hooks that bridge rate-limit events into metrics
 */
function buildHooks(
  metrics: RequestMetrics,
  hooks: RequestHooks | undefined,
): RequestHooks {
  return {
    onRequestStart: (meta) => {
      metrics.recordRequest();
      hooks?.onRequestStart?.(meta);
    },
    onRequestEnd: (meta) => hooks?.onRequestEnd?.(meta),
    onRateLimitPause: (event) => {
      metrics.beginPause();
      hooks?.onRateLimitPause?.(event);
    },
    onRateLimitResume: (event) => {
      metrics.endPause();
      hooks?.onRateLimitResume?.(event);
    },
  };
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

/* eslint-enable max-lines */
