<div align="center">

<img src="https://raw.githubusercontent.com/alvis/notion-to-anything/refs/heads/main/logo.svg" alt="notion-to-anything logo" width="220" />

# @notion-to-anything/core

[![npm](https://img.shields.io/npm/dm/@notion-to-anything/core?style=flat-square)](https://www.npmjs.com/package/@notion-to-anything/core)
[![license](https://img.shields.io/github/license/alvis/notion-to-anything-monorepo.svg?style=flat-square)](https://github.com/alvis/notion-to-anything-monorepo/blob/main/LICENSE)

**Core engine for the notion-to-anything ecosystem**—client, entities, traversal, caching, and the transformer contract.

_The foundation layer that powers every notion-to-anything transformer—fetch, traverse, and transform Notion content with a single unified API._

</div>

> **Tip:** Looking for the all-in-one package? --> [`notion-to-anything`](https://www.npmjs.com/package/notion-to-anything)

---

## Quick Start

```bash
# npm
npm install @notion-to-anything/core @notionhq/client
# pnpm
pnpm add @notion-to-anything/core @notionhq/client
# yarn
yarn add @notion-to-anything/core @notionhq/client
```

```ts
import { Client } from '@notionhq/client';
import { Notion } from '@notion-to-anything/core';

const notion = new Notion({
  client: new Client({ auth: process.env.NOTION_TOKEN }),
  concurrency: 5,
  cache: true,
});

const page = await notion.getPage('page-id');
const metadata = page.getMetadata();
console.log(metadata.title); // "My Page Title"
```

---

## Key Features

- **`Notion` client wrapper**—wraps `@notionhq/client` with concurrency control, rate-limited fetch, and entity caching
- **Entity model**—`NotionPage`, `NotionDatabase`, `NotionDataSource`, `NotionUser` with normalized metadata (title, timestamps, cover, icon, author info)
- **Recursive block traversal**—fetches page blocks and their children with configurable concurrency
- **Transformer contract**—`NotionTransformer<B, P>` interface and `createBlockTransformer()` factory for building custom transformers
- **Query and pagination**—`searchPages()` and `searchDataSources()` with filters, sorts, cursor pagination, and offset emulation
- **Per-call cache override**—global caching with per-request opt-in or opt-out via `GetEntityOptions`

---

## Usage Examples

### Creating a Client

```ts
import { Client } from '@notionhq/client';
import { Notion } from '@notion-to-anything/core';

// Minimal setup
const notion = new Notion({
  client: new Client({ auth: process.env.NOTION_TOKEN }),
});

// With concurrency control and caching
const notion = new Notion({
  client: new Client({ auth: process.env.NOTION_TOKEN }),
  concurrency: 5,
  cache: true,
});
```

### Fetching a Page

```ts
const page = await notion.getPage('page-uuid');

// Access normalized metadata directly as properties
console.log(page.title); // "My Page Title"
console.log(page.url); // "https://notion.so/..."
console.log(page.createdAt); // "2024-01-15T10:30:00.000Z"
console.log(page.coverImage); // "https://..." or null

// Or retrieve metadata as a single object
const metadata = page.getMetadata();
```

### Querying a Database via DataSource

```ts
const dataSource = await notion.getDataSource('datasource-uuid');

const { pages, cursor } = await dataSource.search({
  filter: { property: 'Status', select: { equals: 'Published' } },
  sorts: [{ field: 'Created', order: 'desc' }],
  limit: 10,
});

for (const page of pages) {
  console.log(page.title);
}
```

### Workspace Search

```ts
// Search pages by title
const { pages, cursor } = await notion.searchPages({
  query: 'meeting notes',
  sorts: [{ field: 'last_edited_time', order: 'desc' }],
  limit: 20,
});

// Search data sources
const { dataSources } = await notion.searchDataSources({
  query: 'projects',
});
```

### Building a Custom Transformer

```ts
import { createBlockTransformer } from '@notion-to-anything/core';
import type { NotionTransformer } from '@notion-to-anything/core';

// Step 1: Define block-level transformation
const block = createBlockTransformer<string>({
  paragraph: (block) =>
    block.paragraph.rich_text.map((rt) => rt.plain_text).join(''),
  heading1: (block) =>
    `# ${block.heading_1.rich_text.map((rt) => rt.plain_text).join('')}`,
  code: (block) =>
    `\`\`\`${block.code.language}\n${block.code.rich_text.map((rt) => rt.plain_text).join('')}\n\`\`\``,
  fallback: () => null,
});

// Step 2: Combine into a full transformer
const myTransformer: NotionTransformer<string, string> = {
  block,
  page: (blocks, page) => `Title: ${page.title}\n\n${blocks.join('\n')}`,
};

// Step 3: Use it
const page = await notion.getPage('page-uuid');
const output = await page.to(myTransformer);
```

### Caching Setup

```ts
// Global caching—all getPage/getDatabase/getDataSource calls are cached
const notion = new Notion({
  client: new Client({ auth: process.env.NOTION_TOKEN }),
  cache: true,
});

// Per-call override—bypass cache for a specific request
const freshPage = await notion.getPage('page-uuid', { cache: false });
```

---

## Compatibility & Size

| Requirement       | Value                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Node.js**       | >= 18                                                                                                                       |
| **TypeScript**    | 5.x+                                                                                                                        |
| **Module format** | ESM only                                                                                                                    |
| **Dependencies**  | [`p-queue`](https://github.com/sindresorhus/p-queue), [`type-fest`](https://github.com/sindresorhus/type-fest) (types only) |
| **Peer deps**     | [`@notionhq/client`](https://github.com/makenotion/notion-sdk-js) >= 5.0.0                                                  |

---

## Troubleshooting

| Issue                       | Solution                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Entity not accessible**   | Ensure your integration has access to the page/database—check the Notion connection settings            |
| **Rate limiting errors**    | Set a lower `concurrency` value (e.g., `3`) to reduce parallel API calls                                |
| **Cannot import (CJS)**     | `@notion-to-anything/core` is ESM-only; use dynamic `import()` in CommonJS or migrate to ESM            |
| **TypeScript errors**       | Ensure TypeScript 5.x+ and `"moduleResolution": "bundler"` or `"node16"` in tsconfig                    |
| **Stale data with caching** | Pass `{ cache: false }` to individual `getPage`/`getDatabase`/`getDataSource` calls to bypass the cache |
| **Missing block types**     | Ensure your `BlockTransformerMap` includes a `fallback` handler for unrecognized block types            |

### FAQ

**What is the difference between a Database and a DataSource?**
A `NotionDatabase` represents the database schema and settings. A `NotionDataSource` is a queryable view of that database, supporting search with filters, sorts, and pagination.

**Do I need to install `@notionhq/client` separately?**
Yes. It is a peer dependency—you create the `Client` instance yourself and pass it to `new Notion()`.

**How does caching work?**
When `cache: true` is set globally, entity promises are stored in memory by ID. Subsequent calls for the same ID return the cached promise. User resolution is always cached unless `cache` is explicitly set to `false`.

**Can I use this without a transformer?**
Absolutely. The `Notion` client and entity model are useful on their own for fetching metadata, searching pages, and querying data sources without any content transformation.

More help: [GitHub Issues](https://github.com/alvis/notion-to-anything-monorepo/issues) · [Discussions](https://github.com/alvis/notion-to-anything-monorepo/discussions)

---

## Related Packages

| Package                                                                                                            | Description                                      |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| [`@notion-to-anything/markdown`](https://github.com/alvis/notion-to-anything-monorepo/tree/main/packages/markdown) | Markdown transformer with YAML frontmatter       |
| [`@notion-to-anything/json`](https://github.com/alvis/notion-to-anything-monorepo/tree/main/packages/json)         | JSON transformer preserving full block structure |
| [`notion-to-anything`](https://www.npmjs.com/package/notion-to-anything)                                           | Convenience re-export of this package            |

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

**[Star on GitHub](https://github.com/alvis/notion-to-anything-monorepo)** · **[View on npm](https://www.npmjs.com/package/@notion-to-anything/core)** · **[Documentation](https://github.com/alvis/notion-to-anything-monorepo#readme)**

_The engine behind every notion-to-anything transformation._

</div>
