import { defaultColor } from '../common';
import { createParagraph, createTransformedBlock } from '../factories/block';
import { createPlainText } from '../factories/richtext';

// BASIC PARAGRAPH FIXTURES //

/** single-line paragraph with basic text content */
export const paragraphSingleline = createParagraph({
  color: defaultColor,
  rich_text: [createPlainText('Paragraph')],
});

/** multi-line paragraph with line breaks for testing text formatting */
export const paragraphMultiline = createParagraph({
  color: defaultColor,
  rich_text: [createPlainText('Multiline Paragraph\nLine 1\nLine 2')],
});

/** empty paragraph with no text content for edge case testing */
export const paragraphEmpty = createParagraph({
  color: defaultColor,
  rich_text: [],
});

/** nested paragraph with multiple levels of children for hierarchy testing */
export const paragraphIndented = createParagraph(
  {
    color: defaultColor,
    rich_text: [createPlainText('Indented Paragraph')],
  },
  {
    children: [
      createParagraph(
        {
          color: defaultColor,
          rich_text: [createPlainText('Level 1')],
        },
        {
          has_children: true,
          children: [
            createParagraph({
              color: defaultColor,
              rich_text: [createPlainText('Level 2')],
            }),
          ],
        },
      ),
    ],
  },
);

// BASE PARAGRAPH FOR TRANSFORMATION TESTING //

/** base paragraph with minimal content for transformation testing */
export const paragraph = createParagraph({
  color: defaultColor,
  rich_text: [],
});

/** paragraph with transformed children for testing purposes */
export const paragraphWithChildrenTransformed = createTransformedBlock(
  paragraph,
  [],
);
