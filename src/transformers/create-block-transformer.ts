import type { NotionBlockTransformer, BlockTransformerMap } from '#types';

/**
 * creates a block transformer from a type-handler map
 * @param transformerByType the object transformer with type-specific handlers
 * @returns a function transformer that handles all block types
 */
export function createBlockTransformer<B>(
  transformerByType: BlockTransformerMap<B>,
): NotionBlockTransformer<B> {
  return (block) => {
    // convert snake_case to camelCase for cleaner field names
    const snakeCaseType = block.type;
    const camelCaseType = snakeCaseType.replace(
      /_([a-z0-9])/g,
      (_, char: string) => char.toUpperCase(),
    );

    // try camelCase first, then snake_case, then default
    const handler = (transformerByType[
      camelCaseType as keyof typeof transformerByType
    ] ?? transformerByType.fallback) as NotionBlockTransformer<B>;

    return handler(block);
  };
}
