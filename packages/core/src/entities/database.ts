import { mapWithConcurrency, resolveConcurrency } from '#traversal/concurrency';
import { getPropertyContentFromRichText } from '#entities/property';
import { resolveEntityUsers } from '#entities/user';

import { NotionEntity } from '#entities/entity';

import type { Client } from '@notionhq/client';

import type { NotionDataSource } from '#entities/datasource';
import type { EntityOptions } from '#entities/entity';
import type { NotionAPIDatabase } from '#types/index';

/** notion database with access to its datasources */
export class NotionDatabase extends NotionEntity {
  readonly #database: NotionAPIDatabase;

  /**
   * creates a database instance with the database object returned from the API
   * @param client the notion client
   * @param database the database object returned from the API
   * @param options optional configuration for the database entity
   */
  constructor(
    client: Client,
    database: NotionAPIDatabase,
    options?: EntityOptions,
  ) {
    super(client, database, options);

    this.#database = database;
  }

  /** whether the database is inline */
  public get isInline(): boolean {
    return this.#database.is_inline;
  }

  /** whether the database is locked */
  public get isLocked(): boolean {
    return this.#database.is_locked;
  }

  /** the description of the database */
  public get description(): string {
    return getPropertyContentFromRichText(this.#database.description);
  }

  /**
   * retrieves all datasources belonging to this database
   * @param options optional concurrency and signal configuration
   * @param options.concurrency maximum number of concurrent retrieval tasks
   * @param options.signal optional abort signal to cancel the operation
   * @returns array of NotionDataSource instances
   */
  public async getDataSources(options?: {
    concurrency?: number;
    signal?: AbortSignal;
  }): Promise<NotionDataSource[]> {
    const concurrency = resolveConcurrency(
      options?.concurrency ?? this.concurrency,
    );

    const results = await mapWithConcurrency(
      this.#database.data_sources,
      async (ref) => {
        const cached = this.cache?.dataSources.get(ref.id);
        if (cached) {
          return cached;
        }

        const dataSource = await this.client.dataSources.retrieve({
          data_source_id: ref.id,
        });

        if (!('url' in dataSource)) {
          return null;
        }

        const enriched = this.userResolver
          ? await resolveEntityUsers(dataSource, this.userResolver)
          : dataSource;

        const entity = this.entityFactory!.createDataSource(
          this.client,
          enriched,
          {
            userResolver: this.userResolver,
            concurrency: this.concurrency,
            entityFactory: this.entityFactory,
            cache: this.cache,
          },
        );

        this.cache?.dataSources.set(ref.id, Promise.resolve(entity));

        return entity;
      },
      concurrency,
      { signal: options?.signal },
    );

    return results.filter((dataSource) => dataSource !== null);
  }
}
