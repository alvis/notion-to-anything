import { describe, expect, it } from 'vitest';

import {
  getPropertyContentFromFile,
  getPropertyContentFromRichText,
  getPropertyContentFromUser,
  isPropertyAccessible,
  isPropertySupported,
} from '#property';

import {
  embeddedFile,
  externalFile,
  invalidFileInput,
  inaccessibleUserProperty,
  personUserContent,
  personUserWithoutEmailContent,
  richTextContent,
  richTextProperty,
  titleProperty,
} from './fixtures/properties';
import {
  botByUser,
  botWithoutUser,
  personUser,
  personUserWithoutEmail,
} from './fixtures/users';

describe('fn:getPropertyContentFromFile', () => {
  it.each([
    ['external', externalFile, 'url'],
    ['embedded', embeddedFile, 'url'],
  ])('should return file URL for %s file type', (_type, input, expected) => {
    const result = getPropertyContentFromFile(input);
    expect(result).toEqual(expected);
  });

  it('should throw error when file type is unknown', () => {
    const input = invalidFileInput;
    expect(() => getPropertyContentFromFile(input)).toThrow();
  });
});

describe('fn:getPropertyContentFromRichText', () => {
  it('should return plain text', () => {
    const input = richTextProperty.rich_text;
    const expected = richTextContent;

    const result = getPropertyContentFromRichText(input);

    expect(result).toEqual(expected);
  });
});

describe('fn:getPropertyContentFromUser', () => {
  it('should return metadata about a user', () => {
    const input = personUser;
    const expected = personUserContent;

    const result = getPropertyContentFromUser(input);

    expect(result).toEqual(expected);
  });

  it('should return metadata about a user without email', () => {
    const input = personUserWithoutEmail;
    const expected = personUserWithoutEmailContent;

    const result = getPropertyContentFromUser(input);

    expect(result).toEqual(expected);
  });

  it('should return metadata about a user behind a bot', () => {
    const input = botByUser;
    const expected = personUserContent;

    const result = getPropertyContentFromUser(input);

    expect(result).toEqual(expected);
  });

  it('should return null for a workspace bot', () => {
    const input = botWithoutUser;
    const expected = null;

    const result = getPropertyContentFromUser(input);

    expect(result).toEqual(expected);
  });

  it('should return null for an inaccessible user object', () => {
    const input = null;
    const expected = null;

    const result = getPropertyContentFromUser(input);

    expect(result).toEqual(expected);
  });
});

describe('fn:isPropertyAccessible', () => {
  it('should return true for accessible properties', () => {
    const input = titleProperty;
    const expected = true;

    const result = isPropertyAccessible(input);

    expect(result).toEqual(expected);
  });

  it('should return false for non-accessible properties', () => {
    const input = inaccessibleUserProperty;
    const expected = false;

    const result = isPropertyAccessible(input);

    expect(result).toEqual(expected);
  });
});

describe('fn:isPropertySupported', () => {
  it('should return true for supported properties', () => {
    const input = titleProperty;
    const expected = true;

    const result = isPropertySupported(input);

    expect(result).toEqual(expected);
  });

  it('should return false for unsupported properties', () => {
    const input = { type: 'unsupported', id: 'property_id' };
    const expected = false;

    const result = isPropertySupported(input);

    expect(result).toEqual(expected);
  });
});
