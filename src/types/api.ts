import type { Client } from '@notionhq/client';

// USER //

export type NotionAPIUser = Awaited<ReturnType<Client['users']['retrieve']>>;

export type InaccessibleNotionAPIUser = Pick<NotionAPIUser, 'object' | 'id'>;

// BLOCK //

export type NotionAPIBlock = Extract<
  Awaited<ReturnType<Client['blocks']['retrieve']>>,
  { type: string }
>;

export type NotionAPIBlockBase = Pick<
  NotionAPIBlock,
  | 'object'
  | 'id'
  | 'archived'
  | 'in_trash'
  | 'created_by'
  | 'created_time'
  | 'has_children'
  | 'last_edited_by'
  | 'last_edited_time'
  | 'parent'
>;

export type InaccessibleNotionAPIBlock = Exclude<
  Awaited<ReturnType<Client['blocks']['retrieve']>>,
  NotionAPIBlock
>;

export type NotionAPIRichText = Extract<
  NotionAPIBlock,
  {
    type: 'paragraph';
  }
>['paragraph']['rich_text'][number];

export type NotionAPITextRichText = Extract<
  NotionAPIRichText,
  { type: 'text' }
>;

export type NotionAPIMentionRichText = Extract<
  NotionAPIRichText,
  { type: 'mention' }
>;

export type NotionAPIEquationRichText = Extract<
  NotionAPIRichText,
  { type: 'equation' }
>;

export type NotionAPIAnnotations = NotionAPIRichText['annotations'];
export type NotionAPIColor = NotionAPIAnnotations['color'];

export type NotionAPITitle = Extract<NotionAPIPropertyValue, { type: 'title' }>;

// PROPERTY //

export type NotionAPIPropertyValueWithoutID<P> =
  P extends NotionAPIPage['properties'][string] ? Omit<P, 'id'> : never;
export type NotionAPIPropertyValue = NotionAPIPage['properties'][string];

// DATABASE //

export type NotionAPIDatabase = Extract<
  Awaited<ReturnType<Client['databases']['retrieve']>>,
  { url: string }
>;

export type InaccessibleNotionAPIDatabase = Exclude<
  Awaited<ReturnType<Client['databases']['retrieve']>>,
  NotionAPIDatabase
>;

// DATASOURCE //

export type NotionAPIDataSource = Extract<
  Awaited<ReturnType<Client['dataSources']['retrieve']>>,
  { url: string }
>;

export type InaccessibleNotionAPIDataSource = Exclude<
  Awaited<ReturnType<Client['dataSources']['retrieve']>>,
  NotionAPIDataSource
>;

export type NotionAPIDataSourceFilter = NonNullable<
  Parameters<Client['dataSources']['query']>[0]['filter']
>;

export type NotionAPIDataSourceSort = NonNullable<
  Parameters<Client['dataSources']['query']>[0]['sorts']
>[number];

// PAGE //

export type NotionAPIPage = Extract<
  Awaited<ReturnType<Client['pages']['retrieve']>>,
  { url: string }
>;

export type InaccessibleNotionAPIPage = Exclude<
  Awaited<ReturnType<Client['pages']['retrieve']>>,
  NotionAPIPage
>;

// FILE //

export type NotionAPIFile =
  | {
      type?: 'external';
      external: {
        url: string;
      };
    }
  | {
      type?: 'file';
      file: {
        url: string;
      };
    };

// LIST //

export type NotionAPIEntity =
  | InaccessibleNotionAPIBlock
  | InaccessibleNotionAPIDatabase
  | InaccessibleNotionAPIDataSource
  | InaccessibleNotionAPIPage
  | NotionAPIBlock
  | NotionAPIDatabase
  | NotionAPIDataSource
  | NotionAPIPage
  | NotionAPIUser;

/**
 * paginated list response from Notion API
 * @template E entity type contained in results
 */
export interface NotionAPIList<E extends NotionAPIEntity = NotionAPIEntity> {
  /* eslint-disable @typescript-eslint/naming-convention -- matches Notion API schema */
  object: 'list';
  results: E[];
  has_more: boolean;
  next_cursor: string | null;
  /* eslint-enable @typescript-eslint/naming-convention */
}
