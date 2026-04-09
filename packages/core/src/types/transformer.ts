import type { CamelCase, SnakeCase } from 'type-fest';

import type { NotionPage } from '#entities/page';

import type { NotionAPIBlock, NotionAPIPropertyValue } from './api';
import type { NotionBlock } from './normalization';

export type PropertyType = NotionAPIPropertyValue['type'];

/**
 * all Notion block types
 */
export type NotionBlockType = NotionAPIBlock['type'];

/**
 * extract block type from union
 */
export type NotionBlockWithTransformedChildren<
  B,
  K extends NotionBlockType = NotionBlockType,
> = {
  // type: K;
  children: B[];
} & (NotionBlock extends infer U
  ? U extends { type: K }
    ? Omit<U, 'children'>
    : never
  : never);

export type NotionBlockTransformer<
  B,
  K extends NotionBlockType = NotionBlockType,
> = (block: NotionBlockWithTransformedChildren<B, K>) => B | null;

/**
 * object transformer with type-specific handlers
 * supports both snake_case (from Notion API) and camelCase (for cleaner code) field names
 */
export type BlockTransformerMap<B = unknown> = {
  // snake case handlers (from Notion API)
  [K in CamelCase<NotionBlockType>]?: NotionBlockTransformer<
    B,
    SnakeCase<K, { splitOnNumbers: true }>
  >;
} & {
  fallback: NotionBlockTransformer<B>;
};

/**
 * transformer with block and page handlers for content transformation
 * @template B the type of transformed block content
 * @template P the type of transformed page content
 */
export interface NotionTransformer<B = unknown, P = unknown> {
  block(
    block: NotionBlockWithTransformedChildren<B>,
  ): B | Promise<B | null> | null;
  page(blocks: B[], page: NotionPage): P | Promise<P>;
}

/**
 * unified query options for all search methods
 */
export interface QueryOptions<F extends string = string> {
  /** natural language search query — only for workspace search methods */
  query?: string;
  /** Notion API structured filter — only for datasource queries */
  filter?: Record<string, unknown>;
  /** cursor for cursor-based pagination */
  cursor?: string;
  /** offset for offset-based pagination (emulated; ignored when cursor is set) */
  offset?: number;
  /** max number of records to return */
  limit?: number;
  /** sorting criteria */
  sorts?: Array<{ field: F; order: 'asc' | 'desc' }>;
  /** maximum number of concurrent enrichment tasks */
  concurrency?: number;
  /** optional abort signal to cancel the operation */
  signal?: AbortSignal;
}
