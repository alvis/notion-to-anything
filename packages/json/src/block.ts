import { getCommonPersonMetadata } from '@notion-to-anything/core';

import type { NotionMetadata, NotionBlockWithTransformedChildren } from '@notion-to-anything/core';

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

/**
 * JSON block transformer that preserves the complete block structure
 * @param block the block to transform
 * @returns a standardized JSON representation of the block
 */
export function block(block: NotionBlockWithTransformedChildren<JsonBlock>): JsonBlock {
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
}
