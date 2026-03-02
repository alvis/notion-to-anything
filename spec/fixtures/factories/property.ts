import { createPlainText } from './richtext';
import { buildUser } from './user';

import type { NotionAPIRichText, NotionPropertyValue } from '#types';

/**
 * converts string or rich text array to standardized rich text array format
 * @param content text content as string or rich text objects
 * @returns array of rich text objects
 */
const toRichTextArray = (
  content?: string | NotionAPIRichText[],
): NotionAPIRichText[] => {
  if (!content) {
    return [];
  }
  if (typeof content === 'string') {
    return [createPlainText(content)];
  }

  return content;
};

/**
 * creates a title property fixture with specified content
 * @param options configuration for the title property
 * @returns notion title property object
 */
export function createTitleProperty(
  options?: Partial<NotionPropertyValue<'title'>>,
): NotionPropertyValue<'title'> {
  const { id = 'property-id', title } = { ...options };

  return {
    id,
    type: 'title',
    title: title ?? toRichTextArray('Title'),
  };
}

/**
 * creates a rich text property fixture with specified content
 * @param options configuration for the rich text property
 * @returns notion rich text property object
 */
export function createRichTextProperty(
  options?: Partial<NotionPropertyValue<'rich_text'>>,
): NotionPropertyValue<'rich_text'> {
  const { id = 'property-id', rich_text } = { ...options };

  return {
    id,
    type: 'rich_text',
    rich_text: rich_text ?? toRichTextArray('Text'),
  };
}

/**
 * creates a checkbox property fixture with specified checked state
 * @param options configuration for the checkbox property
 * @returns notion checkbox property object
 */
export function createCheckboxProperty(
  options?: Partial<NotionPropertyValue<'checkbox'>>,
): NotionPropertyValue<'checkbox'> {
  const { id = 'property-id', checkbox } = { ...options };

  return {
    id,
    type: 'checkbox',
    checkbox: checkbox ?? false,
  };
}

/**
 * creates a URL property fixture with specified URL
 * @param options configuration for the URL property
 * @returns notion URL property object
 */
export function createUrlProperty(
  options?: Partial<NotionPropertyValue<'url'>>,
): NotionPropertyValue<'url'> {
  const { id = 'property-id', url } = { ...options };

  return {
    id,
    type: 'url',
    url: url ?? 'https://example.com',
  };
}

/**
 * creates an email property fixture with specified email address
 * @param options configuration for the email property
 * @returns notion email property object
 */
export function createEmailProperty(
  options?: Partial<NotionPropertyValue<'email'>>,
): NotionPropertyValue<'email'> {
  const { id = 'property-id', email } = { ...options };

  return {
    id,
    type: 'email',
    email: email ?? 'user@example.com',
  };
}

/**
 * creates a unique_id property fixture with specified prefix and number
 * @param options configuration for the unique_id property
 * @returns notion unique_id property object
 */
export function createUniqueIdProperty(
  options?: Partial<NotionPropertyValue<'unique_id'>>,
): NotionPropertyValue<'unique_id'> {
  const { id = 'property-id', unique_id } = { ...options };

  return {
    id,
    type: 'unique_id',
    unique_id: unique_id ?? {
      number: 1,
      prefix: null,
    },
  };
}

/**
 * creates a verification property fixture with specified verification details
 * @param options configuration for the verification property
 * @returns notion verification property object
 */
export function createVerificationProperty(
  options?: Partial<NotionPropertyValue<'verification'>>,
): NotionPropertyValue<'verification'> {
  const { id = 'property-id', verification } = { ...options };

  return {
    id,
    type: 'verification',
    verification: verification ?? {
      state: 'verified' as 'verified' | 'expired',
      verified_by: buildUser(),
      date: {
        start: new Date().toISOString(),
        end: null,
        time_zone: null,
      },
    },
  };
}

/**
 * creates a button property fixture with empty configuration
 * @param options configuration for the button property
 * @returns notion button property object
 */
export function createButtonProperty(
  options?: Partial<NotionPropertyValue<'button'>>,
): NotionPropertyValue<'button'> {
  const { id = 'property-id', button } = { ...options };

  return {
    id,
    type: 'button',
    button: button ?? {},
  };
}
