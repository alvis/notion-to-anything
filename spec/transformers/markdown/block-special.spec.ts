import { describe, expect, it } from 'vitest';

import {
  breadcrumb,
  childDatabase,
  childPage,
  code,
  column,
  columnList,
  divider,
  embed,
  equation,
  syncedBlock,
  table,
  tableOfContents,
  tableRow,
  transcription,
  unsupported,
} from '#transformers/markdown/block';

import * as stubs from '../../fixtures/blocks';
import { defaultBlockProperties } from '../../fixtures/common';
import { createTransformedBlock } from '../../fixtures/factories/block';
import { createPlainText } from '../../fixtures/factories/richtext';

import type { NotionBlockWithTransformedChildren } from '#types';

describe('Code and Math Blocks', () => {
  describe('fn:code', () => {
    it('should transform code block with language specified', () => {
      const codeBlock = {
        ...defaultBlockProperties,
        id: 'code-1',
        type: 'code' as const,
        has_children: false,
        code: {
          rich_text: [createPlainText('console.log("Hello, World!");')],
          language: 'javascript',
          caption: [],
        },
        children: [],
      } satisfies NotionBlockWithTransformedChildren<string>;

      const result = code(codeBlock);
      expect(result).toBe('```javascript\nconsole.log("Hello, World!");\n```');
    });

    it('should handle code block with multiple rich text elements', () => {
      const codeBlock = {
        ...defaultBlockProperties,
        id: 'code-2',
        type: 'code' as const,
        has_children: false,
        code: {
          rich_text: [
            createPlainText('function greet(name) {\n'),
            // eslint-disable-next-line no-template-curly-in-string -- intentional template literal in code content
            createPlainText('  return `Hello, ${name}!`;\n'),
            createPlainText('}'),
          ],
          language: 'typescript',
          caption: [],
        },
        children: [],
      } satisfies NotionBlockWithTransformedChildren<string>;

      const result = code(codeBlock);
      expect(result).toBe(
        // eslint-disable-next-line no-template-curly-in-string -- intentional template literal in expected output
        '```typescript\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n```',
      );
    });
  });

  describe('fn:equation', () => {
    it('should transform equation block with simple expression', () => {
      const equationBlock = {
        ...defaultBlockProperties,
        id: 'equation-1',
        type: 'equation' as const,
        has_children: false,
        equation: {
          expression: 'E = mc^2',
        },
        children: [],
      } satisfies NotionBlockWithTransformedChildren<string>;

      const result = equation(equationBlock);
      expect(result).toBe('$$E = mc^2$$');
    });

    it('should handle empty equation expression', () => {
      const equationBlock = {
        ...defaultBlockProperties,
        id: 'equation-empty',
        type: 'equation' as const,
        has_children: false,
        equation: {
          expression: '',
        },
        children: [],
      } satisfies NotionBlockWithTransformedChildren<string>;

      const result = equation(equationBlock);
      expect(result).toBe('$$$$');
    });
  });
});

