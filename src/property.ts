import type {
  InaccessibleNotionAPIUser,
  NotionAPIFile,
  NotionAPIRichText,
  NotionAPIUser,
  Person,
} from '#types';

/**
 * gets the url of a file property
 * @param file a file property returned from Notion API
 * @returns its url
 */
export function getPropertyContentFromFile(file: NotionAPIFile): string {
  if (file.type === 'external') {
    return file.external.url;
  } else if (file.type === 'file') {
    return file.file.url;
  } else {
    throw new TypeError(`unknown file type`);
  }
}

/**
 * gets the plain text from a rich text property
 * @param richtext a rich text property returned from Notion API
 * @returns its content
 */
export function getPropertyContentFromRichText(
  richtext: NotionAPIRichText[],
): string {
  return richtext.map((text) => text.plain_text).join('');
}

/**
 * gets useful user information
 * @param user a user property returned from Notion API
 * @returns its content
 */
export function getPropertyContentFromUser(
  user: NotionAPIUser | InaccessibleNotionAPIUser | null,
): Person | null {
  if (!user || !isPropertyAccessible(user)) {
    return null;
  }

  if (user.type === 'person') {
    // extract user information from a real user
    return {
      name: user.name,
      avatar: user.avatar_url,
      email: user.person.email ?? null,
    };
  } else if (user.bot.owner.type === 'user') {
    // extract user information from a bot authorized by a user (i.e. not an internal integration)
    return getPropertyContentFromUser(user.bot.owner.user);
  }

  return null;
}

/**
 * indicates whether a property is accessible
 * @param property a property returned from Notion API
 * @returns whether it is accessible
 */
export function isPropertyAccessible<P extends { id: string; type?: string }>(
  property: P,
): property is Extract<P, { type: string }> {
  return !!property.type;
}

/**
 * indicates whether a property is supported by Notion API
 * @param property a property returned from Notion API
 * @returns whether it is supported
 */
export function isPropertySupported<P extends { id: string; type?: string }>(
  property: P,
): property is Exclude<P, Extract<P, { type: 'unsupported' }>> {
  return property.type !== 'unsupported';
}
