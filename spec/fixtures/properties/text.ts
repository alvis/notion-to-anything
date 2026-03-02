import {
  createRichTextProperty,
  createTitleProperty,
} from '../factories/property';

import type { NormalizedValue, NotionAPIRichText } from '#types';

/** text property fixtures for title and rich text content */

// rich text components //

/** sample rich text element with all formatting annotations enabled */
export const text = {
  type: 'text',
  text: {
    content: 'Text',
    link: null,
  },
  annotations: {
    bold: true,
    italic: true,
    strikethrough: true,
    underline: true,
    code: true,
    color: 'default',
  },
  plain_text: 'Text',
  href: null,
} satisfies NotionAPIRichText;

// title properties //

/** sample title property using plain text factory */
export const titleProperty = createTitleProperty();

/** expected normalized content for title property */
export const titleContent = 'Title' satisfies NormalizedValue;

// rich text properties //

/** sample rich text property with formatted text element */
export const richTextProperty = createRichTextProperty();

/** expected normalized content for rich text property */
export const richTextContent = 'Text' satisfies NormalizedValue;
