import { resolveConcurrency } from '#traversal/concurrency';
import { getMetadata } from '#entities/metadata';
import { resolveEntityUsers } from '#entities/user';

import type { Client } from '@notionhq/client';

import type { NotionDatabase } from '#entities/database';
import type { NotionDataSource } from '#entities/datasource';
import type { NotionPage } from '#entities/page';
import type {
  NotionAPIDatabase,
  NotionAPIDataSource,
  NotionAPIPage,
  NotionMetadata,
} from '#types/index';
import type { UserResolver } from '#entities/user';

/** shared entity cache store keyed by entity ID */
export interface EntityCache {
  /** cached page promises keyed by page ID */
  pages: Map<string, Promise<NotionPage>>;
  /** cached database promises keyed by database ID */
  databases: Map<string, Promise<NotionDatabase>>;
  /** cached datasource promises keyed by datasource ID */
  dataSources: Map<string, Promise<NotionDataSource>>;
}

/** options for configuring a Notion entity */
export interface EntityOptions {
  /** resolver for enriching partial user references */
  userResolver?: UserResolver;
  /** maximum number of concurrent operations */
  concurrency?: number;
  /** factory for creating entity instances without circular dependencies */
  entityFactory?: EntityFactory;
  /** shared entity cache — presence enables caching, absence disables it */
  cache?: EntityCache;
}

/** factory for creating entity instances to break circular dependencies */
export interface EntityFactory {
  /** creates a NotionPage instance */
  createPage(
    client: Client,
    page: NotionAPIPage,
    options?: EntityOptions,
  ): NotionPage;
  /** creates a NotionDatabase instance */
  createDatabase(
    client: Client,
    database: NotionAPIDatabase,
    options?: EntityOptions,
  ): NotionDatabase;
  /** creates a NotionDataSource instance */
  createDataSource(
    client: Client,
    dataSource: NotionAPIDataSource,
    options?: EntityOptions,
  ): NotionDataSource;
}

/** union of all notion api entity types that can be wrapped */
type NotionAPIEntitySource =
  | NotionAPIPage
  | NotionAPIDataSource
  | NotionAPIDatabase;

/** parent entity union returned by getParent() */
type ParentEntity = NotionDatabase | NotionDataSource | NotionPage;

/** base class for Notion Database, DataSource & Page */
export class NotionEntity {
  /** unique identifier for the entity */
  public readonly id: string;

  /** display title or name of the entity */
  public readonly title: string;

  /** full URL to access the entity in Notion */
  public readonly url: string;

  /** publicly shared URL for the entity, or null if not shared */
  public readonly publicUrl: string | null;

  /** whether the entity has been moved to trash */
  public readonly inTrash: boolean;

  /** avatar URL of the user who created the entity, or null */
  public readonly createdByAvatar: string | null;

  /** email address of the user who created the entity, or null */
  public readonly createdByEmail: string | null;

  /** name of the user who created the entity, or null */
  public readonly createdByName: string | null;

  /** ISO 8601 timestamp when the entity was created */
  public readonly createdAt: string;

  /** avatar URL of the user who last edited the entity, or null */
  public readonly lastEditedByAvatar: string | null;

  /** email address of the user who last edited the entity, or null */
  public readonly lastEditedByEmail: string | null;

  /** name of the user who last edited the entity, or null */
  public readonly lastEditedByName: string | null;

  /** ISO 8601 timestamp of the last edit to the entity */
  public readonly lastEditedAt: string;

  /** URL of the entity's cover image, or null if not set */
  public readonly coverImage: string | null;

  /** emoji used as the entity's icon, or null if not set */
  public readonly iconEmoji: string | null;

  /** URL of the entity's icon image, or null if not set */
  public readonly iconImage: string | null;

  readonly #client: Client;
  readonly #entity: NotionAPIEntitySource;
  readonly #userResolver?: UserResolver;
  readonly #concurrency?: number;
  readonly #entityFactory?: EntityFactory;
  readonly #cache?: EntityCache;
  #metadata: NotionMetadata;

  /**
   * creates a Notion entity with a page, datasource, or database object returned from the API
   * @param client the notion client
   * @param entity an entity object returned from the API
   * @param options optional configuration for the entity
   */
  constructor(
    client: Client,
    entity: NotionAPIEntitySource,
    options?: EntityOptions,
  ) {
    if (options?.concurrency !== undefined) {
      resolveConcurrency(options.concurrency);
    }

    this.#client = client;
    this.#entity = entity;
    this.#userResolver = options?.userResolver;
    this.#concurrency = options?.concurrency;
    this.#entityFactory = options?.entityFactory;
    this.#cache = options?.cache;
    this.#metadata = getMetadata(entity);

    this.id = entity.id;
    this.title = this.#metadata.title;
    this.url = this.#metadata.url;
    this.publicUrl = this.#metadata.publicUrl;
    this.inTrash = this.#metadata.inTrash;
    this.createdByAvatar = this.#metadata.createdByAvatar;
    this.createdByEmail = this.#metadata.createdByEmail;
    this.createdByName = this.#metadata.createdByName;
    this.createdAt = this.#metadata.createdAt;
    this.lastEditedByAvatar = this.#metadata.lastEditedByAvatar;
    this.lastEditedByEmail = this.#metadata.lastEditedByEmail;
    this.lastEditedByName = this.#metadata.lastEditedByName;
    this.lastEditedAt = this.#metadata.lastEditedAt;
    this.coverImage = this.#metadata.coverImage;
    this.iconEmoji = this.#metadata.iconEmoji;
    this.iconImage = this.#metadata.iconImage;
  }

