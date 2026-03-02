import { defaultRichTextAnnotations } from '../common';

import type { NotionAPIRichText } from '#types';

/** options for creating plain text rich text objects */
export interface PlainTextOptions {
  /** optional annotation overrides for text formatting */
  annotations?: Partial<NotionAPIRichText['annotations']>;
  /** optional hyperlink URL for the text */
  href?: string | null;
  /** optional link object for the text */
  link?: { url: string } | null;
}

/**
 * creates a plain text rich text object with specified content and formatting
 * @param content text content for the rich text element
 * @param override optional formatting and link overrides
 * @returns notion API rich text object with text type
 */
export function createPlainText(
  content: string,
  override?: PlainTextOptions,
): NotionAPIRichText {
  const link = override?.link ?? null;
  const href = override?.href ?? override?.link?.url ?? null;

  return {
    annotations: override?.annotations
      ? { ...defaultRichTextAnnotations, ...override.annotations }
      : defaultRichTextAnnotations,
    href,
    plain_text: content,
    text: {
      content,
      link,
    },
    type: 'text',
  };
}

/** options for creating equation rich text objects */
interface EquationOptions {
  /** optional annotation overrides for text formatting */
  annotations?: Partial<NotionAPIRichText['annotations']>;
  /** optional hyperlink URL for the equation */
  href?: string | null;
}

/**
 * creates an equation rich text object with specified mathematical expression
 * @param expression the mathematical expression in latex format
 * @param override optional formatting and href overrides
 * @returns notion API rich text object with equation type
 */
export function createEquation(
  expression: string,
  override?: EquationOptions,
): NotionAPIRichText {
  return {
    type: 'equation',
    equation: { expression },
    annotations: override?.annotations
      ? { ...defaultRichTextAnnotations, ...override.annotations }
      : defaultRichTextAnnotations,
    plain_text: expression,
    href: override?.href ?? null,
  };
}
