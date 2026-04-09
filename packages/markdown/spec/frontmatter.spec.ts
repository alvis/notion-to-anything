import { describe, expect, it } from 'vitest';

import { escapeYaml } from '../src/frontmatter';

describe('fn:escapeYaml', () => {
  it('should not quote regular text without special characters', () => {
    const text = 'regular text without special chars';
    const expected = 'regular text without special chars';

    const result = escapeYaml(text);

    expect(result).toBe(expected);
  });

  it('should quote text starting with punctuation characters', () => {
    const text = ':starts with colon';
    const expected = "':starts with colon'";

    const result = escapeYaml(text);

    expect(result).toBe(expected);
  });

  it('should quote text starting with braces', () => {
    const text = '{starts with brace';
    const expected = "'{starts with brace'";

    const result = escapeYaml(text);

    expect(result).toBe(expected);
  });

  it('should quote text starting with symbols', () => {
    const text = '&starts with ampersand';
    const expected = "'&starts with ampersand'";

    const result = escapeYaml(text);

    expect(result).toBe(expected);
  });

  it('should quote text starting with whitespace', () => {
    const text = ' starts with space';
    const expected = "' starts with space'";

    const result = escapeYaml(text);

    expect(result).toBe(expected);
  });

  it('should quote text containing colon followed by space', () => {
    const text = 'key: value pattern';
    const expected = "'key: value pattern'";

    const result = escapeYaml(text);

    expect(result).toBe(expected);
  });

  it('should handle text with both single and double quotes by not quoting when no special start chars', () => {
    const text = 'text with "double" and \'single\' quotes';
    const expected = 'text with "double" and \'single\' quotes';

    const result = escapeYaml(text);

    expect(result).toBe(expected);
  });

  it('should not quote text starting with backslash when not a special character', () => {
    const text = '\\backslash at start';
    const expected = '\\backslash at start';

    const result = escapeYaml(text);

    expect(result).toBe(expected);
  });

  it('should quote strings starting with dash character', () => {
    const text = '- first line\n  second line\n* third line';
    const expected = "'- first line\n  second line\n* third line'";

    const result = escapeYaml(text);

    expect(result).toBe(expected);
  });

  it('should quote strings starting with numeric patterns', () => {
    const text = '123 looks like number';
    const expected = '123 looks like number';

    const result = escapeYaml(text);

    expect(result).toBe(expected);
  });

  it('should handle empty string without quoting', () => {
    const text = '';
    const expected = '';

    const result = escapeYaml(text);

    expect(result).toBe(expected);
  });

  it('should escape single quotes within quoted text that starts with special char', () => {
    const text = ":text with 'single' quotes";
    const expected = "':text with \\'single\\' quotes'";

    const result = escapeYaml(text);

    expect(result).toBe(expected);
  });

  it('should escape backslashes within quoted text that starts with special char', () => {
    const text = ':text with \\backslash';
    const expected = "':text with \\\\backslash'";

    const result = escapeYaml(text);

    expect(result).toBe(expected);
  });

  it('should preserve backslashes and double quotes in non-special text', () => {
    const text = 'C:\\path\\to\\file "example"';
    const expected = 'C:\\path\\to\\file "example"';

    const result = escapeYaml(text);

    expect(result).toBe(expected);
  });

  it('should quote string when leading spaces exist', () => {
    const text = '  leading and trailing spaces  ';
    const expected = "'  leading and trailing spaces  '";

    const result = escapeYaml(text);

    expect(result).toBe(expected);
  });
});
