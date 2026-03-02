import { getCommonPersonMetadata } from '#metadata';

import type { NotionPage } from '#page';

import type { NotionMetadata, NotionTransformer } from '#types';

/** JSON representation of a notion block with metadata and properties */
export interface JsonBlock extends Pick<
  NotionMetadata,
  | 'id'
  | `createdAt`
  | 'createdByAvatar'
  | 'createdByEmail'
  | 'createdByName'
  | 'lastEditedAt'
  | 'lastEditedByAvatar'
  | 'lastEditedByEmail'
  | 'lastEditedByName'
> {
  /** block type identifier */
  type: string;
  /** additional block properties indexed by type */
  [key: string]: unknown;
}

/** JSON representation of a notion page with metadata and transformed blocks */
export interface JsonPage extends NotionMetadata {
  /** page property definitions */
  properties: NotionPage['properties'];
  /** transformed block objects */
  blocks: JsonBlock[];
}

/**
 * JSON transformer that preserves the complete block structure
 * @param block the block to transform
 * @returns a standardized JSON representation of the block
 */
export const json = {
  block: (block) => {
    return {
      id: block.id,
      type: block.type,
      createdAt: block.created_time,
      ...getCommonPersonMetadata('createdBy', block.created_by),
      lastEditedAt: block.last_edited_time,
      ...getCommonPersonMetadata('lastEditedBy', block.last_edited_by),
      [block.type]: block[block.type],
      children: block.children,
    };
  },
  page: (blocks, page) => ({
    properties: page.properties,
    ...page.getMetadata(),
    blocks,
  }),
} satisfies NotionTransformer<JsonBlock, JsonPage>;
