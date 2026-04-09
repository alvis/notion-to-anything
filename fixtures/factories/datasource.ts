import { defaultTime } from '../common';
import { titleProperty } from '../properties';
import { personUser } from '../users';

import { buildDummyPage } from './page';

import type { NotionAPIDataSource, NotionAPIList, NotionAPIPage } from '#types/index';

/** options for creating dummy datasource objects */
export interface DummyDataSourceOptions {
  /** the ID of the datasource to be retrieved */
  id?: string;
  /** custom properties for the datasource */
  properties?: NotionAPIDataSource['properties'];
}

/**
 * generates a dummy Notion API's datasource object with the given properties
 * @param options collection of properties to be altered
 * @returns object mimicking the body of the return of Notion's datasource's retrieval API
 */
export function buildDummyDataSource(
  options?: DummyDataSourceOptions,
): NotionAPIDataSource {
  const { id: id = 'database-id', properties } = { ...options };

  return {
    object: 'data_source',
    id,
    url: `https://www.notion.so/workspace/${id}`,
    archived: false,
    in_trash: false,
    is_inline: false,
    public_url: null,
    created_by: personUser,
    created_time: defaultTime,
    last_edited_by: personUser,
    last_edited_time: defaultTime,
    parent: {
      type: 'database_id',
      database_id: 'parent-database-id',
    },
    database_parent: {
      type: 'workspace',
      workspace: true,
    },
    cover: {
      type: 'external',
      external: {
        url: 'https://www.notion.so/cover.png',
      },
    },
    icon: {
      type: 'emoji',
      emoji: '📚',
    },
    description: [],
    title: titleProperty.title,
    properties: properties ?? {
      Name: {
        id: 'title',
        type: 'title',
        name: 'title',
        title: {},
        description: 'description',
      },
    },
  };
}

/** options for creating dummy datasource page list objects */
export interface DummyDataSourcePageListOptions {
  /** the ID of the datasource to be retrieved */
  databaseID: string;
  /** list of page ids to be returned */
  pageIDs: string[];
  /** value of `next_cursor` */
  next?: string | null;
}

/**
 * generates a dummy Notion API's datasource page list object with the given properties
 * @param arg collection of properties to be altered
 * @returns object mimicking the body of the return of Notion's datasource's retrieval API
 */
export function buildDummyDataSourcePageList(
  arg: DummyDataSourcePageListOptions,
): NotionAPIList<NotionAPIPage> {
  const { databaseID, pageIDs, next } = arg;

  return {
    object: 'list',
    results: pageIDs.map((pageID) =>
      buildDummyPage({
        pageID,
        parent: {
          type: 'database_id',
          database_id: databaseID,
        },
      }),
    ),

    next_cursor: next ?? null,
    has_more: !!next,
  };
}
