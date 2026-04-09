/** test fixtures for notion file properties */

import { defaultTime } from '../common';

import type { NormalizedValue, NotionPropertyValue } from '#types/index';

// FILE PROPERTY FIXTURES //

/** sample embedded file with expiry time for notion-hosted files */
export const embeddedFile = {
  name: 'embedded file name',
  type: 'file',
  file: {
    url: 'url',
    expiry_time: defaultTime,
  },
} satisfies NotionPropertyValue<'files'>['files'][number];

/** sample external file for externally-hosted files */
export const externalFile = {
  name: 'external file name',
  type: 'external',
  external: {
    url: 'url',
  },
} satisfies NotionPropertyValue<'files'>['files'][number];

/** files property containing both embedded and external file types */
export const filesProperty = {
  id: 'id',
  type: 'files',
  files: [embeddedFile, externalFile],
} satisfies NotionPropertyValue<'files'>;

/** normalized files content with simplified name and url structure */
export const filesContent: NormalizedValue = [
  { name: 'embedded file name', url: 'url' },
  { name: 'external file name', url: 'url' },
];

// TEST INPUT MOCKS //

/** invalid file input missing required name field for error testing */
export const invalidFileInput = {
  file: {
    url: 'url',
    expiry_time: defaultTime,
  },
} satisfies Partial<NotionPropertyValue<'files'>['files'][number]>;
