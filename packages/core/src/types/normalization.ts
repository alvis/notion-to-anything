import type {
  NotionAPIBlock,
  NotionAPIDatabase,
  NotionAPIDataSource,
  NotionAPIPage,
  NotionAPIPropertyValue,
  NotionAPIUser,
} from './api';
import type { NotionBlockType, PropertyType } from './transformer';

/**
 * enhances notion api entities by replacing user id references with full user objects
 * @template E the notion api entity type
 */
export type EntityWithUserDetail<
  E extends
    | NotionAPIBlock
    | NotionAPIDatabase
    | NotionAPIDataSource
    | NotionAPIPage,
> = Omit<E, 'created_by' | 'last_edited_by'> & {
  /* eslint-disable @typescript-eslint/naming-convention -- matches Notion API schema */
  created_by: NotionAPIUser | null;
  last_edited_by: NotionAPIUser | null;
  /* eslint-enable @typescript-eslint/naming-convention */
};

/**
 * extracts a specific property value type from the notion api property union
 * @template P the specific property type to extract
 */
export type NotionPropertyValue<P extends PropertyType = PropertyType> =
  Extract<NotionAPIPropertyValue, { type: P }>;

/**
 * normalized date value from notion with timezone information
 */
export interface Date {
  /* eslint-disable @typescript-eslint/naming-convention -- matches Notion API schema */
  start: string;
  end: string | null;
  time_zone: string | null;
  /* eslint-enable @typescript-eslint/naming-convention */
}

/**
 * normalized file reference from notion
 */
export interface File {
  name: string | null;
  url: string;
}

/**
 * normalized person/user reference from notion
 */
export interface Person {
  name: string | null;
  avatar: string | null;
  email: string | null;
}

/**
 * represents any normalized property value that can be extracted from notion
 */
export type NormalizedValue =
  | SingleNormalizedValue
  | SingleNormalizedValue[]
  | null;

/**
 * represents a single normalized property value from notion
 */
export type SingleNormalizedValue =
  | boolean
  | number
  | string
  | Date
  | File
  | Person;

/**
 * represents a normalized notion block with enhanced child handling
 * @template K the specific block type to extract
 */
export type NotionBlock<K extends NotionBlockType = NotionBlockType> =
  NotionAPIBlock &
    /* eslint-disable @typescript-eslint/naming-convention -- matches Notion API schema */
    (| { has_children: false }
      | { has_children: true; children: NotionBlock[] }
    ) &
    Omit<Extract<NotionAPIBlock, { type: K }>, 'children'>;
/* eslint-enable @typescript-eslint/naming-convention */

/**
 * normalized metadata common to notion pages, datasources, and databases
 */
export interface NotionMetadata {
  id: string;
  title: string;
  url: string;
  publicUrl: string | null;
  inTrash: boolean;
  createdByAvatar: string | null;
  createdByEmail: string | null;
  createdByName: string | null;
  createdAt: string;
  lastEditedByAvatar: string | null;
  lastEditedByEmail: string | null;
  lastEditedByName: string | null;
  lastEditedAt: string;
  coverImage: string | null;
  iconEmoji: string | null;
  iconImage: string | null;
}
