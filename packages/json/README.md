<div align="center">

<img src="https://raw.githubusercontent.com/alvis/notion-to-anything/refs/heads/main/logo.svg" alt="notion-to-anything logo" width="220" />

# @notion-to-anything/json

[![npm](https://img.shields.io/npm/dm/@notion-to-anything/json?style=flat-square)](https://www.npmjs.com/package/@notion-to-anything/json)
[![license](https://img.shields.io/github/license/alvis/notion-to-anything-monorepo.svg?style=flat-square)](https://github.com/alvis/notion-to-anything-monorepo/blob/main/LICENSE)

**JSON transformer for notion-to-anything**—preserves the complete Notion block structure as typed JSON with metadata, properties, and timestamps.

_Export your entire Notion workspace as structured, machine-readable JSON—every block, every property, every author._

</div>

---

## Why This Transformer?

### The Problem

Getting structured data out of Notion is harder than it should be:

- **Raw API verbosity**—The Notion API returns deeply nested, inconsistently shaped objects that are painful to work with
- **Lost authorship**—Block-level `created_by` and `last_edited_by` are partial user references that need separate resolution
- **No unified shape**—Each block type has a different structure, making downstream processing brittle
- **Manual assembly**—Combining page metadata, properties, and recursive block content requires significant boilerplate

### The Solution

`@notion-to-anything/json` produces clean, uniform JSON:

- **Normalized block structure**—Every block has a consistent shape with `id`, `type`, timestamps, author info, content, and `children`
- **Resolved user metadata**—`createdByName`, `createdByEmail`, `createdByAvatar` (and `lastEditedBy*`) are fully resolved
- **Complete page output**—Page metadata, property definitions, and all blocks combined into a single `JsonPage` object
- **Type-safe interfaces**—`JsonBlock` and `JsonPage` types provide full TypeScript autocompletion
- **Zero transformation loss**—The original block content is preserved verbatim under the `[type]` key

---

## Quick Start

```bash
# npm
npm install @notion-to-anything/json @notion-to-anything/core @notionhq/client
# pnpm
pnpm add @notion-to-anything/json @notion-to-anything/core @notionhq/client
# yarn
yarn add @notion-to-anything/json @notion-to-anything/core @notionhq/client
```

> `@notion-to-anything/core` is a peer dependency.

```ts
import { Client } from '@notionhq/client';
import { Notion } from '@notion-to-anything/core';
import { json } from '@notion-to-anything/json';

const notion = new Notion({
  client: new Client({ auth: process.env.NOTION_TOKEN }),
});

const page = await notion.getPage('page-id');
const data = await page.to(json);
```

**Output:**

```json
{
  "id": "page-uuid",
  "title": "My Page",
  "url": "https://notion.so/...",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "createdByName": "Alice",
  "lastEditedAt": "2024-03-20T14:22:00.000Z",
  "properties": {
    "Status": { "type": "select", "select": { "name": "Published" } }
  },
  "blocks": [
    {
      "id": "block-uuid",
      "type": "paragraph",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "createdByName": "Alice",
      "createdByEmail": "alice@example.com",
      "createdByAvatar": null,
      "lastEditedAt": "2024-01-15T10:30:00.000Z",
      "lastEditedByName": "Alice",
      "lastEditedByEmail": "alice@example.com",
      "lastEditedByAvatar": null,
      "paragraph": {
        "rich_text": [{ "plain_text": "Hello world", "annotations": {} }],
        "color": "default"
      },
      "children": []
    }
  ]
}
```

---

## Key Features

| Feature                       | Description                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------- |
| **Full block preservation**   | Original block content stored under the `[type]` key—nothing is lost              |
| **Resolved author metadata**  | `createdByName`, `createdByEmail`, `createdByAvatar` resolved for every block     |
| **Unified page output**       | Page metadata, properties, and blocks combined into a single `JsonPage` object    |
| **Recursive children**        | Nested blocks are recursively transformed and included as `children: JsonBlock[]` |
| **Type-safe interfaces**      | `JsonBlock` and `JsonPage` TypeScript types for full autocompletion               |
| **Zero runtime dependencies** | Only depends on `@notion-to-anything/core` as a peer dependency                   |

---

## Usage Examples

### Export a Page as JSON

```ts
import { Client } from '@notionhq/client';
import { Notion } from '@notion-to-anything/core';
import { json } from '@notion-to-anything/json';

const notion = new Notion({
  client: new Client({ auth: process.env.NOTION_TOKEN }),
});

const page = await notion.getPage('page-id');
const data = await page.to(json);

// Write to file
import { writeFile } from 'node:fs/promises';
await writeFile('page.json', JSON.stringify(data, null, 2));
```

### Export All Pages from a DataSource

```ts
const dataSource = await notion.getDataSource('datasource-id');
const { pages } = await dataSource.search({
  sorts: [{ field: 'Created', order: 'desc' }],
});

const allPages = await Promise.all(pages.map(async (page) => page.to(json)));

await writeFile('export.json', JSON.stringify(allPages, null, 2));
```

### Access Typed Block Data

```ts
import type { JsonBlock, JsonPage } from '@notion-to-anything/json';

const data: JsonPage = await page.to(json);

// Access page-level metadata
console.log(data.title); // "My Page"
console.log(data.createdAt); // "2024-01-15T10:30:00.000Z"
console.log(data.properties); // { Status: { type: "select", ... } }

// Iterate over blocks
for (const block of data.blocks) {
  console.log(block.type); // "paragraph", "heading_1", etc.
  console.log(block.createdByName); // "Alice"
  console.log(block.children); // JsonBlock[]
}
```

---

## Output Schema

### `JsonPage`

| Field              | Type             | Description                        |
| ------------------ | ---------------- | ---------------------------------- |
| `id`               | `string`         | Page UUID                          |
| `title`            | `string`         | Page title                         |
| `url`              | `string`         | Notion page URL                    |
| `publicUrl`        | `string \| null` | Public share URL, or null          |
| `inTrash`          | `boolean`        | Whether the page is trashed        |
| `createdAt`        | `string`         | ISO timestamp                      |
| `createdByName`    | `string \| null` | Author name                        |
| `createdByEmail`   | `string \| null` | Author email                       |
| `createdByAvatar`  | `string \| null` | Author avatar URL                  |
| `lastEditedAt`     | `string`         | ISO timestamp of last edit         |
| `lastEditedByName` | `string \| null` | Last editor name                   |
| `coverImage`       | `string \| null` | Cover image URL                    |
| `iconEmoji`        | `string \| null` | Icon emoji                         |
| `iconImage`        | `string \| null` | Icon image URL                     |
| `properties`       | `object`         | Page property definitions          |
| `blocks`           | `JsonBlock[]`    | All recursively transformed blocks |

### `JsonBlock`

| Field                | Type             | Description                                |
| -------------------- | ---------------- | ------------------------------------------ |
| `id`                 | `string`         | Block UUID                                 |
| `type`               | `string`         | Block type identifier (e.g., `paragraph`)  |
| `createdAt`          | `string`         | ISO timestamp                              |
| `createdByName`      | `string \| null` | Author name                                |
| `createdByEmail`     | `string \| null` | Author email                               |
| `createdByAvatar`    | `string \| null` | Author avatar URL                          |
| `lastEditedAt`       | `string`         | ISO timestamp of last edit                 |
| `lastEditedByName`   | `string \| null` | Last editor name                           |
| `lastEditedByEmail`  | `string \| null` | Last editor email                          |
| `lastEditedByAvatar` | `string \| null` | Last editor avatar URL                     |
| `[type]`             | `object`         | Original block content keyed by block type |
| `children`           | `JsonBlock[]`    | Recursively transformed child blocks       |

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

| Issue                                    | Solution                                                                                           |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **User fields are null**                 | The Notion integration may lack user access—ensure "Read user information" is enabled              |
| **Large output size**                    | JSON preserves all block data; filter blocks or properties in post-processing if size is a concern |
| **Cannot import (CJS)**                  | `@notion-to-anything/json` is ESM-only; use dynamic `import()` in CommonJS or migrate to ESM       |
| **`@notion-to-anything/core` not found** | Install it as a peer dependency: `pnpm add @notion-to-anything/core`                               |
| **TypeScript errors**                    | Ensure TypeScript 5.x+ and `"moduleResolution": "bundler"` or `"node16"` in tsconfig               |
| **Missing child blocks**                 | Blocks are recursively fetched; deep nesting with low concurrency may cause timeouts               |

### FAQ

**Does this preserve the raw Notion API structure?**
Yes. The original block content is stored verbatim under the `[type]` key (e.g., `block.paragraph` contains the raw paragraph data). Metadata fields like `id`, `type`, timestamps, and author info are normalized at the top level.

**Can I use the JSON output for static site generation?**
Absolutely. The `JsonPage` output includes everything needed to render a page—metadata, properties, and fully structured content blocks.

**How are nested blocks handled?**
Child blocks are recursively transformed and included in the `children` array of their parent `JsonBlock`. The recursion depth follows the Notion block tree.

**What is the difference between `json` and the raw Notion API response?**
The `json` transformer normalizes timestamps, resolves partial user references to full names/emails/avatars, and flattens the block structure into a consistent shape. The raw API returns inconsistent nesting and unresolved user stubs.

More help: [GitHub Issues](https://github.com/alvis/notion-to-anything-monorepo/issues) · [Discussions](https://github.com/alvis/notion-to-anything-monorepo/discussions)

---

## Related Packages

| Package                                                                                                            | Description                                |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| [`@notion-to-anything/core`](https://github.com/alvis/notion-to-anything-monorepo/tree/main/packages/core)         | Core engine—required as peer dependency    |
| [`@notion-to-anything/markdown`](https://github.com/alvis/notion-to-anything-monorepo/tree/main/packages/markdown) | Markdown transformer with YAML frontmatter |
| [`notion-to-anything`](https://www.npmjs.com/package/notion-to-anything)                                           | Convenience re-export of the core package  |

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

**[Star on GitHub](https://github.com/alvis/notion-to-anything-monorepo)** · **[View on npm](https://www.npmjs.com/package/@notion-to-anything/json)** · **[Documentation](https://github.com/alvis/notion-to-anything-monorepo#readme)**

_Every Notion block, every property, every author—structured JSON, ready to go._

</div>
