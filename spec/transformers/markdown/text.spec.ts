import { describe, expect, it } from 'vitest';

import {
  bold,
  code,
  italic,
  math,
  strikethrough,
  text,
  texts,
  underline,
} from '#transformers/markdown/text';

import { createPlainText } from '../../fixtures/factories/richtext';

import type { NotionAPIRichText } from '#types';

const unmarked = createPlainText('text');

describe('Markdown annotation functions', () => {
  const annotationTests = [
    {
      name: 'bold',
      fn: bold,
      annotation: 'bold',
      markdown: '**text**',
    },
    {
      name: 'italic',
      fn: italic,
      annotation: 'italic',
      markdown: '_text_',
    },
    {
      name: 'strikethrough',
      fn: strikethrough,
      annotation: 'strikethrough',
      markdown: '~~text~~',
    },
    {
      name: 'code',
      fn: code,
      annotation: 'code',
      markdown: '`text`',
    },
  ];

  annotationTests.forEach(({ name, fn, annotation, markdown }) => {
    describe(`fn:${name}`, () => {
      const annotated = createPlainText('text', {
        annotations: { [annotation]: true },
      }) satisfies NotionAPIRichText;

      it(`should mark text with ${name} formatting`, () => {
        const result = fn(annotated);
        expect(result.plain_text).toBe(markdown);
        expect(result.annotations[annotation]).toBe(false);
      });

      it('should pass through unannotated text', () => {
        const result = fn(unmarked);
        expect(result.plain_text).toBe('text');
        expect(result.annotations[annotation]).toBe(false);
      });
    });
  });
});

describe('fn:math', () => {
  it('should convert equation to math text', () => {
    const input: NotionAPIRichText = {
      type: 'equation',
      equation: { expression: 'E = mc^2' },
      plain_text: 'E = mc^2',
      href: null,
      annotations: {
        bold: false,
        italic: false,
        strikethrough: false,
        underline: false,
        code: false,
        color: 'default',
      },
    };

    const result = math(input);

    expect(result.type).toBe('text');
    expect(result.plain_text).toBe('$E = mc^2$');
    expect(
      (result as Extract<NotionAPIRichText, { type: 'text' }>).text.content,
    ).toBe('$E = mc^2$');
  });

  it('should not modify non-equation text', () => {
    const input = createPlainText('text');

    const result = math(input);

    expect(result).toEqual(input);
  });
});

describe('fn:text', () => {
  const annotated: NotionAPIRichText = createPlainText('text', {
    annotations: {
      bold: true,
      italic: true,
      strikethrough: true,
      code: true,
    },
    href: 'https://link',
  });

  it('converts annotated text to markdown format', () => {
    const expected = '[~~_**`text`**_~~](https://link)';

    const result = text(annotated);

    expect(result).toBe(expected);
  });

  it('should leave the original block untouched', () => {
    expect(annotated.plain_text).toBe('text');
    expect(annotated.annotations).toMatchObject({
      bold: true,
      italic: true,
      strikethrough: true,
      code: true,
    });
    expect(annotated.href).toBe('https://link');
  });

  it('should not process underline annotation in text function currently', () => {
    const underlinedText = createPlainText('underlined content', {
      annotations: { underline: true },
    });
    const expected = 'underlined content';

    const result = text(underlinedText);

    expect(result).toBe(expected);
  });

  it('converts inline maths equation to markdown format', () => {
    const math: NotionAPIRichText = {
      type: 'equation',
      equation: { expression: 'x^2' },
      annotations: {
        bold: false,
        italic: false,
        strikethrough: false,
        underline: false,
        code: false,
        color: 'default',
      },
      plain_text: 'x^2',
      href: null,
    };
    const expected = '$x^2$';

    const result = text(math);

    expect(result).toBe(expected);
    expect(math.plain_text).toBe('x^2');
    expect(math.equation.expression).toBe('x^2');
  });

  it('should add link if href is present', () => {
    const input: NotionAPIRichText = {
      ...createPlainText('text'),
      href: 'https://example.com',
    };
    const expected = '[text](https://example.com)';

    const result = text(input);

    expect(result).toBe(expected);
  });

  it('should combine formatting and link', () => {
    const input: NotionAPIRichText = {
      ...createPlainText('text', { annotations: { bold: true } }),
      href: 'https://example.com',
    };
    const expected = '[**text**](https://example.com)';

    const result = text(input);

    expect(result).toBe(expected);
  });
});

describe('fn:texts', () => {
  it('should join all rich text with indention', () => {
    const expected = '  text';

    const result = texts([unmarked], '  ');

    expect(result).toBe(expected);
  });

  it('should concatenate multiple rich text blocks', () => {
    const blocks = [
      createPlainText('Hello '),
      createPlainText('world', { annotations: { bold: true } }),
      createPlainText('!'),
    ];
    const expected = 'Hello **world**!';

    const result = texts(blocks);

    expect(result).toBe(expected);
  });

  it('should handle empty array', () => {
    const expected = '';

    const result = texts([]);

    expect(result).toBe(expected);
  });
});

describe('fn:underline', () => {
  it('should add underline HTML tags when underline annotation is true', () => {
    const block = createPlainText('Underlined text', {
      annotations: { underline: true },
    }) satisfies NotionAPIRichText;

    const result = underline(block);

    expect(result.plain_text).toBe('<u>Underlined text</u>');
    expect(result.annotations.underline).toBe(false);
  });

  it('should not modify block when underline annotation is false', () => {
    const block = createPlainText('Normal text');
    const result = underline(block);
    expect(result).toBe(block);
  });

  it('should preserve other annotations when adding underline', () => {
    const block = createPlainText('Complex text', {
      annotations: { bold: true, italic: true, underline: true, color: 'red' },
    }) satisfies NotionAPIRichText;

    const result = underline(block);

    expect(result.plain_text).toBe('<u>Complex text</u>');
    expect(result.annotations.underline).toBe(false);
    expect(result.annotations.bold).toBe(true);
    expect(result.annotations.italic).toBe(true);
  });
});
