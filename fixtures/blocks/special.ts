import { defaultColor } from '../common';
import {
  createBookmark,
  createBreadcrumb,
  createCallout,
  createChildDatabase,
  createChildPage,
  createCode,
  createColumn,
  createColumnList,
  createDivider,
  createEmbed,
  createEquation,
  createLinkPreview,
  createLinkToPage,
  createParagraph,
  createQuote,
  createSyncedBlock,
  createTableBlock,
  createTableOfContents,
  createTableRow,
  createTemplate,
  createToggle,
  createTransformedBlock,
  createUnsupported,
} from '../factories/block';
import { createPlainText } from '../factories/richtext';

/** empty text element for placeholder scenarios */
const emptyText = createPlainText('');

// CHILD PAGE AND DATABASE BLOCKS //

/** child page block for testing page references */
export const childPage = createChildPage({
  title: 'Child Page',
});

/** unsupported block for testing unknown block types */
export const unsupported = createUnsupported({});

/** unsupported blocks nested within a paragraph for hierarchy testing */
export const unsupportedIndented = createParagraph(
  { color: defaultColor, rich_text: [] },
  {
    has_children: true,
    children: [unsupported, unsupported, unsupported],
  },
);

// INTERACTIVE BLOCKS //

/** toggle block with collapsible content for interaction testing */
export const toggle = createToggle(
  {
    color: defaultColor,
    rich_text: [createPlainText('Toggle')],
  },
  {
    has_children: true,
    children: [
      createParagraph({
        color: defaultColor,
        rich_text: [createPlainText('Toggled Content')],
      }),
    ],
  },
);

/** paragraph with empty text for indented sections */
export const paragraphIndentedEmpty = createParagraph(
  {
    color: defaultColor,
    rich_text: [emptyText],
  },
  {
    has_children: true,
    children: [
      unsupported,
      createParagraph({
        color: defaultColor,
        rich_text: [emptyText],
      }),
    ],
  },
);
/** child database block for testing database references */
export const childDatabase = createChildDatabase({
  title: 'Database Title',
});

/** synced block for testing synchronized content */
export const syncedBlock = createSyncedBlock({
  synced_from: null,
});

/** link preview block for testing URL previews */
export const linkPreview = createLinkPreview({
  url: 'https://example.com',
});

/** table of contents block for testing document navigation */
export const tableOfContents = createTableOfContents({
  color: defaultColor,
});

/** child page block with transformed children */
export const childPageWithChildrenTransformed = createTransformedBlock(
  childPage,
  [],
);

/** child database block with transformed children */
export const childDatabaseWithChildrenTransformed = createTransformedBlock(
  childDatabase,
  [],
);

/** synced block with transformed children */
export const syncedBlockWithChildrenTransformed = createTransformedBlock(
  syncedBlock,
  [],
);

/** link preview block with transformed children */
export const linkPreviewWithChildrenTransformed = createTransformedBlock(
  linkPreview,
  [],
);

/** table of contents block with transformed children */
export const tableOfContentsWithChildrenTransformed = createTransformedBlock(
  tableOfContents,
  [],
);

/** toggle block with transformed children */
export const toggleWithChildrenTransformed = createTransformedBlock(toggle, [
  { id: 'child1', data: 'first' },
  { id: 'child2', data: 'second' },
  { id: 'child3', data: 'third' },
]);

/** unsupported block with transformed children */
export const unsupportedWithChildrenTransformed = createTransformedBlock(
  unsupported,
  [],
);

// CONTENT BLOCKS //

/** quote block for testing blockquote content */
export const quote = createQuote({
  color: defaultColor,
  rich_text: [createPlainText('This is a quote')],
});

/** callout block for testing highlighted information */
export const callout = createCallout({
  color: 'gray_background',
  icon: { type: 'emoji', emoji: '💡' },
  rich_text: [createPlainText('This is a callout')],
});

/** code block for testing syntax highlighting */
export const code = createCode({
  caption: [],
  rich_text: [createPlainText('console.log("Hello World");')],
  language: 'javascript',
});

/** equation block for testing mathematical expressions */
export const equation = createEquation({
  expression: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
});

/** link to page block for testing page links */
export const linkToPagePage = createLinkToPage({
  type: 'page_id',
  page_id: '61cca5bd-c8c6-4fcc-b517-514da3b8b1e0',
});

/** link to database block for testing database links */
export const linkToPageDatabase = createLinkToPage({
  type: 'database_id',
  database_id: 'f336d0bc-b841-465b-8045-024475c079dd',
});

/** divider block for testing content separation */
export const divider = createDivider();

/** breadcrumb block for testing navigation paths */
export const breadcrumb = createBreadcrumb();

// TEMPLATE AND LAYOUT BLOCKS //

/** template block for testing content templates */
export const template = createTemplate(
  {
    rich_text: [createPlainText('Template Title')],
  },
  {
    has_children: true,
    children: [
      createParagraph({
        color: defaultColor,
        rich_text: [createPlainText('Template content')],
      }),
    ],
  },
);

/** column list block for testing multi-column layouts */
export const columnList = createColumnList(
  {},
  {
    has_children: true,
    children: [createColumn({}), createColumn({})],
  },
);