describe('Layout and Structure Blocks', () => {
  describe('fn:table', () => {
    it('should transform table blocks by joining children', () => {
      const tableBlock = stubs.table;
      const result = table(
        createTransformedBlock(tableBlock, [
          '| Header 1 | Header 2 |',
          '| Cell 1 | Cell 2 |',
        ]),
      );
      expect(result).toBe('| Header 1 | Header 2 |\n| Cell 1 | Cell 2 |');
    });
  });

  describe('fn:tableRow', () => {
    it('should transform table row blocks', () => {
      const tableRowBlock = stubs.tableRow;
      const result = tableRow(createTransformedBlock(tableRowBlock));
      expect(result).toBe('| Cell 1 | Cell 2 |');
    });
  });

  describe('fn:columnList', () => {
    it('should transform column list blocks', () => {
      const columnListBlock = stubs.columnList;
      const result = columnList(
        createTransformedBlock(columnListBlock, [
          'Column 1 content',
          'Column 2 content',
        ]),
      );
      expect(result).toBe('Column 1 content\n\nColumn 2 content');
    });
  });

  describe('fn:column', () => {
    it('should transform column blocks', () => {
      const columnBlock = stubs.column;
      const result = column(
        createTransformedBlock(columnBlock, [
          'First paragraph',
          'Second paragraph',
        ]),
      );
      expect(result).toBe('First paragraph\nSecond paragraph');
    });
  });

  describe('fn:divider', () => {
    it('should transform divider blocks', () => {
      const dividerBlock = stubs.divider;
      const result = divider(createTransformedBlock(dividerBlock));
      expect(result).toBe('---');
    });
  });

  describe('fn:breadcrumb', () => {
    it('should transform breadcrumb blocks to empty string', () => {
      const breadcrumbBlock = stubs.breadcrumb;
      const result = breadcrumb(createTransformedBlock(breadcrumbBlock));
      expect(result).toBe('');
    });
  });

  describe('fn:tableOfContents', () => {
    it('should transform table of contents blocks', () => {
      const tocBlock = stubs.tableOfContents;
      const result = tableOfContents(createTransformedBlock(tocBlock));
      expect(result).toBe('[TOC]');
    });
  });
});

describe('Special Handling Blocks', () => {
  describe('fn:syncedBlock', () => {
    it('should transform synced blocks by joining children', () => {
      const syncedBlockStub = stubs.syncedBlock;
      const result = syncedBlock(
        createTransformedBlock(syncedBlockStub, [
          'Synced content 1',
          'Synced content 2',
        ]),
      );
      expect(result).toBe('Synced content 1\nSynced content 2');
    });
  });

  describe('fn:embed', () => {
    it('should transform embed blocks with captions', () => {
      const embedBlock = {
        ...defaultBlockProperties,
        id: 'embed-1',
        type: 'embed' as const,
        has_children: false,
        embed: {
          url: 'https://example.com/embed',
          caption: [createPlainText('Interactive content')],
        },
        children: [],
      } satisfies NotionBlockWithTransformedChildren<string>;

      const result = embed(embedBlock);
      expect(result).toBe('[Interactive content](https://example.com/embed)');
    });

    it('should use fallback text for embed blocks without captions', () => {
      const embedBlock = {
        ...defaultBlockProperties,
        id: 'embed-2',
        type: 'embed' as const,
        has_children: false,
        embed: {
          url: 'https://codepen.io/user/pen/abc123',
          caption: [],
        },
        children: [],
      } satisfies NotionBlockWithTransformedChildren<string>;

      const result = embed(embedBlock);
      expect(result).toBe('[Embed](https://codepen.io/user/pen/abc123)');
    });
  });

  describe('fn:childPage', () => {
    it('should transform child page blocks to null', () => {
      const childPageBlock = stubs.childPage;
      const result = childPage(createTransformedBlock(childPageBlock));
      expect(result).toBeNull();
    });
  });

  describe('fn:childDatabase', () => {
    it('should transform child database blocks to null', () => {
      const childDatabaseBlock = stubs.childDatabase;
      const result = childDatabase(createTransformedBlock(childDatabaseBlock));
      expect(result).toBeNull();
    });
  });

  describe('fn:transcription', () => {
    it('should transform transcription blocks to null', () => {
      const block = {
        ...defaultBlockProperties,
        id: 'transcription-1',
        type: 'transcription' as const,
        has_children: false,
        transcription: {},
        children: [],
      } satisfies NotionBlockWithTransformedChildren<string>;

      const result = transcription(block);

      expect(result).toBeNull();
    });
  });

  describe('fn:unsupported', () => {
    it('should transform unsupported blocks to null', () => {
      const unsupportedBlock = stubs.unsupported;
      const result = unsupported(createTransformedBlock(unsupportedBlock));
      expect(result).toBeNull();
    });
  });
});
