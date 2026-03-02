import { resolveConcurrency } from '#concurrency';
import { getMetadata } from '#metadata';
import { resolveEntityUsers } from '#user';

import type { Client } from '@notionhq/client';

import type { NotionDatabase } from '#database';
import type { NotionDataSource } from '#datasource';
import type { NotionPage } from '#page';
import type {
  NotionAPIDatabase,
  NotionAPIDataSource,
  NotionAPIPage,
  NotionMetadata,
} from '#types';
import type { UserResolver } from '#user';

/** options for configuring a Notion entity */
export interface EntityOptions {
  /** resolver for enriching partial user references */
  userResolver?: UserResolver;
  /** maximum number of concurrent operations */
  concurrency?: number;
  /** factory for creating entity instances without circular dependencies */
  entityFactory?: EntityFactory;
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
      case 'page_id': {
        const page = await this.#client.pages.retrieve({
          page_id: parent.page_id,
        });

        if (!('url' in page)) {
          throw new Error(`page ${parent.page_id} is not accessible`);
        }

        const enrichedPage = this.#userResolver
          ? await resolveEntityUsers(page, this.#userResolver)
          : page;

        return this.#entityFactory!.createPage(this.#client, enrichedPage, {
          userResolver: this.#userResolver,
          concurrency: this.#concurrency,
          entityFactory: this.#entityFactory,
        });
      }

      case 'database_id': {
        const database = await this.#client.databases.retrieve({
          database_id: parent.database_id,
        });

        if (!('url' in database)) {
          throw new Error(
            `database ${parent.database_id} is not accessible`,
          );
        }

        return this.#entityFactory!.createDatabase(this.#client, database, {
          userResolver: this.#userResolver,
          concurrency: this.#concurrency,
          entityFactory: this.#entityFactory,
        });
      }

      case 'data_source_id': {
        const dataSource = await this.#client.dataSources.retrieve({
          data_source_id: parent.data_source_id,
        });

        if (!('url' in dataSource)) {
          throw new Error(
            `datasource ${parent.data_source_id} is not accessible`,
          );
        }

        const enrichedDataSource = this.#userResolver
          ? await resolveEntityUsers(dataSource, this.#userResolver)
          : dataSource;

        return this.#entityFactory!.createDataSource(
          this.#client,
          enrichedDataSource,
          {
            userResolver: this.#userResolver,
            concurrency: this.#concurrency,
            entityFactory: this.#entityFactory,
          },
        );
      }

      default: {
        return null;
      }
    }
  }
}
