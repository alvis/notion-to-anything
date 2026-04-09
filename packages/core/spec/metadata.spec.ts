import { describe, expect, it } from 'vitest';

import { getMetadata } from '#entities/metadata';

import { defaultTime } from '../../../fixtures/common';
import { database } from '../../../fixtures/databases';
import { dataSource } from '../../../fixtures/datasources';
import { buildDummyDatabase } from '../../../fixtures/factories/database';
import { buildDummyDataSource } from '../../../fixtures/factories/datasource';
import { createPlainText } from '../../../fixtures/factories/richtext';
import { page } from '../../../fixtures/pages';
import { inaccessibleUser, personUser } from '../../../fixtures/users';

import type { NotionAPIDataSource } from '#types/index';

describe('fn:getMetadata', () => {
  it('should return metadata from a page, except for the title', () => {
    const expected = {
      id: 'page-id', title: 'Title', createdAt: defaultTime, lastEditedAt: defaultTime,
      url: 'https://www.notion.so/workspace/page-id', publicUrl: null, inTrash: false,
      coverImage: 'https://www.notion.so/cover.png', createdByAvatar: 'url', createdByEmail: 'email', createdByName: 'Name',
      iconEmoji: '📚', iconImage: null, lastEditedByAvatar: 'url', lastEditedByEmail: 'email', lastEditedByName: 'Name',
    };
    const result = getMetadata(page);
    expect(result).toEqual(expected);
  });

  it.each([
    ['null', null, null],
    ['embedded', { type: 'file', file: { url: 'url', expiry_time: defaultTime } }, 'url'],
    ['external', { type: 'external', external: { url: 'url' } }, 'url'],
  ] as const)('should handle %s cover image', (_type, cover, expectedUrl) => {
    const result = getMetadata({ ...page, cover });
    expect(result.coverImage).toEqual(expectedUrl);
  });

  it.each([
    ['null', null, null, null],
    ['emoji', { type: 'emoji', emoji: '☀️' }, '☀️', null],
    ['embedded file', { type: 'file', file: { url: 'url', expiry_time: defaultTime } }, null, 'url'],
    ['external file', { type: 'external', external: { url: 'url' } }, null, 'url'],
  ] as const)('should handle %s icon', (_type, icon, expectedEmoji, expectedImage) => {
    const result = getMetadata({ ...page, icon });
    expect(result.iconEmoji).toEqual(expectedEmoji);
    expect(result.iconImage).toEqual(expectedImage);
  });

  it.each([
    ['created_by (inaccessible)', 'created_by', inaccessibleUser, { createdByAvatar: null, createdByEmail: null, createdByName: null }],
    ['created_by (accessible)', 'created_by', personUser, { createdByAvatar: 'url', createdByEmail: 'email', createdByName: 'Name' }],
    ['last_edited_by (inaccessible)', 'last_edited_by', inaccessibleUser, { lastEditedByAvatar: null, lastEditedByEmail: null, lastEditedByName: null }],
    ['last_edited_by (accessible)', 'last_edited_by', personUser, { lastEditedByAvatar: 'url', lastEditedByEmail: 'email', lastEditedByName: 'Name' }],
  ])('should handle %s field', (_desc, field, userValue, expected) => {
    const result = getMetadata({ ...page, [field]: userValue });
    expect(result).toEqual(expect.objectContaining(expected));
  });

  it('should extract metadata from datasource with title property', () => {
    const testDataSource = buildDummyDataSource({
      id: 'test-database-id',
      properties: { 'Database Title': { id: 'title-prop-id', type: 'title' as const, name: 'Database Title', title: {}, description: 'Main title property' } },
    });
    const expected = {
      id: 'test-database-id', title: 'Title', createdAt: defaultTime, lastEditedAt: defaultTime,
      url: 'https://www.notion.so/workspace/test-database-id', publicUrl: null, inTrash: false,
      coverImage: 'https://www.notion.so/cover.png', createdByAvatar: 'url', createdByEmail: 'email', createdByName: 'Name',
      iconEmoji: '📚', iconImage: null, lastEditedByAvatar: 'url', lastEditedByEmail: 'email', lastEditedByName: 'Name',
    };
    const result = getMetadata(testDataSource);
    expect(result).toEqual(expected);
  });

  it('should find title property from datasource properties when title field is empty', () => {
    const dataSourceWithPropertyTitle = {
      ...buildDummyDataSource({ id: 'property-title-db' }), title: [],
      properties: { 'Database Name': { id: 'title-prop-id', type: 'title' as const, name: 'Database Name', title: {}, description: 'Title property in properties' } },
    };
    const expected = {
      id: 'property-title-db', title: '', createdAt: defaultTime, lastEditedAt: defaultTime,
      url: 'https://www.notion.so/workspace/property-title-db', publicUrl: null, inTrash: false,
      coverImage: 'https://www.notion.so/cover.png', createdByAvatar: 'url', createdByEmail: 'email', createdByName: 'Name',
      iconEmoji: '📚', iconImage: null, lastEditedByAvatar: 'url', lastEditedByEmail: 'email', lastEditedByName: 'Name',
    };
    const result = getMetadata(dataSourceWithPropertyTitle);
    expect(result).toEqual(expected);
  });

  it('should handle metadata extraction with null values in datasource', () => {
    const minimalDataSource = { ...dataSource, cover: null, icon: null, created_by: null, last_edited_by: null } as unknown as NotionAPIDataSource;
    const expected = {
      id: 'database-id', title: 'Title', createdAt: defaultTime, lastEditedAt: defaultTime,
      url: 'https://www.notion.so/workspace/database-id', publicUrl: null, inTrash: false,
      coverImage: null, createdByAvatar: null, createdByEmail: null, createdByName: null,
      iconEmoji: null, iconImage: null, lastEditedByAvatar: null, lastEditedByEmail: null, lastEditedByName: null,
    };
    const result = getMetadata(minimalDataSource);
    expect(result).toEqual(expected);
  });

  it('should extract metadata from database entity', () => {
    const expected = {
      id: 'database-id', title: 'Title', createdAt: defaultTime, lastEditedAt: defaultTime,
      url: 'https://www.notion.so/workspace/database-id', publicUrl: null, inTrash: false,
      coverImage: 'https://www.notion.so/cover.png', createdByAvatar: null, createdByEmail: null, createdByName: null,
      iconEmoji: '📚', iconImage: null, lastEditedByAvatar: null, lastEditedByEmail: null, lastEditedByName: null,
    };
    const result = getMetadata(database);
    expect(result).toEqual(expected);
  });

  it('should handle database with description', () => {
    const dbWithDescription = buildDummyDatabase({ id: 'described-db', description: [createPlainText('A test database')] });
    const result = getMetadata(dbWithDescription);
    expect(result.id).toBe('described-db');
    expect(result.title).toBe('Title');
  });
});
