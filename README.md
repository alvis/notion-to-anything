# ![Logo](logo.svg)

<div align="center">

[![npm](https://img.shields.io/npm/v/notion-to-anything?style=flat-square)](https://github.com/alvis/notion-to-anything/releases)
[![build](https://img.shields.io/github/actions/workflow/status/alvis/notion-to-anything/test.yaml?style=flat-square)](https://github.com/alvis/notion-to-anything/actions)
[![coverage](https://img.shields.io/codeclimate/coverage/alvis/notion-to-anything?style=flat-square)](https://codeclimate.com/github/alvis/notion-to-anything/test_coverage)
[![vulnerabilities](https://img.shields.io/sonar/vulnerabilities/alvis_notion-to-anything/master?server=https%3A%2F%2Fsonarcloud.io&style=flat-square)](https://sonarcloud.io/summary/new_code?id=alvis_notion-to-anything)
[![dependencies](https://img.shields.io/librariesio/release/npm/notion-to-anything?style=flat-square)](https://libraries.io/npm/notion-to-anything)
[![license](https://img.shields.io/github/license/alvis/notion-to-anything.svg?style=flat-square)](https://github.com/alvis/notion-to-anything/blob/main/LICENSE)

**Transform Notion pages into any format — flexible TypeScript library with extensible transformer architecture.**

• [Quick Start](#-quick-start) • [Usage](#-usage) • [API Reference](#-api-reference) •

</div>

Transform Notion pages into any format with **notion-to-anything** — a TypeScript library with an extensible transformer architecture. Build your own output pipelines for markdown, JSON, HTML, React, or any custom target.

## ⚡ Quick Start

### 1️⃣ Install

```bash
npm install notion-to-anything @notionhq/client
```

### 2️⃣ Transform with a built-in transformer

```typescript
import { Client } from '@notionhq/client';
import { Notion } from 'notion-to-anything';
import { markdown } from 'notion-to-anything/transformers';

const notion = new Notion({
  client: new Client({ auth: process.env.NOTION_TOKEN }),
});

const page = await notion.getPage('your-page-id');
const content = await page.to(markdown); // ✨ That's it!
```

### 3️⃣ Or build your own transformer

```typescript
import { createBlockTransformer } from 'notion-to-anything/transformers';

const textTransformer = {
  block: createBlockTransformer<string>({
    paragraph: (block) =>
      block.paragraph.rich_text.map((part) => part.plain_text).join(''),
    fallback: () => null,
  }),
  page: (blocks, page) => [`# ${page.title}`, ...blocks].join('\n\n'),
};

const content = await page.to(textTransformer);
```

**Key Features:**

- 🔄 Flexible transformer pipeline for any output shape
- 🎨 Custom transformers for any output format
- 📊 Data source and workspace search APIs
- 🔧 TypeScript support with full type safety

## 📖 Usage

> All examples below assume the `notion` client from [Quick Start](#-quick-start) is already initialized.

### Example: transform a page with a block map

This example builds a plain-text renderer using `createBlockTransformer`, then runs it with `NotionPage#to`.

```ts
import type { NotionTransformer } from 'notion-to-anything';
import { createBlockTransformer } from 'notion-to-anything/transformers';

const textTransformer: NotionTransformer<string, string> = {
  block: createBlockTransformer<string>({
    heading1: (block) =>
      `# ${block.heading_1.rich_text.map((part) => part.plain_text).join('')}`,
    paragraph: (block) =>
      block.paragraph.rich_text.map((part) => part.plain_text).join(''),
    toDo: (block) =>
      `- [${block.to_do.checked ? 'x' : ' '}] ${block.to_do.rich_text
        .map((part) => part.plain_text)
        .join('')}`,
    fallback: () => null,
  }),
  page: (blocks, page) => [`# ${page.title}`, ...blocks].join('\n\n'),
};

export async function renderPage(pageId: string): Promise<string> {
  const page = await notion.getPage(pageId);

  return page.to(textTransformer, { concurrency: 4 });
}
```

### Example: query a data source with pagination

Use `NotionDataSource#search` for filtering, sorting, cursor pagination, and offset emulation.

```ts
export async function listPublishedTitles(
  dataSourceId: string,
): Promise<{ titles: string[]; cursor?: string }> {
  const dataSource = await notion.getDataSource(dataSourceId);

  const { pages, cursor } = await dataSource.search({
    filter: { property: 'Status', select: { equals: 'Published' } },
    sorts: [{ field: 'Publish Date', order: 'desc' }],
    limit: 20,
    offset: 0,
  });

  return {
    titles: pages.map((page) => page.title),
    cursor,
  };
}
```

### Example: workspace search and parent traversal

This combines workspace search with parent resolution for navigation or breadcrumb use cases.

```ts
export async function listSearchResults(query: string): Promise<string[]> {
  const { pages } = await notion.searchPages({
    query,
    sorts: [{ field: 'last_edited_time', order: 'desc' }],
    limit: 10,
  });

  return Promise.all(
    pages.map(async (page) => {
      const parent = await page.getParent();

      return parent ? `${page.title} (parent: ${parent.title})` : page.title;
    }),
  );
}
```

## 📚 API Reference

### Core Client

<details>
<summary><code>new Notion(options?: NotionOptions)</code></summary>

**Description:** Creates a client wrapper around `@notionhq/client` with optional global concurrency control.

**Parameters:**

- `options` (`NotionOptions`): optional configuration object
- `options.client` (`Client`): pre-configured Notion SDK client
- `options.concurrency` (`number`): positive integer default for concurrent enrichment/traversal operations

**Throws:**

- `Error`: if `options.concurrency` is not a positive integer

**Example:**

```ts
import { Client } from '@notionhq/client';
import { Notion } from 'notion-to-anything';

const notion = new Notion({
  client: new Client({ auth: process.env.NOTION_TOKEN }),
  concurrency: 10,
});
```

</details>

<details>
<summary><code>getUser(id: string): Promise&lt;NotionUser&gt;</code></summary>

**Description:** Retrieves a user and returns normalized user metadata.

**Parameters:**

- `id` (`string`): user UUID

**Returns:**

- `Promise<NotionUser>`: resolved user model with `id`, `type`, `name`, `avatar`, and `email`

**Throws:**

- `Error`: when the user is not accessible

</details>

<details>
<summary><code>getDatabase(id: string): Promise&lt;NotionDatabase&gt;</code></summary>

**Description:** Retrieves a database entity instance by UUID.

**Parameters:**

- `id` (`string`): database UUID

**Returns:**

- `Promise<NotionDatabase>`: database instance with metadata helpers and `getDataSources()`

</details>

<details>
<summary><code>getDataSource(id: string): Promise&lt;NotionDataSource&gt;</code></summary>

**Description:** Retrieves a data source entity instance by UUID.

**Parameters:**

- `id` (`string`): data source UUID

**Returns:**

- `Promise<NotionDataSource>`: data source instance with `search()` and metadata accessors

</details>

<details>
<summary><code>getPage(id: string): Promise&lt;NotionPage&gt;</code></summary>

**Description:** Retrieves a page entity instance by UUID.

**Parameters:**

- `id` (`string`): page UUID

**Returns:**

- `Promise<NotionPage>`: page instance with block transformation APIs

</details>

<details>
<summary><code>searchPages(options?: QueryOptions&lt;'last_edited_time'&gt;): Promise&lt;{ pages: NotionPage[]; cursor?: string }&gt;</code></summary>

**Description:** Runs workspace-level page search with query, sort, offset, cursor, and limit controls.

**Parameters:**

- `options` (`QueryOptions<'last_edited_time'>`): search and pagination options

**Returns:**

- `Promise<{ pages: NotionPage[]; cursor?: string }>`: page instances plus cursor for the next request

**Example:**

```ts
const { pages, cursor } = await notion.searchPages({
  query: 'release notes',
  sorts: [{ field: 'last_edited_time', order: 'desc' }],
  limit: 25,
});
```

</details>

<details>
<summary><code>searchDataSources(options?: QueryOptions&lt;'last_edited_time'&gt;): Promise&lt;{ dataSources: NotionDataSource[]; cursor?: string }&gt;</code></summary>

**Description:** Runs workspace-level data source search with the same pagination controls as page search.

**Parameters:**

- `options` (`QueryOptions<'last_edited_time'>`): search and pagination options

**Returns:**

- `Promise<{ dataSources: NotionDataSource[]; cursor?: string }>`: data source instances plus cursor for the next request

</details>

### Entity Instances

<details>
<summary><code>NotionEntity#getMetadata(): NotionMetadata</code></summary>

**Description:** Returns normalized metadata shared by pages, data sources, and databases.

**Returns:**

- `NotionMetadata`: `{ id, title, url, publicUrl, inTrash, createdByName, createdByEmail, createdByAvatar, createdAt, lastEditedByName, lastEditedByEmail, lastEditedByAvatar, lastEditedAt, coverImage, iconEmoji, iconImage }`

</details>

<details>
<summary><code>NotionEntity#getParent(): Promise&lt;NotionDatabase | NotionDataSource | NotionPage | null&gt;</code></summary>

**Description:** Resolves the current entity's parent where available.

**Returns:**

- `Promise<NotionDatabase | NotionDataSource | NotionPage | null>`: resolved parent entity, or `null` for workspace/block-only parents

</details>

<details>
<summary><code>NotionPage#to&lt;B, P&gt;(transformer: NotionTransformer&lt;B, P&gt;, options?: { concurrency?: number; signal?: AbortSignal }): Promise&lt;P&gt;</code></summary>

**Description:** Fetches page blocks recursively, applies `transformer.block` to each block, then calls `transformer.page`.

**Parameters:**

- `transformer` (`NotionTransformer<B, P>`): block and page transformer implementation
- `options` (`{ concurrency?: number; signal?: AbortSignal }`): traversal overrides for this call

**Returns:**

- `Promise<P>`: final transformed output from `transformer.page`

**Throws:**

- `Error`: if `options.concurrency` is invalid
- `AbortError`: when `options.signal` is aborted

</details>

<details>
<summary><code>NotionDataSource#search(options?: QueryOptions): Promise&lt;{ pages: NotionPage[]; cursor?: string }&gt;</code></summary>

**Description:** Queries pages inside a single data source with filter/sort/pagination options.

**Parameters:**

- `options` (`QueryOptions`): filter, sorts, cursor, offset, limit, concurrency, and signal

**Returns:**

- `Promise<{ pages: NotionPage[]; cursor?: string }>`: page instances plus next cursor

</details>

<details>
<summary><code>NotionDatabase#getDataSources(options?: { concurrency?: number; signal?: AbortSignal }): Promise&lt;NotionDataSource[]&gt;</code></summary>

**Description:** Retrieves all accessible data sources from a database.

**Parameters:**

- `options` (`{ concurrency?: number; signal?: AbortSignal }`): enrichment concurrency and cancellation controls

**Returns:**

- `Promise<NotionDataSource[]>`: accessible data source instances

</details>

### Transformer Utilities

<details>
<summary><code>markdown: NotionTransformer&lt;string, string&gt;</code></summary>

**Description:** Built-in transformer that converts Notion pages to Markdown with YAML frontmatter. Handles all block types listed in [Supported Block Types](#-supported-block-types).

**Example:**

```ts
import { markdown } from 'notion-to-anything/transformers';

const content = await page.to(markdown);
```

</details>

<details>
<summary><code>json: NotionTransformer&lt;JsonBlock, JsonPage&gt;</code></summary>

**Description:** Built-in transformer that preserves the complete block structure as JSON, including metadata, properties, and timestamps.

**Example:**

```ts
import { json } from 'notion-to-anything/transformers';

const content = await page.to(json);
```

</details>

<details>
<summary><code>createBlockTransformer&lt;B&gt;(transformerByType: BlockTransformerMap&lt;B&gt;): NotionBlockTransformer&lt;B&gt;</code></summary>

**Description:** Converts a block-type handler map into a `NotionTransformer.block` function.

**Parameters:**

- `transformerByType` (`BlockTransformerMap<B>`): block handlers keyed in camelCase (`heading1`, `toDo`, `tableOfContents`) plus required `fallback`

**Returns:**

- `NotionBlockTransformer<B>`: single block transformer function for `NotionPage#to`

**Example:**

```ts
import { createBlockTransformer } from 'notion-to-anything/transformers';

const block = createBlockTransformer<string>({
  paragraph: (value) =>
    value.paragraph.rich_text.map((part) => part.plain_text).join(''),
  fallback: () => null,
});
```

</details>

<details>
<summary><code>NotionTransformer&lt;B, P&gt;</code></summary>

**Description:** Core transformation contract used by `NotionPage#to`.

**Type Signature:**

```ts
interface NotionTransformer<B = unknown, P = unknown> {
  block(
    block: NotionBlockWithTransformedChildren<B>,
  ): B | Promise<B | null> | null;
  page(blocks: B[], page: NotionPage): P | Promise<P>;
}
```

</details>

## 🎨 Supported Block Types

The library supports all Notion block types. The built-in `markdown` (see [`src/transformers/markdown/block.ts`](src/transformers/markdown/block.ts)) provides handlers for each:

- **Text**: `paragraph`, `heading_1`, `heading_2`, `heading_3`, `quote`, `code`, `equation`
- **Lists**: `bulleted_list_item`, `numbered_list_item`, `to_do`
- **Media**: `image`, `video`, `audio`, `file`, `pdf`, `bookmark`, `embed`, `link_preview`
- **Advanced**: `table`, `table_row`, `column_list`, `column`, `callout`, `toggle`, `synced_block`, `template`
- **Layout**: `divider`, `breadcrumb`, `table_of_contents`
- **Navigation**: `child_page`, `child_database`, `link_to_page`
- **Other**: `transcription`, `unsupported` (handled gracefully as `null`)

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the [notion-to-anything repository](https://github.com/alvis/notion-to-anything)
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/alvis/notion-to-anything/blob/main/LICENSE) file for details.

---

## 🔗 Related Projects

- [notion-to-md](https://github.com/souvikinator/notion-to-md) - Notion to Markdown converter
- [react-notion-x](https://github.com/NotionX/react-notion-x) - React renderer for Notion
- [@notionhq/client](https://github.com/makenotion/notion-sdk-js) - Official Notion JavaScript SDK
