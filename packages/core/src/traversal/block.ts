import { mapWithConcurrency, resolveConcurrency } from '#traversal/concurrency';
import { isPropertyAccessible, isPropertySupported } from '#entities/property';
import { take } from '#traversal/take';

import type { Client } from '@notionhq/client';

import type { NotionBlock, NotionTransformer } from '#types/index';

/** options for block traversal and recursive transformation */
export interface BlockTraversalOptions {
  /** maximum number of concurrent recursive tasks */
  concurrency?: number;
  /** optional abort signal to cancel traversal */
  signal?: AbortSignal;
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
    { signal: options?.signal },
  );

  // remove any blocks that cannot be read due to access restriction
  const filteredBlocks = blocks
    .filter(isPropertyAccessible)
    .filter(isPropertySupported);

  return mapWithConcurrency(
    filteredBlocks,
    async (block): Promise<NotionBlock> => ({
      ...block,

      ...(block.has_children
        ? {
            has_children: true,
            children: await getBlocks(
              client,
              // NOTE: get the block children directly from the source instead of this block, otherwise a 404 error will be raised
              block.type === 'synced_block' && block.synced_block.synced_from
                ? block.synced_block.synced_from.block_id
                : block.id,
              { concurrency, signal: options?.signal },
            ),
          }
        : { has_children: false }),
    }),
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
 * throws when traversal was cancelled
 * @param signal optional abort signal
 */
function throwIfAborted(signal: AbortSignal | undefined): void {
  if (!signal?.aborted) {
    return;
  }

  const error = new Error('The operation was aborted');
  error.name = 'AbortError';

  throw error;
}
