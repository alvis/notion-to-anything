import { defaultBlockProperties } from '../common';

import type {
  NotionBlockType,
  NotionBlockWithTransformedChildren,
  NotionAPIBlockBase,
  NotionBlock,
} from '#types/index';

export function createTransformedBlock<K extends NotionBlockType, B>(
  block: NotionBlock<K>,
  children: B[] = [],
): NotionBlockWithTransformedChildren<B, K> {
  return { ...block, children } as NotionBlockWithTransformedChildren<B, K>;
}

/** common override options for all block types */
export interface BaseBlockOverrideOptions extends Partial<NotionAPIBlockBase> {
  /** array of child blocks */
  children?: NotionBlock[];
}

/**
 * gets base block properties with overrides
 * @param override properties to override
 * @internal
 */
function getBaseBlockProperties(
  override?: BaseBlockOverrideOptions,
): NotionAPIBlockBase & { children: NotionBlock[] } {
  return {
    ...defaultBlockProperties,
    children: [],
    ...override,
    has_children:
      override?.has_children ?? (override?.children?.length ?? 0) > 0,
  };
}

// TEXT-BASED BLOCK BUILDERS //

/**
 * creates a paragraph block
 * @param paragraph the paragraph block content to use
 * @param override optional override properties for the block
 */
export function createParagraph<O extends BaseBlockOverrideOptions = {}>(
  paragraph: NotionBlock<'paragraph'>['paragraph'],
  override?: O,
): NotionBlock<'paragraph'> & O {
  const base = getBaseBlockProperties(override);

  return {
    type: 'paragraph',
    ...base,
    paragraph,
  };
}

/**
 * creates a heading 1 block
 * @param heading_1 the heading 1 block content to use
 * @param override optional override properties for the block
 */
