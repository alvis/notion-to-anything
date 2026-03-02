import { createBlockTransformer } from './create-block-transformer';
import { escapeYaml } from './escape-yaml';
import {
  audio,
  bookmark,
  breadcrumb,
  bulletedListItem,
  callout,
  childDatabase,
  childPage,
  code,
  column,
  columnList,
  divider,
  embed,
  equation,
  fallback,
  file,
  heading1,
  heading2,
  heading3,
  image,
  linkPreview,
  linkToPage,
  numberedListItem,
  paragraph,
  pdf,
  quote,
  syncedBlock,
  table,
  tableOfContents,
  tableRow,
  template,
  toDo,
  toggle,
  unsupported,
  video,
} from './markdown/block';

import type { NotionTransformer } from '#types';

export type { NotionBlockTransformer as BlockTransformer } from '#types';

/**
 * markdown transformer that converts notion blocks to markdown with YAML frontmatter
 */
export const markdown = {
  block: createBlockTransformer({
    paragraph,
    heading1,
    heading2,
    heading3,
    bulletedListItem,
    numberedListItem,
    toDo,
    toggle,
    code,
    quote,
    callout,
    divider,
    breadcrumb,
    tableOfContents,
    image,
    video,
    audio,
    file,
    pdf,
    bookmark,
    embed,
    linkPreview,
    linkToPage,
    table,
    tableRow,
    columnList,
    column,
    childPage,
    childDatabase,
    template,
    syncedBlock,
    equation,
    unsupported,
    fallback,
  }),
  /**
   * transforms notion page to markdown with YAML frontmatter
   * @param blocks array of transformed block strings
   * @param page the notion page object containing metadata
   * @returns complete markdown document with frontmatter and content
   */
  page: (blocks, page) => {
    const markdownBlocks = blocks.join('\n');

    const meta = {
      title: page.title,
    };

    const frontmatter = Object.entries(meta)
      .map(([key, value]) => `${escapeYaml(key)}: ${escapeYaml(value)}`)
      .join('\n');

    return `---\n${frontmatter}\n---\n\n${markdownBlocks}\n`;
  },
} satisfies NotionTransformer<string, string>;
