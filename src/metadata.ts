import {
  getPropertyContentFromFile,
  getPropertyContentFromRichText,
  getPropertyContentFromUser,
} from '#property';

import type {
  InaccessibleNotionAPIUser,
  NotionAPIDatabase,
  NotionAPIDataSource,
  NotionAPIPage,
  NotionAPIUser,
  NotionMetadata,
} from '#types';

/**
 * gets common properties from a page, datasource, or database, except for the title
 * @param entity the page, datasource, or database object returned from Notion API
 * @returns common properties
 */
export function getMetadata<
  E extends NotionAPIPage | NotionAPIDataSource | NotionAPIDatabase,
>(entity: E): NotionMetadata {
  const { id, last_edited_time: lastEditedAt, url } = entity;
  const { created_time: createdAt } = entity;

  const title = getPropertyContentFromRichText(
    'title' in entity
      ? entity.title
      : Object.values(entity.properties).find(
          (property) => property.type === 'title',
        )!.title,
  );

  const createdByUser = 'created_by' in entity ? entity.created_by : null;
  const lastEditedByUser =
    'last_edited_by' in entity ? entity.last_edited_by : null;

  const variable = {
    url,
    publicUrl: entity.public_url,
    ...getCommonPersonMetadata('lastEditedBy', lastEditedByUser),
    lastEditedAt,
  };
  const invariant = {
    ...getCommonPersonMetadata('createdBy', createdByUser),
    createdAt,
  };
  const visual = getCommonVisualMetadata(entity);

  return {
    id,
    title,
    inTrash: entity.in_trash,
    ...variable,
    ...invariant,
    ...visual,
  };
}

/**
 * gets common person metadata such as name, email, and avatar
 * @param prefix the prefix attached to the property name
 * @param user the user object returned from Notion API
 * @returns common properties
 */
export function getCommonPersonMetadata<P extends string>(
  prefix: P,
  user: NotionAPIUser | InaccessibleNotionAPIUser | null,
): Record<`${P}${'Avatar' | 'Email' | 'Name'}`, string | null> {
  const properties = getPropertyContentFromUser(user);

  return {
    [`${prefix}Avatar`]: properties?.avatar ?? null,
    [`${prefix}Email`]: properties?.email ?? null,
    [`${prefix}Name`]: properties?.name ?? null,
  } as Record<`${P}${'Avatar' | 'Email' | 'Name'}`, string | null>;
}

/**
 * gets common visual properties such as cover and icon from a page, datasource, or database
 * @param entity the page, datasource, or database object returned from Notion API
 * @returns common properties
 */
export function getCommonVisualMetadata<
  E extends NotionAPIPage | NotionAPIDataSource | NotionAPIDatabase,
>(
  entity: E,
): {
  coverImage: string | null;
  iconEmoji: string | null;
  iconImage: string | null;
} {
  const { cover, icon } = entity;

  return {
    coverImage: cover ? getPropertyContentFromFile(cover) : null,
    iconEmoji: icon?.type === 'emoji' ? icon.emoji : null,
    iconImage:
      icon?.type === 'external' || icon?.type === 'file'
        ? getPropertyContentFromFile(icon)
        : null,
  };
}
