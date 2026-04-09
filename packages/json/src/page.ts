import { block } from './block';

import type { JsonBlock } from './block';
import type { NotionPage, NotionMetadata, NotionTransformer } from '@notion-to-anything/core';

/** JSON representation of a notion page with metadata and transformed blocks */
export interface JsonPage extends NotionMetadata {
  /** page property definitions */
  properties: NotionPage['properties'];
  /** transformed block objects */
  blocks: JsonBlock[];
}

/**
 * JSON transformer that preserves the complete block structure
 */
export const json = {
  block,
  page: (blocks, page) => ({
    properties: page.properties,
    ...page.getMetadata(),
    blocks,
  }),
} satisfies NotionTransformer<JsonBlock, JsonPage>;