  /** exposes the notion client to subclasses */
  protected get client(): Client {
    return this.#client;
  }

  /** exposes the user resolver to subclasses for entity enrichment */
  protected get userResolver(): UserResolver | undefined {
    return this.#userResolver;
  }

  /** exposes the concurrency limit to subclasses */
  protected get concurrency(): number | undefined {
    return this.#concurrency;
  }

  /** exposes the entity factory to subclasses */
  protected get entityFactory(): EntityFactory | undefined {
    return this.#entityFactory;
  }

  /** exposes the entity cache to subclasses */
  protected get cache(): EntityCache | undefined {
    return this.#cache;
  }

  /** shared entity options for child entity creation */
  private get childOptions(): EntityOptions {
    return {
      userResolver: this.#userResolver,
      concurrency: this.#concurrency,
      entityFactory: this.#entityFactory,
      cache: this.#cache,
    };
  }

  /**
   * gets the metadata of the entity
   * @returns metadata
   */
  public getMetadata(): NotionMetadata {
    return this.#metadata;
  }

  /**
   * resolves the parent of this entity to a NotionPage, NotionDataSource, NotionDatabase, or null
   * @returns the parent entity instance, or null for workspace/block parents
   * @throws {Error} if the parent entity is not accessible
   */
  public async getParent(): Promise<ParentEntity | null> {
    const { parent } = this.#entity;

    return this.resolveParentReference(parent);
  }

  /**
   * resolves a parent reference to an entity instance
   * @param parent the parent reference from the Notion API
   * @returns the resolved parent entity, or null
   * @throws {Error} if the parent entity is not accessible
   */
  protected async resolveParentReference(
    parent: NotionAPIEntitySource['parent'],
  ): Promise<ParentEntity | null> {
    switch (parent.type) {
      case 'page_id':
        return this.resolvePageParent(parent.page_id);
      case 'database_id':
        return this.resolveDatabaseParent(parent.database_id);
      case 'data_source_id':
        return this.resolveDataSourceParent(parent.data_source_id);
      default:
        return null;
    }
  }

  /**
   * resolves a page parent by ID, using cache when available
   * @param id the page ID to resolve
   * @returns the resolved page entity
   * @throws {Error} if the page is not accessible
   */
  private async resolvePageParent(id: string): Promise<NotionPage> {
    const cached = this.#cache?.pages.get(id);
    if (cached) {
      return cached;
    }

    const page = await this.#client.pages.retrieve({ page_id: id });

    if (!('url' in page)) {
      throw new Error(`page ${id} is not accessible`);
    }

    const enriched = this.#userResolver
      ? await resolveEntityUsers(page, this.#userResolver)
      : page;

    const entity = this.#entityFactory!.createPage(
      this.#client,
      enriched,
      this.childOptions,
    );

    this.#cache?.pages.set(id, Promise.resolve(entity));

    return entity;
  }

  /**
   * resolves a database parent by ID, using cache when available
   * @param id the database ID to resolve
   * @returns the resolved database entity
   * @throws {Error} if the database is not accessible
   */
  private async resolveDatabaseParent(id: string): Promise<NotionDatabase> {
    const cached = this.#cache?.databases.get(id);
    if (cached) {
      return cached;
    }

    const database = await this.#client.databases.retrieve({
      database_id: id,
    });

    if (!('url' in database)) {
      throw new Error(`database ${id} is not accessible`);
    }

    const entity = this.#entityFactory!.createDatabase(
      this.#client,
      database,
      this.childOptions,
    );

    this.#cache?.databases.set(id, Promise.resolve(entity));

    return entity;
  }

  /**
   * resolves a datasource parent by ID, using cache when available
   * @param id the datasource ID to resolve
   * @returns the resolved datasource entity
   * @throws {Error} if the datasource is not accessible
   */
  private async resolveDataSourceParent(id: string): Promise<NotionDataSource> {
    const cached = this.#cache?.dataSources.get(id);
    if (cached) {
      return cached;
    }

    const dataSource = await this.#client.dataSources.retrieve({
      data_source_id: id,
    });

    if (!('url' in dataSource)) {
      throw new Error(`datasource ${id} is not accessible`);
    }

    const enriched = this.#userResolver
      ? await resolveEntityUsers(dataSource, this.#userResolver)
      : dataSource;

    const entity = this.#entityFactory!.createDataSource(
      this.#client,
      enriched,
      this.childOptions,
    );

    this.#cache?.dataSources.set(id, Promise.resolve(entity));

    return entity;
  }
}
