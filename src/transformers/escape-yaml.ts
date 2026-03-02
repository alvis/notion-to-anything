/**
 * escapes text content for a value in a yaml file
 * @param text the text content to escape
 * @returns the escaped text content
 */
export function escapeYaml(text: string): string {
  // check if the text contains special characters
  const punctuation = [':', ',', '-', '=', '!', '%', '@', '`'];
  const braces = ['{', '}', '[', ']'];
  const symbols = ['&', '*', '#', '?', '|', '<', '>'];
  const whitespace = [' '];

  const specialChars = [...punctuation, ...braces, ...symbols, ...whitespace];

  const needsQuotes = specialChars.some((char) => text.startsWith(char));

  return needsQuotes || /:\s+/.test(text)
    ? // escape backslashes and single quotes if text needs to be quoted
      `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
    : text;
}
