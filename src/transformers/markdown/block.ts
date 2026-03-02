import { texts } from './text';

import type { NotionBlockTransformer } from '#types';

// per-block helper transformers

export const paragraph: NotionBlockTransformer<string, 'paragraph'> = (
  block,
) => {
  const content = texts(block.paragraph.rich_text);
  const children = indent(block.children.join('\n\n'), '  ');

  return block.children.length ? `${content}\n\n${children}` : content;
};

export const heading1: NotionBlockTransformer<string, 'heading_1'> = (block) =>
  `# ${texts(block.heading_1.rich_text)}`;

export const heading2: NotionBlockTransformer<string, 'heading_2'> = (block) =>
  `## ${texts(block.heading_2.rich_text)}`;

export const heading3: NotionBlockTransformer<string, 'heading_3'> = (block) =>
  `### ${texts(block.heading_3.rich_text)}`;

export const bulletedListItem: NotionBlockTransformer<
  string,
  'bulleted_list_item'
> = (block) => {
  const content = texts(block.bulleted_list_item.rich_text);
  const baseItem = `- ${content}`;
  const children = indent(block.children.join('\n'), '  ');

  return children ? `${baseItem}\n${children}` : baseItem;
};

export const numberedListItem: NotionBlockTransformer<
  string,
  'numbered_list_item'
> = (block) => {
  const content = texts(block.numbered_list_item.rich_text);
  const baseItem = `1. ${content}`;
  const children = indent(block.children.join('\n'), '  ');

  return children ? `${baseItem}\n${children}` : baseItem;
};

export const toDo: NotionBlockTransformer<string, 'to_do'> = (block) => {
  const content = texts(block.to_do.rich_text);
  const baseItem = `- [${block.to_do.checked ? 'x' : ' '}] ${content}`;
  const children = indent(block.children.join('\n'), '  ');

  return children ? `${baseItem}\n${children}` : baseItem;
};

/**
 * indents each line of the given text with the specified indentation string
 * @param lines the text lines to indent
 * @param indent the string used for indentation
 * @returns indented text with trailing whitespace trimmed
 */
function indent(lines: string, indent: string): string {
  return lines
    .split('\n')
    .map((line) => `${indent}${line}`.trimEnd())
    .join('\n');
}

export const toggle: NotionBlockTransformer<string, 'toggle'> = (block) => {
  const content = texts(block.toggle.rich_text);
  const children =
    block.children.length > 0 ? '\n\n  ' + block.children.join('\n  ') : '';

  return `${content}${children}`;
};

export const code: NotionBlockTransformer<string, 'code'> = (block) => {
  const content = texts(block.code.rich_text);
  const language = block.code.language;

  return `\`\`\`${language}\n${content}\n\`\`\``;
};

export const quote: NotionBlockTransformer<string, 'quote'> = (block) => {
  const content = texts(block.quote.rich_text);
  const fullContent =
    block.children.length > 0
      ? `${content}\n${block.children.join('\n')}`
      : content;

  return fullContent
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
};

export const callout: NotionBlockTransformer<string, 'callout'> = (block) => {
  const icon =
    block.callout.icon?.type === 'emoji' ? block.callout.icon.emoji : '💡';
  const content = texts(block.callout.rich_text);
  const children =
    block.children.length > 0 ? '\n> ' + block.children.join('\n> ') : '';

  return `> ${icon} ${content}${children}`;
};

export const divider: NotionBlockTransformer<string, 'divider'> = () => '---';

export const breadcrumb: NotionBlockTransformer<string, 'breadcrumb'> = () =>
  '';

export const tableOfContents: NotionBlockTransformer<
  string,
  'table_of_contents'
> = () => '[TOC]';

export const image: NotionBlockTransformer<string, 'image'> = (block) => {
  const caption = texts(block.image.caption);
  const url =
    block.image.type === 'external'
      ? block.image.external.url
      : block.image.file.url;

  return `![${caption}](${url})`;
};

export const video: NotionBlockTransformer<string, 'video'> = (block) => {
  const url =
    block.video.type === 'external'
      ? block.video.external.url
      : block.video.file.url;
  const caption = texts(block.video.caption);

  return `[${caption || 'Video'}](${url})`;
};

export const file: NotionBlockTransformer<string, 'file'> = (block) => {
  const url =
    block.file.type === 'external'
      ? block.file.external.url
      : block.file.file.url;
  const caption = texts(block.file.caption);
  const name = block.file.name || caption || 'File';

  return `[${name}](${url})`;
};

export const pdf: NotionBlockTransformer<string, 'pdf'> = (block) => {
  const url =
    block.pdf.type === 'external' ? block.pdf.external.url : block.pdf.file.url;
  const caption = texts(block.pdf.caption);

  return `[${caption || 'PDF'}](${url})`;
};

export const bookmark: NotionBlockTransformer<string, 'bookmark'> = (block) => {
  const caption = texts(block.bookmark.caption);

  return `[${caption || 'Bookmark'}](${block.bookmark.url})`;
};

export const embed: NotionBlockTransformer<string, 'embed'> = (block) => {
  const caption = texts(block.embed.caption);

  return `[${caption || 'Embed'}](${block.embed.url})`;
};

export const linkPreview: NotionBlockTransformer<string, 'link_preview'> = (
  block,
) => `[Link Preview](${block.link_preview.url})`;

export const table: NotionBlockTransformer<string, 'table'> = (block) => {
  const children = block.children.join('\n');

  return children;
};

export const tableRow: NotionBlockTransformer<string, 'table_row'> = (
  block,
) => {
  const cells = block.table_row.cells.map((cell) => texts(cell));

  return `| ${cells.join(' | ')} |`;
};

export const columnList: NotionBlockTransformer<string, 'column_list'> = (
  block,
) => block.children.join('\n\n');

export const column: NotionBlockTransformer<string, 'column'> = (block) =>
  block.children.join('\n');

export const childPage: NotionBlockTransformer<string, 'child_page'> = () =>
  null;

export const childDatabase: NotionBlockTransformer<
  string,
  'child_database'
> = () => null;

export const template: NotionBlockTransformer<string, 'template'> = (block) => {
  const content = texts(block.template.rich_text);
  const children =
    block.children.length > 0 ? `\n${block.children.join('\n')}` : '';

  return `Template: ${content}${children}`;
};

export const syncedBlock: NotionBlockTransformer<string, 'synced_block'> = (
  block,
) => block.children.join('\n');

export const unsupported: NotionBlockTransformer<string, 'unsupported'> = () =>
  null;

export const equation: NotionBlockTransformer<string, 'equation'> = (block) => {
  const expression = block.equation.expression;

  return `$$${expression}$$`;
};

export const audio: NotionBlockTransformer<string, 'audio'> = (block) => {
  const url =
    block.audio.type === 'external'
      ? block.audio.external.url
      : block.audio.file.url;
  const caption = texts(block.audio.caption);

  return `[${caption || 'Audio'}](${url})`;
};

export const linkToPage: NotionBlockTransformer<string, 'link_to_page'> = (
  block,
) => {
  const linkToPage = block.link_to_page;

  if (linkToPage.type === 'page_id') {
    return `[Page Link](page://${linkToPage.page_id})`;
  } else if (linkToPage.type === 'database_id') {
    return `[Database Link](database://${linkToPage.database_id})`;
  }

  return null;
};

export const transcription: NotionBlockTransformer<
  string,
  'transcription'
> = () => null;

export const fallback: NotionBlockTransformer<string> = () => null;
