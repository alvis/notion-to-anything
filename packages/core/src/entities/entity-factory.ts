import { NotionDatabase } from '#entities/database';
import { NotionDataSource } from '#entities/datasource';
import { NotionPage } from '#entities/page';

import type { Client } from '@notionhq/client';

import type { EntityFactory, EntityOptions } from '#entities/entity';
import type {
  NotionAPIDatabase,
  NotionAPIDataSource,
  NotionAPIPage,
} from '#types/index';

/** concrete implementation of EntityFactory that statically imports all entity classes */
class ConcreteEntityFactory implements EntityFactory {
  /**
   * creates a NotionPage instance
   * @param client the notion client
   * @param page the page object returned from the API
   * @param options optional configuration for the page entity
   * @returns a new NotionPage instance
   */
  public createPage(
    client: Client,
    page: NotionAPIPage,
    options?: EntityOptions,
  ): NotionPage {
    return new NotionPage(client, page, options);
  }

  /**
   * creates a NotionDatabase instance
   * @param client the notion client
   * @param database the database object returned from the API
   * @param options optional configuration for the database entity
   * @returns a new NotionDatabase instance
   */
  public createDatabase(
    client: Client,
    database: NotionAPIDatabase,
    options?: EntityOptions,
  ): NotionDatabase {
    return new NotionDatabase(client, database, options);
  }

  /**
   * creates a NotionDataSource instance
   * @param client the notion client
   * @param dataSource the datasource object returned from the API
   * @param options optional configuration for the datasource entity
   * @returns a new NotionDataSource instance
   */
  public createDataSource(
    client: Client,
    dataSource: NotionAPIDataSource,
    options?: EntityOptions,
  ): NotionDataSource {
    return new NotionDataSource(client, dataSource, options);
  }
}

/** default entity factory for creating entity instances */
export const defaultEntityFactory: EntityFactory = new ConcreteEntityFactory();
