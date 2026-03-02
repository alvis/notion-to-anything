import { defaultTime } from '../common';
import { titleProperty } from '../properties';
import { personUser } from '../users';

import type {
  InaccessibleNotionAPIBlock,
  NotionAPIBlock,
  NotionAPIList,
  NotionAPIPage,
  NotionAPIPropertyValue,
} from '#types';

/** options for creating dummy page objects */
export interface DummyPageOptions {
  /** the ID of the page to be retrieved */
  pageID?: string;
  /** the page's parent object */
  parent?: NotionAPIPage['parent'];
  /** properties to be altered */
  properties?: Record<string, NotionAPIPropertyValue>;
}

/**
 * generate a dummy Notion API's page object with the given properties
 * @param options collection of properties to be altered
 * @returns object mimicking the body of the return of Notion's page's retrieval API
 */
export function buildDummyPage(options?: DummyPageOptions): NotionAPIPage {
  const { pageID = 'page-id', parent, properties = {} } = { ...options };

  return {
    object: 'page',
    id: pageID,
    url: `https://www.notion.so/workspace/${pageID}`,
    archived: false,
    in_trash: false,
    public_url: null,
    created_by: personUser,
    created_time: defaultTime,
    last_edited_by: personUser,
    last_edited_time: defaultTime,
    cover: {
      type: 'file',
      file: {
        url: 'https://www.notion.so/cover.png',
        expiry_time: defaultTime,
      },
    },
    icon: {
      type: 'emoji',
      emoji: '📚',
    },
    is_locked: false,
    parent: parent ?? {
      type: 'workspace',
      workspace: true,
    },
    properties: {
      Name: titleProperty,
      ...properties,
    },
  };
}

/** options for creating dummy block list objects */
export interface DummyBlockListOptions {
  /** list of block IDs to be generated */
  blockIds: string[];
  /** common parent of all blocks */
  parent: NotionAPIBlock['parent'];
  /** indicate whether the blocks generated have children */
  hasChildren?: boolean;
  /** value of `next_cursor` */
  next?: string | null;
}

/**
 * generate a dummy Notion API's block list object with the given properties
 * @param options collection of properties to be altered
 * @returns object mimicking the body of the return of Notion's page's retrieval API
 */
export function buildDummyBlockList(
  options: DummyBlockListOptions,
): NotionAPIList<InaccessibleNotionAPIBlock> {
  const { blockIds, parent, hasChildren = false, next } = options;

  return {
    object: 'list',
    results: blockIds.map((id) => ({
      object: 'block',
      id,
      archived: false,
      created_by: {
        id: 'person_user',
        object: 'user',
      },
      created_time: defaultTime,
      last_edited_by: {
        id: 'person_user',
        object: 'user',
      },
      parent,
      in_trash: false,
      last_edited_time: defaultTime,
      has_children: hasChildren,
      type: 'paragraph',
      paragraph: {
        color: 'default',
        rich_text: [
          {
            type: 'text',
            text: {
              content: id,
              link: null,
            },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: 'default',
            },
            plain_text: id,
            href: null,
          },
        ],
      },
    })),

    next_cursor: next ?? null,
    has_more: !!next,
  };
}
