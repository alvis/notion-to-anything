import { describe, expect, it } from 'vitest';

import {
  callout,
  heading1,
  heading2,
  heading3,
  paragraph,
  quote,
  toggle,
} from '#transformers/markdown/block';

import * as stubs from '../../fixtures/blocks';
import { defaultBlockProperties } from '../../fixtures/common';
import { createTransformedBlock } from '../../fixtures/factories/block';
import { createPlainText } from '../../fixtures/factories/richtext';

import type { NotionBlockWithTransformedChildren } from '#types';

describe('Text Content Blocks', () => {
  describe('fn:paragraph', () => {
    it('should transform paragraph without children', () => {
      const paragraphBlock = {
        ...defaultBlockProperties,
        id: 'paragraph-1',
        type: 'paragraph' as const,
        has_children: false,
        paragraph: {
          rich_text: [createPlainText('Simple paragraph text')],
          color: 'default' as const,
        },
        children: [],
      } satisfies NotionBlockWithTransformedChildren<string>;

      const result = paragraph(paragraphBlock);
      expect(result).toBe('Simple paragraph text');
    });

    it('should transform paragraph with children', () => {
      const paragraphBlock = {
        ...defaultBlockProperties,
        id: 'paragraph-2',
        type: 'paragraph' as const,
        has_children: true,
        paragraph: {
          rich_text: [createPlainText('Parent paragraph')],
          color: 'default' as const,
        },
        children: ['Child content 1', 'Child content 2'],
      } satisfies NotionBlockWithTransformedChildren<string>;

      const result = paragraph(paragraphBlock);
      expect(result).toBe(
        'Parent paragraph\n\n  Child content 1\n\n  Child content 2',
      );
    });

    it('should transform paragraph with empty text and children', () => {
      const paragraphBlock = {
        ...defaultBlockProperties,
        id: 'paragraph-3',
        type: 'paragraph' as const,
        has_children: true,
        paragraph: {
          rich_text: [],
          color: 'default' as const,
        },
        children: ['Only child content'],
      } satisfies NotionBlockWithTransformedChildren<string>;

      const result = paragraph(paragraphBlock);
      expect(result).toBe('\n\n  Only child content');
    });

    it('should transform paragraph with rich text and multiple children', () => {
      const paragraphBlock = {
        ...defaultBlockProperties,
        id: 'paragraph-4',
        type: 'paragraph' as const,
        has_children: true,
        paragraph: {
          rich_text: [
            createPlainText('Bold'),
            createPlainText(' Text', { annotations: { bold: true } }),
          ],
          color: 'default' as const,
        },
        children: [
          'First nested paragraph',
          'Second nested paragraph',
          'Third nested paragraph',
        ],
      } satisfies NotionBlockWithTransformedChildren<string>;

      const result = paragraph(paragraphBlock);
      expect(result).toBe(
        'Bold** Text**\n\n  First nested paragraph\n\n  Second nested paragraph\n\n  Third nested paragraph',
      );
    });
  });

  describe('fn:heading1', () => {
    it('should transform heading 1 with simple text', () => {
      const heading1Block = {
        ...defaultBlockProperties,
        id: 'heading1-1',
        type: 'heading_1' as const,
        has_children: false,
        heading_1: {
          rich_text: [createPlainText('Main Title')],
          is_toggleable: false,
          color: 'default' as const,
        },
        children: [],
      } satisfies NotionBlockWithTransformedChildren<string>;

      const result = heading1(heading1Block);
      expect(result).toBe('# Main Title');
    });
  });

  describe('fn:heading2', () => {
    it('should transform heading 2 with simple text', () => {
      const heading2Block = {
        ...defaultBlockProperties,
        id: 'heading2-1',
        type: 'heading_2' as const,
        has_children: false,
        heading_2: {
          rich_text: [createPlainText('Section Title')],
          is_toggleable: false,
          color: 'default' as const,
        },
        children: [],
      } satisfies NotionBlockWithTransformedChildren<string>;

      const result = heading2(heading2Block);
      expect(result).toBe('## Section Title');
    });
  });

  describe('fn:heading3', () => {
    it('should transform heading 3 with simple text', () => {
      const heading3Block = {
        ...defaultBlockProperties,
        id: 'heading3-1',
        type: 'heading_3' as const,
        has_children: false,
        heading_3: {
          rich_text: [createPlainText('Subsection Title')],
          is_toggleable: false,
          color: 'default' as const,
        },
        children: [],
      } satisfies NotionBlockWithTransformedChildren<string>;

      const result = heading3(heading3Block);
      expect(result).toBe('### Subsection Title');
    });
  });

  describe('fn:quote', () => {
    it.each([
      {
        name: 'simple quote',
        stub: stubs.quoteSimple,
        expected: '> This is a quote',
      },
      {
        name: 'empty quote',
        stub: stubs.quoteEmpty,
        expected: '> ',
      },
      {
        name: 'multiline quote',
        stub: stubs.quoteMultiline,
        expected: '> Line one\n> Line two\n> Line three',
      },
    ])('should transform $name', ({ stub, expected }) => {
      const result = quote(createTransformedBlock(stub));
      expect(result).toBe(expected);
    });

    it('should transform quote with children', () => {
      const result = quote(
        createTransformedBlock(stubs.quoteWithChildren, [
          'Nested paragraph 1',
          'Nested paragraph 2',
        ]),
      );
      expect(result).toBe(
        '> Main quote text\n> Nested paragraph 1\n> Nested paragraph 2',
      );
    });
  });

  describe('fn:callout', () => {
    it.each([
      {
        name: 'callout with emoji',
        stub: stubs.calloutWithEmoji,
        expected: '> ⚠️ Important information',
      },
      {
        name: 'callout without icon',
        stub: stubs.calloutWithoutIcon,
        expected: '> 💡 General information',
      },
      {
        name: 'callout with file icon',
        stub: stubs.calloutWithFileIcon,
        expected: '> 💡 File information',
      },
      {
        name: 'simple callout',
        stub: stubs.calloutSimple,
        expected: '> ✨ Simple callout',
      },
      {
        name: 'empty callout',
        stub: stubs.calloutEmpty,
        expected: '> 🔔 ',
      },
    ])('should transform $name', ({ stub, expected }) => {
      const result = callout(createTransformedBlock(stub));
      expect(result).toBe(expected);
    });

    it('should transform callout with children', () => {
      const result = callout(
        createTransformedBlock(stubs.calloutWithChildren, [
          'Child content 1',
          'Child content 2',
        ]),
      );
      expect(result).toBe(
        '> 📝 Main callout text\n> Child content 1\n> Child content 2',
      );
    });
  });

  describe('fn:toggle', () => {
    it.each([
      {
        name: 'content only',
        richText: [createPlainText('Toggle content')],
        hasChildren: false,
        children: [],
        expected: 'Toggle content',
      },
      {
        name: 'empty content',
        richText: [],
        hasChildren: false,
        children: [],
        expected: '',
      },
      {
        name: 'only children (empty rich_text)',
        richText: [],
        hasChildren: true,
        children: ['Only children content'],
        expected: '\n\n  Only children content',
      },
      {
        name: 'single child',
        richText: [createPlainText('Single child toggle')],
        hasChildren: true,
        children: ['Single child'],
        expected: 'Single child toggle\n\n  Single child',
      },
    ])(
      'should convert toggle block with $name',
      ({ richText, hasChildren, children, expected }) => {
        const toggleBlock = {
          ...defaultBlockProperties,
          id: 'toggle-test',
          type: 'toggle' as const,
          has_children: hasChildren,
          toggle: { rich_text: richText, color: 'default' as const },
          children,
        } satisfies NotionBlockWithTransformedChildren<string>;

        const result = toggle(toggleBlock);
        expect(result).toBe(expected);
      },
    );
  });
});
