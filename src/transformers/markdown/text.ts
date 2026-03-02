import type { NotionAPIRichText } from '#types';

/**
 * annotates a text as bold
 * @param block a RichText block to be annotated
 * @returns an annotated RichText block
 */
export function bold(block: NotionAPIRichText): NotionAPIRichText {
  return block.annotations.bold
    ? {
        ...block,
        annotations: { ...block.annotations, bold: false },
        plain_text: `**${block.plain_text}**`,
      }
    : block;
}

/**
 * annotates a text as italic
 * @param block a RichText block to be annotated
 * @returns an annotated RichText block
 */
export function italic(block: NotionAPIRichText): NotionAPIRichText {
  return block.annotations.italic
    ? {
        ...block,
        annotations: { ...block.annotations, italic: false },
        plain_text: `_${block.plain_text}_`,
      }
    : block;
}

/**
 * annotates a text as strike-through
 * @param block a RichText block to be annotated
 * @returns an annotated RichText block
 */
export function strikethrough(block: NotionAPIRichText): NotionAPIRichText {
  return block.annotations.strikethrough
    ? {
        ...block,
        annotations: { ...block.annotations, strikethrough: false },
        plain_text: `~~${block.plain_text}~~`,
      }
    : block;
}

/**
 * annotates a text as an inline code
 * @param block a RichText block to be annotated
 * @returns an annotated RichText block
 */
export function code(block: NotionAPIRichText): NotionAPIRichText {
  return block.annotations.code
    ? {
        ...block,
        annotations: { ...block.annotations, code: false },
        plain_text: `\`${block.plain_text}\``,
      }
    : block;
}

/**
 * annotates a text as underline - not typically supported in markdown
 * @param block a RichText block to be annotated
 * @returns an annotated RichText block
 */
export function underline(block: NotionAPIRichText): NotionAPIRichText {
  return block.annotations.underline
    ? {
        ...block,
        annotations: { ...block.annotations, underline: false },
        plain_text: `<u>${block.plain_text}</u>`,
      }
    : block;
}

/**
 * annotates a text as an inline math equation
 * @param block a RichText block to be annotated
 * @returns an annotated RichText block
 */
export function math(block: NotionAPIRichText): NotionAPIRichText {
  return block.type === 'equation'
    ? {
        ...block,
        type: 'text',
        plain_text: `$${block.equation.expression}$`,
        text: { content: `$${block.equation.expression}$`, link: null },
      }
    : block;
}

/**
 * converts a RichText block to markdown format
 * @param block a RichText block to be parsed
 * @returns text in markdown format
 */
export function text(block: NotionAPIRichText): string {
  const plain = strikethrough(italic(bold(code(math(block))))).plain_text;

  return block.href ? `[${plain}](${block.href})` : plain;
}

/**
 * converts RichText blocks to markdown format
 * @param blocks RichText blocks to be parsed
 * @param indent space to be prefixed to the content per line
 * @returns text in markdown format
 */
export function texts(blocks: NotionAPIRichText[], indent = ''): string {
  return `${indent}${blocks.map(text).join('')}`;
}
