import { NotionAnythingError } from '#errors';
import { isPropertyAccessible, isPropertySupported } from '#property';
import { mapWithConcurrency, resolveConcurrency, take } from '#request';

import type { Client } from '@notionhq/client';

import type { PaginatedRequestMeta } from '#request';
import type { NotionBlock, NotionTransformer } from '#types';

/** options for block traversal and recursive transformation */
export interface BlockTraversalOptions {
  /** maximum number of concurrent recursive tasks */
  concurrency?: number;
  /** optional abort signal to cancel traversal */
  signal?: AbortSignal;
  /** optional hook invoked once per paginated request with structured context */
  onRequest?: (meta: PaginatedRequestMeta) => void;
}

/**
 * gets all blocks related to a collection
 * @param client the notion client
 * @param id the UUID of the collection, either a database, page, or parent block
 * @param options traversal options
 * @returns a list of blocks and all their children
 */
export async function getBlocks(
  client: Client,
  id: string,
  options?: BlockTraversalOptions,
): Promise<NotionBlock[]> {
  const concurrency = resolveConcurrency(options?.concurrency);
  throwIfAborted(options?.signal);
  const { entities: blocks } = await take(
    client.blocks.children.list,
    { block_id: id },
    { signal: options?.signal, onRequest: options?.onRequest },
  );

  // remove any blocks that cannot be read due to access restriction
  const filteredBlocks = blocks
    .filter(isPropertyAccessible)
    .filter(isPropertySupported);

  return mapWithConcurrency(
    filteredBlocks,
    async (block): Promise<NotionBlock> => {
      // child_page and child_database blocks are always reported with
      // has_children:true by the Notion API; descending into them would
      // eagerly download the entire descendant page/database tree inline.
      // keep the node itself (so downstream discovery still sees it) but do
      // not fetch its children — those pages/databases are pulled independently
      const shouldDescend =
        block.has_children &&
        block.type !== 'child_page' &&
        block.type !== 'child_database';

      if (shouldDescend) {
        return {
          ...block,
          has_children: true,
          children: await getBlocks(
            client,
            // NOTE: get the block children directly from the source instead of this block, otherwise a 404 error will be raised
            block.type === 'synced_block' && block.synced_block.synced_from
              ? block.synced_block.synced_from.block_id
              : block.id,
            {
              concurrency,
              signal: options?.signal,
              onRequest: options?.onRequest,
            },
          ),
        };
      }

      // for child_page / child_database the API reports has_children:true, but
      // their content is pulled independently, so they are surfaced with an
      // empty children list rather than being descended into here
      return block.has_children
        ? { ...block, has_children: true, children: [] }
        : { ...block, has_children: false };
    },
    concurrency,
    { signal: options?.signal },
  );
}

/**
 * creates a block transformer function that recursively transforms children
 * @param transformer the transformer configuration
 * @param options traversal options
 * @returns a function that transforms blocks recursively
 */
export function createChildrenBlockTransformer<B>(
  transformer: NotionTransformer<B>,
  options?: BlockTraversalOptions,
): (block: NotionBlock) => Promise<B | null> {
  const concurrency = resolveConcurrency(options?.concurrency);

  const transformBlock = async (block: NotionBlock): Promise<B | null> => {
    throwIfAborted(options?.signal);

    const children = (
      block.has_children
        ? await mapWithConcurrency(
            block.children,
            async (child) => transformBlock(child),
            concurrency,
            { signal: options?.signal },
          )
        : []
    ).filter((value) => value !== null);

    return transformer.block({
      ...block,
      children,
    });
  };

  return transformBlock;
}

/**
 * throws a {@link NotionAnythingError} when traversal was cancelled
 *
 * the underlying DOM-style abort error is preserved as the `cause`, and the
 * thrown error keeps the `AbortError` name so abort-aware callers continue to
 * recognise the cancellation
 * @param signal optional abort signal
 */
function throwIfAborted(signal: AbortSignal | undefined): void {
  if (!signal?.aborted) {
    return;
  }

  const cause = new Error('The operation was aborted');
  cause.name = 'AbortError';

  const error = new NotionAnythingError({
    code: 'OPERATION_ABORTED',
    message: 'The operation was aborted',
    cause,
  });
  error.name = 'AbortError';

  throw error;
}