/** column block for layout testing */
export const column = createColumn({});

/** table block for testing tabular data */
export const table = createTableBlock(
  {
    table_width: 2,
    has_column_header: true,
    has_row_header: false,
  },
  {
    has_children: true,
    children: [
      createTableRow({
        cells: [[createPlainText('Header 1')], [createPlainText('Header 2')]],
      }),
      createTableRow({
        cells: [[createPlainText('Cell 1')], [createPlainText('Cell 2')]],
      }),
    ],
  },
);

/** table row block for testing table content */
export const tableRow = createTableRow({
  cells: [[createPlainText('Cell 1')], [createPlainText('Cell 2')]],
});

/** bookmark block for testing URL bookmarks */
export const bookmark = createBookmark({
  caption: [createPlainText('Bookmark caption')],
  url: 'https://example.com',
});

/** embed block for testing embedded content */
export const embed = createEmbed({
  caption: [createPlainText('Embed caption')],
  url: 'https://example.com/embed',
});

// TRANSFORMED CHILDREN VARIANTS //

/** special blocks with transformed children for testing purposes */
export const quoteWithChildrenTransformed = createTransformedBlock(quote, []);

/** callout block with transformed children */
export const calloutWithChildrenTransformed = createTransformedBlock(
  callout,
  [],
);

/** code block with transformed children */
export const codeWithChildrenTransformed = createTransformedBlock(code, []);

/** equation block with transformed children */
export const equationWithChildrenTransformed = createTransformedBlock(
  equation,
  [],
);

/** link to page block with transformed children */
export const linkToPagePageWithChildrenTransformed = createTransformedBlock(
  linkToPagePage,
  [],
);

/** link to database block with transformed children */
export const linkToPageDatabaseWithChildrenTransformed = createTransformedBlock(
  linkToPageDatabase,
  [],
);

/** divider block with transformed children */
export const dividerWithChildrenTransformed = createTransformedBlock(
  divider,
  [],
);

/** breadcrumb block with transformed children */
export const breadcrumbWithChildrenTransformed = createTransformedBlock(
  breadcrumb,
  [],
);

/** template block with transformed children */
export const templateWithChildrenTransformed = createTransformedBlock(
  template,
  ['child1', 'child2'],
);

/** embed block with transformed children */
export const embedWithChildrenTransformed = createTransformedBlock(embed, []);

// EXTENDED BLOCK VARIATIONS //

/** additional bookmark variations with different configurations */
export const bookmarkWithCaption = createBookmark({
  url: 'https://example.com',
  caption: [createPlainText('Example Site')],
});

/** bookmark block without caption text */
export const bookmarkWithoutCaption = createBookmark({
  url: 'https://example.com',
  caption: [],
});

/** simple quote block */
export const quoteSimple = createQuote({
  rich_text: [createPlainText('This is a quote')],
  color: defaultColor,
});

/** quote block with children content */
export const quoteWithChildren = createQuote({
  rich_text: [createPlainText('Main quote text')],
  color: defaultColor,
});

/** empty quote block with no content */
export const quoteEmpty = createQuote({
  rich_text: [],
  color: defaultColor,
});

/** quote block with multiline text */
export const quoteMultiline = createQuote({
  rich_text: [createPlainText('Line one\nLine two\nLine three')],
  color: defaultColor,
});

/** callout block with emoji icon */
export const calloutWithEmoji = createCallout({
  rich_text: [createPlainText('Important information')],
  icon: {
    type: 'emoji',
    emoji: '⚠️',
  },
  color: defaultColor,
});

/** callout block without icon */
export const calloutWithoutIcon = createCallout({
  rich_text: [createPlainText('General information')],
  icon: null,
  color: defaultColor,
});

/** callout block with file icon */
export const calloutWithFileIcon = createCallout({
  rich_text: [createPlainText('File information')],
  icon: {
    type: 'file',
    file: { url: 'icon.png', expiry_time: '2024-01-01T00:00:00.000Z' },
  },
  color: defaultColor,
});

/** callout block with children content */
export const calloutWithChildren = createCallout({
  rich_text: [createPlainText('Main callout text')],
  icon: {
    type: 'emoji',
    emoji: '📝',
  },
  color: defaultColor,
});

/** empty callout block with icon */
export const calloutEmpty = createCallout({
  rich_text: [],
  icon: {
    type: 'emoji',
    emoji: '🔔',
  },
  color: defaultColor,
});

/** simple callout block with basic content */
export const calloutSimple = createCallout({
  rich_text: [createPlainText('Simple callout')],
  icon: {
    type: 'emoji',
    emoji: '✨',
  },
  color: defaultColor,
});

/** template block with children content */
export const templateWithChildren = createTemplate(
  {
    rich_text: [createPlainText('Template Name')],
  },
  {
    has_children: true,
    children: [
      createParagraph({
        color: defaultColor,
        rich_text: [createPlainText('Template content')],
      }),
    ],
  },
);

/** template block without children */
export const templateWithoutChildren = createTemplate(
  {
    rich_text: [createPlainText('Empty Template')],
  },
  { has_children: false },
);
