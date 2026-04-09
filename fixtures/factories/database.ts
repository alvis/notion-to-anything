import { defaultTime } from '../common';
import { titleProperty } from '../properties';

import type { NotionAPIDatabase } from '#types/index';

/** options for creating dummy database objects */
export interface DummyDatabaseOptions {
  /** the ID of the database */
  id?: string;
  /** whether the database is inline */
  isInline?: boolean;
  /** whether the database is locked */
  isLocked?: boolean;
  /** whether the database is in trash */
  inTrash?: boolean;
  /** description rich text array */
  description?: NotionAPIDatabase['description'];
  /** data source references */
  dataSources?: NotionAPIDatabase['data_sources'];
  /** parent override */
  parent?: NotionAPIDatabase['parent'];
}

/**
 * generate a dummy Notion API's database object with the given properties
 * @param options collection of properties to be altered
 * @returns object mimicking the body of the return of Notion's database retrieval API
 */
export function buildDummyDatabase(
  options?: DummyDatabaseOptions,
): NotionAPIDatabase {
  const {
    id = 'database-id',
    isInline = false,
    isLocked = false,
    inTrash = false,
    description = [],
    dataSources = [{ id: 'ds-1', name: 'Default' }],
    parent,
  } = { ...options };

  return {
    object: 'database',
    id,
    url: `https://www.notion.so/workspace/${id}`,
    public_url: null,
    created_time: defaultTime,
    last_edited_time: defaultTime,
    in_trash: inTrash,
    is_inline: isInline,
    is_locked: isLocked,
    parent: parent ?? {
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
    description,
    title: titleProperty.title,
    data_sources: dataSources,
  };
}
