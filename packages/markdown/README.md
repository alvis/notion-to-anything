<div align="center">

<img src="https://raw.githubusercontent.com/alvis/notion-to-anything/refs/heads/main/logo.svg" alt="notion-to-anything logo" width="220" />

# @notion-to-anything/markdown

[![npm](https://img.shields.io/npm/dm/@notion-to-anything/markdown?style=flat-square)](https://www.npmjs.com/package/@notion-to-anything/markdown)
[![license](https://img.shields.io/github/license/alvis/notion-to-anything-monorepo.svg?style=flat-square)](https://github.com/alvis/notion-to-anything-monorepo/blob/main/LICENSE)

**Markdown transformer for notion-to-anything**—converts Notion pages to clean Markdown with YAML frontmatter, rich-text formatting, and full block type coverage.

_Turn your Notion workspace into publish-ready Markdown—headings, tables, code blocks, checklists, and more._

</div>

---

## Why This Transformer?

### The Problem

Exporting content from Notion to Markdown is surprisingly painful:

- **Manual export**—Notion's built-in export is click-heavy, lossy, and unsuitable for automation
- **Missing annotations**—Bold, italic, strikethrough, inline code, equations, and links are often dropped or mangled
- **No frontmatter**—Metadata like page title is lost, making static site generation difficult
- **Incomplete block coverage**—Callouts, toggles, synced blocks, tables, and embeds are frequently ignored

### The Solution

`@notion-to-anything/markdown` handles the full Notion block vocabulary:

- **Complete rich-text rendering**—Bold, italic, strikethrough, code, underline, equations, and links all map correctly
- **YAML frontmatter**—Page metadata is automatically included as frontmatter for static site generators
- **30+ block types**—Headings, lists, to-dos, code blocks, quotes, callouts, tables, images, embeds, and more
- **Composable block handlers**—Every handler is individually exported so you can mix, match, or override
- **GFM-compatible output**—Tables, task lists, and fenced code blocks follow GitHub Flavored Markdown conventions

---

## Quick Start

```bash
# npm
npm install @notion-to-anything/markdown @notion-to-anything/core @notionhq/client
# pnpm
pnpm add @notion-to-anything/markdown @notion-to-anything/core @notionhq/client
# yarn
yarn add @notion-to-anything/markdown @notion-to-anything/core @notionhq/client
```

> `@notion-to-anything/core` is a peer dependency.

```ts
import { Client } from '@notionhq/client';
import { Notion } from '@notion-to-anything/core';
import { markdown } from '@notion-to-anything/markdown';

const notion = new Notion({
  client: new Client({ auth: process.env.NOTION_TOKEN }),
});

const page = await notion.getPage('page-id');
const content = await page.to(markdown);
```

**Output:**

```markdown
---
title: My Page Title
---

# Heading

This is a paragraph with **bold** and _italic_ text.

- Bullet item
- [x] Completed task
```

---

## Key Features

| Feature                     | Description                                                                   |
| --------------------------- | ----------------------------------------------------------------------------- |
| **Rich-text rendering**     | Bold, italic, strikethrough, code, underline, equations, and links            |
| **YAML frontmatter**        | Automatic page metadata as frontmatter (title)                                |
| **30+ block handlers**      | Headings, lists, to-dos, code, quotes, callouts, tables, images, embeds, etc. |
| **Composable architecture** | Every block handler exported individually for custom transformer composition  |
| **Nested block support**    | Indented children for paragraphs, lists, toggles, and callouts                |
| **GFM-compatible tables**   | Pipe-delimited tables from Notion table blocks                                |
| **Fenced code blocks**      | Language-tagged code blocks preserving syntax highlighting hints              |

---

## Usage Examples

### Export a Page to Markdown

```ts
import { Client } from '@notionhq/client';
import { Notion } from '@notion-to-anything/core';
import { markdown } from '@notion-to-anything/markdown';

const notion = new Notion({
  client: new Client({ auth: process.env.NOTION_TOKEN }),
});

const page = await notion.getPage('page-id');
const md = await page.to(markdown);

// Write to file
import { writeFile } from 'node:fs/promises';
await writeFile('output.md', md);
```

### Export All Pages from a DataSource

```ts
const dataSource = await notion.getDataSource('datasource-id');
const { pages } = await dataSource.search({
  sorts: [{ field: 'Created', order: 'desc' }],
});

for (const page of pages) {
  const md = await page.to(markdown);
  await writeFile(`${page.title}.md`, md);
}
```

### Compose Custom Block Handlers

Every block handler is exported individually, so you can build a custom transformer with only the handlers you need:

```ts
import {
  paragraph,
  heading1,
  heading2,
  heading3,
  code,
  image,
  fallback,
} from '@notion-to-anything/markdown';
import { createBlockTransformer } from '@notion-to-anything/core';
import type { NotionTransformer } from '@notion-to-anything/core';

const minimalBlock = createBlockTransformer<string>({
  paragraph,
  heading1,
  heading2,
  heading3,
  code,
  image,
  fallback, // required—handles unrecognized block types
});

const minimalMarkdown: NotionTransformer<string, string> = {
  block: minimalBlock,
  page: (blocks, page) => `# ${page.title}\n\n${blocks.join('\n\n')}`,
};

const output = await page.to(minimalMarkdown);
```

---

## Block Type Mapping

| Notion Block                       | Markdown Output                                              |
| ---------------------------------- | ------------------------------------------------------------ |
| `paragraph`                        | Plain text with rich-text annotations                        |
| `heading_1`                        | `# Heading`                                                  |
| `heading_2`                        | `## Heading`                                                 |
| `heading_3`                        | `### Heading`                                                |
| `bulleted_list_item`               | `- Item` (with nested indentation)                           |
| `numbered_list_item`               | `1. Item` (with nested indentation)                          |
| `to_do`                            | `- [x] Item` or `- [ ] Item`                                 |
| `code`                             | Fenced code block with language tag                          |
| `quote`                            | `> Quoted text`                                              |
| `callout`                          | `> icon Content`                                             |
| `equation`                         | `$$expression$$`                                             |
| `divider`                          | `---`                                                        |
| `table_of_contents`                | `[TOC]`                                                      |
| `image`                            | `![caption](url)`                                            |
| `video` / `audio` / `file` / `pdf` | `[Caption](url)`                                             |
| `bookmark` / `embed`               | `[Caption](url)`                                             |
| `link_preview`                     | `[Link Preview](url)`                                        |
| `table` + `table_row`              | Pipe-delimited table rows                                    |
| `column_list` / `column`           | Children joined                                              |
| `toggle`                           | Content with indented children                               |
| `template`                         | `Template: content` with children                            |
| `synced_block`                     | Children joined                                              |
| `link_to_page`                     | `[Page Link](page://id)` or `[Database Link](database://id)` |
| `child_page` / `child_database`    | `null` (skipped)                                             |
| `unsupported` / `transcription`    | `null` (skipped)                                             |

### Rich-Text Annotations

| Annotation    | Markdown Output |
| ------------- | --------------- |
| Bold          | `**text**`      |
| Italic        | `_text_`        |
| Strikethrough | `~~text~~`      |
| Code          | `` `text` ``    |
| Underline     | `<u>text</u>`   |
| Equation      | `$expression$`  |
| Link          | `[text](url)`   |

---

## Compatibility & Size

| Requirement       | Value                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------- |
| **Node.js**       | >= 18                                                                                         |
| **TypeScript**    | 5.x+                                                                                          |
| **Module format** | ESM only                                                                                      |
| **Dependencies**  | None (zero runtime dependencies)                                                              |
| **Peer deps**     | [`@notion-to-anything/core`](https://www.npmjs.com/package/@notion-to-anything/core) >= 1.0.0 |

---

## Troubleshooting

| Issue                                    | Solution                                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Missing annotations in output**        | Ensure the Notion API returns rich-text annotations—check that the page is not restricted        |
| **No frontmatter in output**             | Frontmatter is always included; if blank, the page may lack a title property                     |
| **Tables render incorrectly**            | Notion tables require at least one `table_row` child—empty tables produce no output              |
| **Cannot import (CJS)**                  | `@notion-to-anything/markdown` is ESM-only; use dynamic `import()` in CommonJS or migrate to ESM |
| **`@notion-to-anything/core` not found** | Install it as a peer dependency: `pnpm add @notion-to-anything/core`                             |
| **Custom handler not invoked**           | Handler keys use camelCase (`heading1`, `bulletedListItem`, `toDo`), not snake_case              |

### FAQ

**Does this produce GitHub Flavored Markdown?**
Yes. Tables use pipe syntax, task lists use `- [x]`/`- [ ]`, and code blocks use triple-backtick fencing with language tags—all GFM-compatible.

**Can I override individual block handlers?**
Yes. Import the handlers you want, define your own for the rest, and pass them all to `createBlockTransformer()`. A `fallback` handler is always required.

**How is frontmatter generated?**
The `page` function prepends YAML frontmatter with the page title. Values are escaped using the `escapeYaml()` utility to handle special characters safely.

**What happens with unsupported block types?**
The `fallback` handler returns `null`, which filters the block out of the final output.

More help: [GitHub Issues](https://github.com/alvis/notion-to-anything-monorepo/issues) · [Discussions](https://github.com/alvis/notion-to-anything-monorepo/discussions)

---

## Related Packages

| Package                                                                                                    | Description                                      |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| [`@notion-to-anything/core`](https://github.com/alvis/notion-to-anything-monorepo/tree/main/packages/core) | Core engine—required as peer dependency          |
| [`@notion-to-anything/json`](https://github.com/alvis/notion-to-anything-monorepo/tree/main/packages/json) | JSON transformer preserving full block structure |
| [`notion-to-anything`](https://www.npmjs.com/package/notion-to-anything)                                   | Convenience re-export of the core package        |

---

## Contributing

See [CONTRIBUTING.md](https://github.com/alvis/notion-to-anything-monorepo/blob/main/CONTRIBUTING.md) for full guidelines.

1. **Fork & Clone**: `git clone https://github.com/alvis/notion-to-anything-monorepo.git`
2. **Install**: `pnpm install`
3. **Develop**: `pnpm test:watch` for development mode
4. **Test**: `pnpm test && pnpm lint`
5. **Submit**: Create a pull request

---

## Security

Found a vulnerability? Please email [alvis@hilbert.space](mailto:alvis@hilbert.space) with details.
We aim to respond within 48 hours and patch as quickly as possible.

---

## License

**MIT** (c) 2025-2026 [Alvis HT Tang](https://github.com/alvis)

Free for personal and commercial use. See [LICENSE](https://github.com/alvis/notion-to-anything-monorepo/blob/main/LICENSE) for details.

---

<div align="center">

**[Star on GitHub](https://github.com/alvis/notion-to-anything-monorepo)** · **[View on npm](https://www.npmjs.com/package/@notion-to-anything/markdown)** · **[Documentation](https://github.com/alvis/notion-to-anything-monorepo#readme)**

_From Notion blocks to publish-ready Markdown—every annotation, every block type._

</div>