export function createHeading1(
  heading_1: NotionBlock<'heading_1'>['heading_1'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'heading_1'> {
  const base = getBaseBlockProperties(override);

  return {
    type: 'heading_1',
    ...base,
    heading_1,
  };
}

/**
 * creates a heading 2 block
 * @param heading_2 the heading 2 block content to use
 * @param override optional override properties for the block
 */
export function createHeading2(
  heading_2: NotionBlock<'heading_2'>['heading_2'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'heading_2'> {
  const base = getBaseBlockProperties(override);

  return {
    type: 'heading_2',
    ...base,
    heading_2,
  };
}

/**
 * creates a heading 3 block
 * @param heading_3 the heading 3 block content to use
 * @param override optional override properties for the block
 */
export function createHeading3(
  heading_3: NotionBlock<'heading_3'>['heading_3'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'heading_3'> {
  const base = getBaseBlockProperties(override);

  return {
    type: 'heading_3',
    ...base,
    heading_3,
  };
}

/**
 * creates a bulleted list item block
 * @param bulleted_list_item the bulleted list item block content to use
 * @param override optional override properties for the block
 */
export function createBulletedListItem(
  bulleted_list_item: NotionBlock<'bulleted_list_item'>['bulleted_list_item'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'bulleted_list_item'> {
  const base = getBaseBlockProperties(override);

  return {
    type: 'bulleted_list_item',
    ...base,
    bulleted_list_item,
  };
}

/**
 * creates a numbered list item block
 * @param numbered_list_item the numbered list item block content to use
 * @param override optional override properties for the block
 */
export function createNumberedListItem(
  numbered_list_item: NotionBlock<'numbered_list_item'>['numbered_list_item'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'numbered_list_item'> {
  const base = getBaseBlockProperties(override);

  return {
    type: 'numbered_list_item',
    ...base,
    numbered_list_item,
  };
}

/**
 * creates a quote block
 * @param quote the quote block content to use
 * @param override optional override properties for the block
 */
export function createQuote(
  quote: NotionBlock<'quote'>['quote'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'quote'> {
  const base = getBaseBlockProperties(override);

  return { type: 'quote', ...base, quote };
}

/**
 * creates a toggle block
 * @param toggle the toggle block content to use
 * @param override optional override properties for the block
 */
export function createToggle(
  toggle: NotionBlock<'toggle'>['toggle'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'toggle'> {
  const base = getBaseBlockProperties(override);

  return { type: 'toggle', ...base, toggle };
}

/**
 * creates a template block
 * @param template the template block content to use
 * @param override optional override properties for the block
 */
export function createTemplate(
  template: NotionBlock<'template'>['template'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'template'> {
  const base = getBaseBlockProperties(override);

  return {
    type: 'template',
    ...base,
    template,
  };
}

/**
 * creates a callout block
 * @param callout the callout block content to use
 * @param override optional override properties for the block
 */
export function createCallout(
  callout: NotionBlock<'callout'>['callout'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'callout'> {
  const base = getBaseBlockProperties(override);

  return { type: 'callout', ...base, callout };
}

/**
 * creates a to-do block
 * @param to_do the to-do block content to use
 * @param override optional override properties for the block
 */
export function createToDo(
  to_do: NotionBlock<'to_do'>['to_do'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'to_do'> {
  const base = getBaseBlockProperties(override);

  return { type: 'to_do', ...base, to_do };
}

// CODE AND EQUATION BLOCK BUILDERS //

/**
 * creates a code block
 * @param code the code block content to use
 * @param override optional override properties for the block
 */
export function createCode(
  code: NotionBlock<'code'>['code'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'code'> {
  const base = getBaseBlockProperties(override);

  return { type: 'code', ...base, code };
}

/**
 * creates an equation block
 * @param equation the equation block content to use
 * @param override optional override properties for the block
 */
export function createEquation(
  equation: NotionBlock<'equation'>['equation'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'equation'> {
  const base = getBaseBlockProperties(override);

  return {
    type: 'equation',
    ...base,
    equation,
  };
}

// STRUCTURAL BLOCK BUILDERS //

/**
 * creates a divider block
 * @param divider the divider block content to use
 * @param override optional override properties for the block
 */
export function createDivider(
  divider?: NotionBlock<'divider'>['divider'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'divider'> {
  const base = getBaseBlockProperties(override);

  return {
    type: 'divider',
    ...base,
    divider: divider ?? {},
  };
}

/**
 * creates a breadcrumb block
 * @param breadcrumb the breadcrumb block content to use
 * @param override optional override properties for the block
 */
export function createBreadcrumb(
  breadcrumb?: NotionBlock<'breadcrumb'>['breadcrumb'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'breadcrumb'> {
  const base = getBaseBlockProperties(override);

  return {
    type: 'breadcrumb',
    ...base,
    breadcrumb: breadcrumb ?? {},
  };
}

/**
 * creates a table of contents block
 * @param table_of_contents the table of contents block content to use
 * @param override optional override properties for the block
 */
export function createTableOfContents(
  table_of_contents: NotionBlock<'table_of_contents'>['table_of_contents'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'table_of_contents'> {
  const base = getBaseBlockProperties(override);

  return {
    type: 'table_of_contents',
    ...base,
    table_of_contents,
  };
}

/**
 * creates a column list block
 * @param column_list the column list block content to use
 * @param override optional override properties for the block
 */
export function createColumnList(
  column_list: NotionBlock<'column_list'>['column_list'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'column_list'> {
  const base = getBaseBlockProperties(override);

  return {
    type: 'column_list',
    ...base,
    column_list,
  };
}

/**
 * creates a column block
 * @param column the column block content to use
 * @param override optional override properties for the block
 */
export function createColumn(
  column: NotionBlock<'column'>['column'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'column'> {
  const base = getBaseBlockProperties(override);

  return { type: 'column', column, ...base };
}

// MEDIA AND EMBED BLOCK BUILDERS //

/**
 * creates a link preview block
 * @param link_preview the link preview block content to use
 * @param override optional override properties for the block
 */
export function createLinkPreview(
  link_preview: NotionBlock<'link_preview'>['link_preview'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'link_preview'> {
  const base = getBaseBlockProperties(override);

  return {
    type: 'link_preview',
    ...base,
    link_preview,
  };
}

/**
 * creates a bookmark block
 * @param bookmark the bookmark block content to use
 * @param override optional override properties for the block
 */
export function createBookmark(
  bookmark: NotionBlock<'bookmark'>['bookmark'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'bookmark'> {
  const base = getBaseBlockProperties(override);

  return {
    type: 'bookmark',
    ...base,
    bookmark,
  };
}

/**
 * creates an embed block
 * @param embed the embed block content to use
 * @param override optional override properties for the block
 */
export function createEmbed(
  embed: NotionBlock<'embed'>['embed'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'embed'> {
  const base = getBaseBlockProperties(override);

  return { type: 'embed', ...base, embed };
}

/**
 * creates an image block
 * @param image the image block content
 * @param override optional override properties
 * @returns an image block
 */
export function createImage(
  image: NotionBlock<'image'>['image'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'image'> {
  const base = getBaseBlockProperties(override);

  return { type: 'image', ...base, image };
}

/**
 * creates a video block
 * @param video the video block content
 * @param override optional override properties
 * @returns a video block
 */
export function createVideo(
  video: NotionBlock<'video'>['video'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'video'> {
  const base = getBaseBlockProperties(override);

  return { type: 'video', ...base, video };
}

/**
 * creates a file block
 * @param file the file block content
 * @param override optional override properties
 * @returns a file block
 */
export function createFile(
  file: NotionBlock<'file'>['file'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'file'> {
  const base = getBaseBlockProperties(override);

  return { type: 'file', ...base, file };
}

/**
 * creates a PDF block
 * @param pdf the pdf block content
 * @param override optional override properties
 * @returns a pdf block
 */
export function createPdf(
  pdf: NotionBlock<'pdf'>['pdf'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'pdf'> {
  const base = getBaseBlockProperties(override);

  return { type: 'pdf', ...base, pdf };
}

/**
 * creates an audio block
 * @param audio the audio block content
 * @param override optional override properties
 * @returns an audio block
 */
export function createAudio(
  audio: NotionBlock<'audio'>['audio'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'audio'> {
  const base = getBaseBlockProperties(override);

  return { type: 'audio', ...base, audio };
}

// SPECIAL BLOCK BUILDERS //

/**
 * creates a synced block
 * @param synced_block the synced_block content
 * @param override optional override properties
 * @returns a synced_block
 */
export function createSyncedBlock(
  synced_block: NotionBlock<'synced_block'>['synced_block'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'synced_block'> {
  const base = getBaseBlockProperties(override);

  return {
    type: 'synced_block',
    ...base,
    synced_block,
  };
}

/**
 * creates a table row block
 * @param table_row the table_row block content
 * @param override optional override properties
 * @returns a table_row block
 */
export function createTableRow(
  table_row: NotionBlock<'table_row'>['table_row'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'table_row'> {
  const base = getBaseBlockProperties(override);

  return {
    type: 'table_row',
    ...base,
    table_row,
  };
}

/**
 * creates a table block
 * @param table the table block content
 * @param override optional override properties
 * @returns a table block
 */
export function createTableBlock(
  table: NotionBlock<'table'>['table'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'table'> {
  const base = getBaseBlockProperties(override);

  return { type: 'table', ...base, table };
}

/**
 * creates a child page block
 * @param child_page the child_page block content
 * @param override optional override properties
 * @returns a child_page block
 */
export function createChildPage(
  child_page: NotionBlock<'child_page'>['child_page'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'child_page'> {
  const base = getBaseBlockProperties(override);

  return {
    type: 'child_page',
    ...base,
    child_page,
  };
}

/**
 * creates a child database block
 * @param child_database the child_database block content
 * @param override optional override properties
 * @returns a child_database block
 */
export function createChildDatabase(
  child_database: NotionBlock<'child_database'>['child_database'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'child_database'> {
  const base = getBaseBlockProperties(override);

  return {
    type: 'child_database',
    ...base,
    child_database,
  };
}

/**
 * creates an unsupported block
 * @param unsupported the unsupported block content (empty object)
 * @param override optional override properties
 * @returns an unsupported block
 */
export function createUnsupported(
  unsupported?: NotionBlock<'unsupported'>['unsupported'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'unsupported'> {
  const base = getBaseBlockProperties(override);

  return {
    type: 'unsupported',
    ...base,
    unsupported: unsupported ?? {},
  };
}

/**
 * creates a link to page block
 * @param linkToPage the link to page block content
 * @param override optional override properties
 * @returns a link to page block
 */
export function createLinkToPage(
  linkToPage: NotionBlock<'link_to_page'>['link_to_page'],
  override?: BaseBlockOverrideOptions,
): NotionBlock<'link_to_page'> {
  const base = getBaseBlockProperties(override);

  return {
    type: 'link_to_page',
    ...base,
    link_to_page: linkToPage,
  };
}
