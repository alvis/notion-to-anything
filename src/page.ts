import { createChildrenBlockTransformer, getBlocks } from '#block';
import { mapWithConcurrency, resolveConcurrency } from '#concurrency';
import { NotionEntity } from '#entity';

import type { Client } from '@notionhq/client';

import type { BlockTraversalOptions } from '#block';
import type { EntityOptions } from '#entity';
import type {
  NotionAPIPage,
  NotionAPIPropertyValue,
  NotionTransformer,
} from '#types';

/** notion page with content transformation */
export class NotionPage extends NotionEntity {
  readonly #page: NotionAPIPage;

  /**
   * creates a page instance with the page object returned from the API
   * @param client the notion client
   * @param page the page object returned from the API
   * @param options optional configuration for the page entity
   */
  constructor(client: Client, page: NotionAPIPage, options?: EntityOptions) {
    super(client, page, options);

    this.#page = page;
  }

  /**
   * gets all properties of the page, excluding common metadata
   * @returns record of all page properties
   */
  public get properties(): Record<string, NotionAPIPropertyValue> {
    return this.#page.properties;
  }

  /** whether the page is archived */
  public get archived(): boolean {
    return this.#page.archived;
  }

  /** whether the page is locked */
  public get isLocked(): boolean {
    return this.#page.is_locked;
  }

  /**
   * transforms the page content using the provided transformer
   * @param transformer the transformer to use for content transformation
   * @param options traversal options
   * @returns the transformed content
   */
  public async to<B, P>(
    transformer: NotionTransformer<B, P>,
    options?: BlockTraversalOptions,
  ): Promise<P> {
    const concurrency = resolveConcurrency(
      options?.concurrency ?? this.concurrency,
    );
    const blocks = options
      ? await getBlocks(this.client, this.#page.id, options)
      : await getBlocks(this.client, this.#page.id);

    const transformChildrenBlocks = options
      ? createChildrenBlockTransformer(transformer, options)
      : createChildrenBlockTransformer(transformer);

    const transformedBlocks = (
      await mapWithConcurrency(
        blocks,
        async (block) => transformChildrenBlocks(block),
        concurrency,
        { signal: options?.signal },
      )
    ).filter((block) => block !== null);

    return transformer.page(transformedBlocks, this);
  }
}

/**
 * indicates if a database or page is accessible
 * @param page a database or page returned from Notion API
 * @returns whether the page is accessible
 */
export function isPageAccessible<
  P extends {
    id: string;
    object: string;
    url?: string;
  },
>(page: P): page is Extract<P, { url: string }> {
  return !!page.url;
}
