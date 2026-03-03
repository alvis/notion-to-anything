import { mapWithConcurrency, resolveConcurrency } from '#concurrency';
import { NotionEntity } from '#entity';
import { NotionPage } from '#page';
import { getPropertyContentFromRichText } from '#property';
import { take } from '#take';
import { resolveEntityUsers } from '#user';

import type { Client } from '@notionhq/client';

import type { EntityOptions } from '#entity';
import type {
  NotionAPIDataSource,
  NotionAPIDataSourceFilter,
  NotionAPIPage,
  QueryOptions,
} from '#types';

/** for obtaining content related to a datasource */
export class NotionDataSource extends NotionEntity {
  readonly #dataSource: NotionAPIDataSource;

  /**
   * creates a datasource instance with the datasource object returned from the API
   * @param client the notion client
   * @param dataSource the datasource object returned from the API
   * @param options optional configuration for the datasource entity
   */
  constructor(
    client: Client,
    dataSource: NotionAPIDataSource,
    options?: EntityOptions,
  ) {
    super(client, dataSource, options);

    this.#dataSource = dataSource;
  }

  /**
   * gets all property definitions from the datasource
   * @returns record of all property definitions
   */
  public get properties(): NotionAPIDataSource['properties'] {
    return this.#dataSource.properties;
  }

  /** whether the datasource is archived */
  public get archived(): boolean {
    return this.#dataSource.archived;
  }

  /** whether the datasource is inline */
  public get isInline(): boolean {
    return this.#dataSource.is_inline;
  }

  /** the description of the datasource */
  public get description(): string {
    return getPropertyContentFromRichText(this.#dataSource.description);
  }

  /**
   * gets pages from the datasource with optional filtering
   * @param options query options for filtering, sorting, and pagination
   * @returns pages and optional cursor for next page
   */
  public async search(
    options?: QueryOptions,
  ): Promise<{ pages: NotionPage[]; cursor?: string }> {
    const effectiveOffset = options?.cursor ? 0 : (options?.offset ?? 0);
    const effectiveLimit =
      options?.limit !== undefined
        ? effectiveOffset + options.limit
        : undefined;

    const concurrency = resolveConcurrency(
      options?.concurrency ?? this.concurrency,
    );

    const { next, entities } = await take(
      this.client.dataSources.query,
      {
        data_source_id: this.id,
        filter: options?.filter as NotionAPIDataSourceFilter | undefined,
        sorts: options?.sorts ? mapDataSourceSorts(options.sorts) : undefined,
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

    const pages = await mapWithConcurrency(
      accessiblePages,
      async (page) => {
        const enriched = this.userResolver
          ? await resolveEntityUsers(page, this.userResolver)
          : page;

        const notionPage = new NotionPage(this.client, enriched, {
          userResolver: this.userResolver,
          concurrency: this.concurrency,
          entityFactory: this.entityFactory,
          cache: this.cache,
        });

        this.cache?.pages.set(notionPage.id, Promise.resolve(notionPage));

        return notionPage;
      },
      concurrency,
      { signal: options?.signal },
    );

    return { pages, cursor: next };
  }
}

/**
 * maps QueryOptions sorts to Notion API datasource sort format
 * @param sorts array of sort criteria with field/order
 * @returns array of Notion API sort objects with property/direction
 */
function mapDataSourceSorts(
  sorts: Array<{ field: string; order: 'asc' | 'desc' }>,
): Array<{ property: string; direction: 'ascending' | 'descending' }> {
  return sorts.map((s) => ({
    property: s.field,
    direction: s.order === 'asc' ? 'ascending' : 'descending',
  }));
}
