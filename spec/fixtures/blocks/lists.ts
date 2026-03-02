import { defaultColor } from '../common';
import {
  createBulletedListItem,
  createNumberedListItem,
  createToDo,
  createTransformedBlock,
} from '../factories/block';
import { createPlainText } from '../factories/richtext';

// BASE LIST  //

/** base bulleted list item with minimal content for transformation testing */
export const bulletedListItem = createBulletedListItem({
  color: defaultColor,
  rich_text: [],
});

/** base numbered list item with minimal content for transformation testing */
export const numberedListItem = createNumberedListItem({
  color: defaultColor,
  rich_text: [],
});

/** base to-do item with minimal content for transformation testing */
export const todo = createToDo({
  color: defaultColor,
  rich_text: [],
  checked: false,
});

/** bulleted list item with transformed children for testing */
export const bulletedListItemWithChildrenTransformed = createTransformedBlock(
  bulletedListItem,
  [],
);

/** numbered list item with transformed children for testing */
export const numberedListItemWithChildrenTransformed = createTransformedBlock(
  numberedListItem,
  [],
);

/** to-do item with transformed children for testing */
export const todoWithChildrenTransformed = createTransformedBlock(todo, []);

// TO-DO ITEM VARIATIONS //

/** additional to-do item variations with different states and content */
export const toDoUnchecked = createToDo({
  rich_text: [createPlainText('Buy groceries')],
  checked: false,
  color: defaultColor,
});

export const toDoChecked = createToDo({
  rich_text: [createPlainText('Complete project')],
  checked: true,
  color: defaultColor,
});

export const toDoWithChildren = createToDo({
  rich_text: [createPlainText('Plan vacation')],
  checked: false,
  color: defaultColor,
});

export const toDoCheckedWithChildren = createToDo({
  rich_text: [createPlainText('Setup development environment')],
  checked: true,
  color: defaultColor,
});

export const toDoEmpty = createToDo({
  rich_text: [],
  checked: false,
  color: defaultColor,
});

export const toDoRichText = createToDo({
  rich_text: [
    createPlainText('Review '),
    createPlainText('important', { annotations: { bold: true } }),
    createPlainText(' document'),
  ],
  checked: false,
  color: defaultColor,
});

export const toDoNested = createToDo({
  rich_text: [createPlainText('Main task')],
  checked: false,
  color: defaultColor,
});
