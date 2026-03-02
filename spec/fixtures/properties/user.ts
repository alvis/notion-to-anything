import { personUser } from '../users';

import type { NormalizedValue, NotionPropertyValue } from '#types';

/** user property fixtures for people and metadata properties */

// user content fixtures //

/** normalized user content with all standard fields */
export const personUserContent = {
  avatar: 'url',
  email: 'email',
  name: 'Name',
} satisfies NormalizedValue;

/** normalized user content without email field */
export const personUserWithoutEmailContent = {
  avatar: 'url',
  email: null,
  name: 'Name',
} satisfies NormalizedValue;

// people properties //

/** sample people property with single person user */
export const peopleProperty = {
  id: 'id',
  type: 'people',
  people: [
    {
      object: 'user',
      id: 'id',
      type: 'person',
      person: {
        email: 'email',
      },
      name: 'Name',
      avatar_url: 'url',
    },
  ],
} satisfies NotionPropertyValue<'people'>;

/** expected normalized content for people property */
export const peopleContent = [
  { name: 'Name', avatar: 'url', email: 'email' },
] satisfies NormalizedValue;

// metadata properties //

/** sample created by property using person user */
export const createdByProperty = {
  id: 'id',
  type: 'created_by',
  created_by: personUser,
} satisfies NotionPropertyValue<'created_by'>;

/** expected normalized content for created by property */
export const createdByContent = {
  name: 'Name',
  avatar: 'url',
  email: 'email',
} satisfies NormalizedValue;

/** sample last edited by property using person user */
export const lastEditedByProperty = {
  id: 'id',
  type: 'last_edited_by',
  last_edited_by: personUser,
} satisfies NotionPropertyValue<'last_edited_by'>;

/** expected normalized content for last edited by property */
export const lastEditedByContent = {
  name: 'Name',
  avatar: 'url',
  email: 'email',
} satisfies NormalizedValue;

// test accessibility mocks //

/** mock for inaccessible user property testing */
export const inaccessibleUserProperty = {
  id: 'property_id',
  object: 'user',
} satisfies { id: string; object: string };
