import {
  createHeading1,
  createHeading2,
  createHeading3,
  createTransformedBlock,
} from '../factories/block';
import { createPlainText } from '../factories/richtext';

import type { NotionBlock } from '#types/index';

// HEADER BLOCKS //

/** basic heading 1 block with default styling */
export const header1 = createHeading1({
  is_toggleable: false,
  color: 'default',
  rich_text: [createPlainText('Header 1')],
}) satisfies NotionBlock<'heading_1'>;

/** basic heading 2 block with default styling */
export const header2 = createHeading2({
  is_toggleable: false,
  color: 'default',
  rich_text: [createPlainText('Header 2')],
}) satisfies NotionBlock<'heading_2'>;

/** basic heading 3 block with default styling */
export const header3 = createHeading3({
  is_toggleable: false,
  color: 'default',
  rich_text: [createPlainText('Header 3')],
}) satisfies NotionBlock<'heading_3'>;

// TRANSFORMED CHILDREN VARIANTS //

/** heading 1 block with transformed children for testing purposes */
export const heading1WithChildrenTransformed = createTransformedBlock(
  header1,
  [],
);

/** heading 2 block with transformed children for testing purposes */
export const heading2WithChildrenTransformed = createTransformedBlock(
  header2,
  [],
);

/** heading 3 block with transformed children for testing purposes */
export const heading3WithChildrenTransformed = createTransformedBlock(
  header3,
  [],
);
