/** test fixtures for notion numeric property types */

import type { NormalizedValue, NotionPropertyValue } from '#types';

// NUMBER PROPERTY FIXTURES //

/** number property with zero value for testing numeric data storage */
export const numberProperty = {
  id: 'id',
  type: 'number',
  number: 0,
} satisfies NotionPropertyValue<'number'>;

/** normalized number content as numeric value */
export const numberContent: NormalizedValue = 0;

// PHONE NUMBER PROPERTY FIXTURES //

/** phone_number property for testing phone number text storage */
export const phoneNumberProperty = {
  id: 'id',
  type: 'phone_number',
  phone_number: 'number',
} satisfies NotionPropertyValue<'phone_number'>;

/** normalized phone_number content as string */
export const phoneNumberContent: NormalizedValue = 'number';
