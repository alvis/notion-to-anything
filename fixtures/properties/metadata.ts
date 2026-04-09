/** test fixtures for notion metadata and miscellaneous property types */

import { defaultTime } from '../common';
import {
  createButtonProperty,
  createCheckboxProperty,
  createEmailProperty,
  createUniqueIdProperty,
  createUrlProperty,
  createVerificationProperty,
} from '../factories/property';
import { personUser } from '../users';

import type { NormalizedValue } from '#types/index';

// CHECKBOX PROPERTY FIXTURES //

/** checkbox property with true value for testing boolean states */
export const checkboxProperty = createCheckboxProperty({
  id: 'id',
  checkbox: true,
});

/** normalized checkbox content as boolean */
export const checkboxContent = true satisfies NormalizedValue;

// URL PROPERTY FIXTURES //

/** URL property for testing web link storage */
export const urlProperty = createUrlProperty({
  id: 'id',
  url: 'url',
});

/** normalized URL content as string */
export const urlContent = 'url' satisfies NormalizedValue;

// EMAIL PROPERTY FIXTURES //

/** email property for testing email address storage */
export const emailProperty = createEmailProperty({
  id: 'id',
  email: 'email',
});

/** normalized email content as string */
export const emailContent = 'email' satisfies NormalizedValue;

// BUTTON PROPERTY FIXTURES //

/** button property with empty configuration for testing action triggers */
export const buttonProperty = createButtonProperty({
  id: 'id',
});

/** normalized button content as null (buttons contain no data) */
export const buttonContent = null satisfies NormalizedValue;

// UNIQUE ID PROPERTY FIXTURES //

/** unique_id property with prefix and number for testing auto-generated identifiers */
export const uniqueIdProperty = createUniqueIdProperty({
  id: 'id',
  unique_id: {
    number: 1,
    prefix: 'TASK',
  },
});

/** normalized unique_id content as formatted string */
export const uniqueIdContent = 'TASK-1' satisfies NormalizedValue;

// VERIFICATION PROPERTY FIXTURES //

/** verification property with verified state for testing approval workflows */
export const verificationProperty = createVerificationProperty({
  id: 'id',
  verification: {
    state: 'verified',
    verified_by: personUser,
    date: {
      start: defaultTime,
      end: null,
      time_zone: null,
    },
  },
});

/** normalized verification content as state string only */
export const verificationContent = 'verified' satisfies NormalizedValue;

// UNSUPPORTED PROPERTY FIXTURES //

/** unsupported property type for testing unknown property handling */
export const unsupportedProperty: { type: 'unsupported' } = {
  type: 'unsupported',
};
