import { describe, expect, it } from 'vitest';

import {
  bulletedListItem,
  numberedListItem,
  toDo,
  template,
} from '../src/block';

import {
  templateWithChildren,
  templateWithoutChildren,
  toDoChecked,
  toDoCheckedWithChildren,
  toDoEmpty,
  toDoNested,
  toDoRichText,
  toDoUnchecked,
  toDoWithChildren,
} from '../../../fixtures/blocks';
import { defaultBlockProperties } from '../../../fixtures/common';
import { createTransformedBlock } from '../../../fixtures/factories/block';
import { createPlainText } from '../../../fixtures/factories/richtext';

import type { NotionBlockWithTransformedChildren } from '@notion-to-anything/core';

describe('List Blocks', () => {
  describe('fn:numberedListItem', () => {
    it('should transform numbered list item without children', () => {
      const listItemBlock = {
        ...defaultBlockProperties,
        id: 'numbered-1',
        type: 'numbered_list_item' as const,
        has_children: false,
        numbered_list_item: {
          rich_text: [createPlainText('First item')],
          color: 'default' as const,
        },
        children: [],
      } satisfies NotionBlockWithTransformedChildren<string>;

      const result = numberedListItem(listItemBlock);
      expect(result).toBe('1. First item');
    });

    it('should transform numbered list item with children', () => {
      const listItemBlock = {
        ...defaultBlockProperties,
        id: 'numbered-2',
        type: 'numbered_list_item' as const,
        has_children: true,
        numbered_list_item: {
          rich_text: [createPlainText('Parent item')],
          color: 'default' as const,
        },
        children: ['Child item 1', 'Child item 2'],
      } satisfies NotionBlockWithTransformedChildren<string>;

      const result = numberedListItem(listItemBlock);
      expect(result).toBe('1. Parent item\n  Child item 1\n  Child item 2');
    });
  });

  describe('fn:bulletedListItem', () => {
    it('should transform bulleted list item without children', () => {
      const listItemBlock = {
        ...defaultBlockProperties,
        id: 'bulleted-1',
        type: 'bulleted_list_item' as const,
        has_children: false,
        bulleted_list_item: {
          rich_text: [createPlainText('Bullet point')],
          color: 'default' as const,
        },
        children: [],
      } satisfies NotionBlockWithTransformedChildren<string>;

      const result = bulletedListItem(listItemBlock);
      expect(result).toBe('- Bullet point');
    });

    it('should transform bulleted list item with children', () => {
      const listItemBlock = {
        ...defaultBlockProperties,
        id: 'bulleted-2',
        type: 'bulleted_list_item' as const,
        has_children: true,
        bulleted_list_item: {
          rich_text: [createPlainText('Main bullet')],
          color: 'default' as const,
        },
        children: ['Nested content 1', 'Nested content 2', 'Nested content 3'],
      } satisfies NotionBlockWithTransformedChildren<string>;

      const result = bulletedListItem(listItemBlock);
      expect(result).toBe(
        '- Main bullet\n  Nested content 1\n  Nested content 2\n  Nested content 3',
      );
    });
  });

  describe('fn:toDo', () => {
    it.each([
      {
        name: 'unchecked todo item',
        stub: toDoUnchecked,
        expected: '- [ ] Buy groceries',
      },
      {
        name: 'checked todo item',
        stub: toDoChecked,
        expected: '- [x] Complete project',
      },
      {
        name: 'todo item with empty content',
        stub: toDoEmpty,
        expected: '- [ ] ',
      },
      {
        name: 'todo item with rich text formatting',
        stub: toDoRichText,
        expected: '- [ ] Review **important** document',
      },
    ])('should transform $name', ({ stub, expected }) => {
      const result = toDo(createTransformedBlock(stub));
      expect(result).toBe(expected);
    });

    it.each([
      {
        name: 'unchecked todo with children',
        stub: toDoWithChildren,
        children: ['Book flights', 'Reserve hotel', 'Create itinerary'],
        expected:
          '- [ ] Plan vacation\n  Book flights\n  Reserve hotel\n  Create itinerary',
      },
      {
        name: 'checked todo with children',
        stub: toDoCheckedWithChildren,
        children: [
          'Install Node.js',
          'Clone repository',
          'Install dependencies',
        ],
        expected:
          '- [x] Setup development environment\n  Install Node.js\n  Clone repository\n  Install dependencies',
      },
      {
        name: 'todo with nested indentation',
        stub: toDoNested,
        children: ['Subtask 1\nWith multiple lines', 'Subtask 2'],
        expected:
          '- [ ] Main task\n  Subtask 1\n  With multiple lines\n  Subtask 2',
      },
    ])('should transform $name', ({ stub, children, expected }) => {
      const result = toDo(createTransformedBlock(stub, children));
      expect(result).toBe(expected);
    });
  });

  describe('fn:template', () => {
    it.each([
      {
        name: 'template with children',
        stub: templateWithChildren,
        children: ['Child 1', 'Child 2'],
        expected: 'Template: Template Name\nChild 1\nChild 2',
      },
      {
        name: 'template without children',
        stub: templateWithoutChildren,
        children: undefined,
        expected: 'Template: Empty Template',
      },
    ])('should transform $name', ({ stub, children, expected }) => {
      const block: NotionBlockWithTransformedChildren<string> = children
        ? createTransformedBlock(stub, children)
        : createTransformedBlock(stub);
      const result = template(block);
      expect(result).toBe(expected);
    });
  });
});
