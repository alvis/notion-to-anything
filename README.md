<div align="center">

<img src="https://raw.githubusercontent.com/alvis/notion-to-anything/refs/heads/main/logo.svg" width="220" alt="notion-to-anything" />

# notion-to-anything

[![npm](https://img.shields.io/npm/dm/notion-to-anything?style=flat-square)](https://www.npmjs.com/package/notion-to-anything)
[![build](https://img.shields.io/github/actions/workflow/status/alvis/notion-to-anything-monorepo/test.yaml?style=flat-square)](https://github.com/alvis/notion-to-anything-monorepo/actions)
[![license](https://img.shields.io/github/license/alvis/notion-to-anything-monorepo.svg?style=flat-square)](https://github.com/alvis/notion-to-anything-monorepo/blob/main/LICENSE)

**A programmable Notion content engine** — recursive export, database traversal, link resolution, and a pluggable transformer architecture for any output format.

_Transforms Notion pages and databases into Markdown, JSON, or any custom format with full TypeScript type safety._

</div>

---

## ⚡ Quick Start

```bash
# npm
npm install notion-to-anything @notion-to-anything/markdown @notionhq/client
# pnpm
pnpm add notion-to-anything @notion-to-anything/markdown @notionhq/client
# yarn
yarn add notion-to-anything @notion-to-anything/markdown @notionhq/client
```

```ts
import { Client } from '@notionhq/client';
import { Notion } from 'notion-to-anything';
import { markdown } from '@notion-to-anything/markdown';

const notion = new Notion({
  client: new Client({ auth: process.env.NOTION_TOKEN }),
});

const page = await notion.getPage('your-page-id');
const content = await page.to(markdown);
```

---

## ✨ Why notion-to-anything?

### 😩 The Problem

Working with the Notion API for content export is painful:

- **One page at a time**: The API gives you blocks for a single page—recursing into child pages and databases is on you
- **No transformation layer**: Raw API responses are deeply nested JSON with no straightforward path to Markdown, HTML, or any other format
- **Database traversal is manual**: Filtering, sorting, paginating, and extracting properties from databases requires boilerplate
- **Rate limiting headaches**: Bulk exports hammer the API without careful concurrency control, leading to 429 errors
- **Existing tools are limited**: Most Notion-to-Markdown libraries handle only single pages with no pluggable architecture

### 💡 The Solution

notion-to-anything is a programmable content engine that handles the hard parts:

- **🔄 Recursive page export**: Traverse entire page hierarchies automatically, not just one page at a time
- **🗄️ Full database traversal**: Query pages with filters, sorts, pagination, and property extraction
- **🔌 Pluggable transformers**: Block-level architecture lets you plug in any output format—Markdown, JSON, HTML, React, or your own
- **🔗 Link resolution**: Cross-reference fidelity between pages is preserved during export
- **⚡ Concurrent rate limiting**: Bulk exports stay fast and safe with built-in `p-queue` concurrency control
- **💾 Entity caching**: Avoids redundant API calls across traversal for maximum efficiency

---

## 🚀 Key Features

| Feature                      | notion-to-anything | [notion-to-md](https://github.com/souvikinator/notion-to-md) | [Notion API](https://github.com/makenotion/notion-sdk-js) |
| ---------------------------- | ------------------ | ------------------------------------------------------------ | --------------------------------------------------------- |
| **Single page export**       | ✅                 | ✅                                                           | Manual                                                    |
| **Recursive page export**    | ✅                 | ❌                                                           | Manual                                                    |
| **Database traversal**       | ✅                 | ❌                                                           | Manual                                                    |
| **Custom transformers**      | ✅—fully pluggable | Limited                                                      | ❌                                                        |
| **Multiple output formats**  | ✅—any format      | Markdown only                                                | Raw JSON                                                  |
| **Type safety**              | ✅—full generics   | Partial                                                      | Partial                                                   |
| **Concurrent rate limiting** | ✅—built-in        | ❌                                                           | Manual                                                    |
| **Entity caching**           | ✅—built-in        | ❌                                                           | ❌                                                        |
| **YAML frontmatter**         | ✅                 | ❌                                                           | ❌                                                        |

---

## 📦 Packages

| Package                                               | Description                                                                          | Version                                                                                                                                           |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@notion-to-anything/core`](./packages/core)         | Client, entities, traversal, cache, transformer contract, `createBlockTransformer()` | [![npm](https://img.shields.io/npm/v/@notion-to-anything/core?style=flat-square)](https://www.npmjs.com/package/@notion-to-anything/core)         |
| [`@notion-to-anything/markdown`](./packages/markdown) | Markdown block handlers, rich-text renderer, YAML frontmatter                        | [![npm](https://img.shields.io/npm/v/@notion-to-anything/markdown?style=flat-square)](https://www.npmjs.com/package/@notion-to-anything/markdown) |
| [`@notion-to-anything/json`](./packages/json)         | JSON block and page transformer preserving full block structure                      | [![npm](https://img.shields.io/npm/v/@notion-to-anything/json?style=flat-square)](https://www.npmjs.com/package/@notion-to-anything/json)         |
| [`notion-to-anything`](./packages/notion-to-anything) | Convenience package—re-exports `@notion-to-anything/core`                            | [![npm](https://img.shields.io/npm/v/notion-to-anything?style=flat-square)](https://www.npmjs.com/package/notion-to-anything)                     |

---

## 🏗️ Project Structure

```
notion-to-anything-monorepo/
├── packages/
│   ├── core/                  # @notion-to-anything/core
│   │   └── src/
│   │       ├── client/        # Notion API client wrapper
│   │       ├── entities/      # Page, DataSource, Database entities
│   │       ├── transformer/   # Block transformer factory
│   │       ├── traversal/     # Recursive page/database traversal
│   │       └── types/         # Shared TypeScript types
│   ├── markdown/              # @notion-to-anything/markdown
│   ├── json/                  # @notion-to-anything/json
│   └── notion-to-anything/    # notion-to-anything (bundle)
├── package.json               # Workspace root (pnpm)
└── pnpm-workspace.yaml
```

### Dependency Graph

```
notion-to-anything  ─────► @notion-to-anything/core ◄──── @notionhq/client (peer)
                                    ▲         ▲
                                    │         │
                    @notion-to-anything/markdown
                                    │
                    @notion-to-anything/json
```

- **`@notion-to-anything/core`** is the foundation—client, entities, traversal, caching, and the transformer contract
- **`@notion-to-anything/markdown`** and **`@notion-to-anything/json`** are transformer plugins that depend on core
- **`notion-to-anything`** is the convenience bundle that re-exports core for simpler imports

---

## 📖 Usage Examples

### Export a Page to Markdown

```ts
import { Client } from '@notionhq/client';
import { Notion } from 'notion-to-anything';
import { markdown } from '@notion-to-anything/markdown';

const notion = new Notion({
  client: new Client({ auth: process.env.NOTION_TOKEN }),
});

const page = await notion.getPage('page-id');
const md = await page.to(markdown);
// Returns a string with YAML frontmatter + Markdown content
```

### Export a Page to JSON

```ts
import { json } from '@notion-to-anything/json';

const page = await notion.getPage('page-id');
const data = await page.to(json);
// Returns { properties, id, title, url, blocks: [...] }
```

### Export an Entire Database

```ts
const dataSource = await notion.getDataSource('database-id');

const { pages, cursor } = await dataSource.search({
  filter: { property: 'Status', select: { equals: 'Published' } },
  sorts: [{ field: 'Publish Date', order: 'desc' }],
  limit: 50,
});

const results = await Promise.all(pages.map((page) => page.to(markdown)));
```

### Custom Transformer

```ts
import { createBlockTransformer } from '@notion-to-anything/core';

import type { NotionTransformer } from '@notion-to-anything/core';

const plainText: NotionTransformer<string, string> = {
  block: createBlockTransformer<string>({
    paragraph: (block) =>
      block.paragraph.rich_text.map((part) => part.plain_text).join(''),
    heading1: (block) =>
      block.heading_1.rich_text.map((part) => part.plain_text).join(''),
    fallback: () => null,
  }),
  page: (blocks, page) => [`# ${page.title}`, ...blocks].join('\n\n'),
};

const content = await page.to(plainText);
```

---

## 🔧 API Reference

### Core Client

| Export                        | Description                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| `Notion`                      | Main client wrapping `@notionhq/client` with concurrency control and entity caching |
| `NotionPage`                  | Page entity with `to(transformer)` for block transformation                         |
| `NotionDataSource`            | Data source entity with `search()` for filtered, paginated queries                  |
| `NotionDatabase`              | Database entity with `getDataSources()`                                             |
| `createBlockTransformer(map)` | Converts a block-type handler map into a `NotionBlockTransformer` function          |

### Types

| Type                        | Description                                                               |
| --------------------------- | ------------------------------------------------------------------------- |
| `NotionTransformer<B, P>`   | Contract with `block(block) => B` and `page(blocks, page) => P`           |
| `NotionBlockTransformer<B>` | Single block transformer function                                         |
| `BlockTransformerMap<B>`    | Handler map keyed by camelCase block type + required `fallback`           |
| `NotionOptions`             | Configuration for `Notion` constructor (`client`, `concurrency`, `cache`) |
| `QueryOptions`              | Filter, sort, pagination, and concurrency options for `search()`          |
| `NotionMetadata`            | Normalized metadata shared by pages, data sources, and databases          |

See individual package READMEs for detailed API documentation:

- [`@notion-to-anything/core` API](./packages/core#-api-reference)
- [`@notion-to-anything/markdown` API](./packages/markdown#-api-reference)
- [`@notion-to-anything/json` API](./packages/json#-api-reference)

---

## 🌐 Compatibility & Size

| Requirement         | Value                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Node.js**         | >= 18.18                                                                                                                    |
| **TypeScript**      | 5.x+                                                                                                                        |
| **Module format**   | ESM only                                                                                                                    |
| **Package manager** | pnpm 10.x (workspace monorepo)                                                                                              |
| **Peer dependency** | [`@notionhq/client`](https://github.com/makenotion/notion-sdk-js) ^5.0.0                                                    |
| **Runtime deps**    | [`p-queue`](https://github.com/sindresorhus/p-queue), [`type-fest`](https://github.com/sindresorhus/type-fest) (types only) |

---

## 🎨 Supported Block Types

The built-in transformers handle all Notion block types:

- **Text**: `paragraph`, `heading_1`, `heading_2`, `heading_3`, `quote`, `code`, `equation`
- **Lists**: `bulleted_list_item`, `numbered_list_item`, `to_do`
- **Media**: `image`, `video`, `audio`, `file`, `pdf`, `bookmark`, `embed`, `link_preview`
- **Advanced**: `table`, `table_row`, `column_list`, `column`, `callout`, `toggle`, `synced_block`, `template`
- **Layout**: `divider`, `breadcrumb`, `table_of_contents`
- **Navigation**: `child_page`, `child_database`, `link_to_page`
- **Other**: `transcription`, `unsupported` (handled gracefully as `null`)

Custom transformers can handle any subset—unhandled types fall through to the required `fallback` handler.

---

## ⚔️ Alternatives

|                         | notion-to-anything                         | [notion-to-md](https://github.com/souvikinator/notion-to-md) | [@notionhq/client](https://github.com/makenotion/notion-sdk-js) |
| ----------------------- | ------------------------------------------ | ------------------------------------------------------------ | --------------------------------------------------------------- |
| **Purpose**             | Programmable content engine                | Markdown converter                                           | Raw API client                                                  |
| **Output formats**      | Any (pluggable)                            | Markdown only                                                | Raw JSON                                                        |
| **Recursive export**    | Yes                                        | No                                                           | Manual                                                          |
| **Database traversal**  | Yes                                        | No                                                           | Manual                                                          |
| **Custom transformers** | Yes                                        | Limited                                                      | No                                                              |
| **Type safety**         | Full generics                              | Partial                                                      | Partial                                                         |
| **Best for**            | Bulk export, CMS pipelines, custom formats | Quick single-page Markdown                                   | Direct API access                                               |

- **notion-to-md**—simpler, single-page Markdown only. Choose this if you just need one page as `.md`.
- **@notionhq/client**—the raw API with no transformation layer. Choose this if you need direct API access without abstraction.
- **notion-to-anything**—choose this when you need recursive export, database traversal, multiple output formats, or a custom transformer pipeline.

---

## 🛠️ Troubleshooting

| Issue                        | Solution                                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Cannot import (CJS)**      | All packages are ESM-only; use dynamic `import()` in CommonJS or migrate to ESM                       |
| **TypeScript errors**        | Ensure TypeScript 5.x+ and `"moduleResolution": "bundler"` or `"node16"` in tsconfig                  |
| **Rate limit errors (429)**  | Reduce concurrency in `NotionOptions`—the default is conservative but heavy databases may need tuning |
| **Missing blocks in output** | Ensure your transformer has a `fallback` handler—unhandled block types return `null` silently         |
| **Stale data in traversal**  | Entity caching is enabled by default; pass `cache: false` in options to disable                       |
| **Peer dependency warnings** | Install `@notionhq/client` ^5.0.0 as a peer dependency alongside any notion-to-anything package       |

### ❓ FAQ

**Do I need to install all packages?**
No. Install `notion-to-anything` (or `@notion-to-anything/core`) plus only the transformer(s) you need. For example, if you only need Markdown, install `notion-to-anything` and `@notion-to-anything/markdown`.

**Can I write my own transformer?**
Yes. Use `createBlockTransformer()` from `@notion-to-anything/core` with a handler map for the block types you care about. See the [Custom Transformer](#custom-transformer) example above.

**What is the `notion-to-anything` package vs `@notion-to-anything/core`?**
They are functionally identical. `notion-to-anything` re-exports everything from `@notion-to-anything/core` for a simpler import path. Use whichever you prefer.

**Does it work with Notion API v2024-xx?**
It works with `@notionhq/client` ^5.0.0. Check the [Notion SDK releases](https://github.com/makenotion/notion-sdk-js/releases) for API version compatibility.

More help: [GitHub Issues](https://github.com/alvis/notion-to-anything-monorepo/issues) · [Discussions](https://github.com/alvis/notion-to-anything-monorepo/discussions)

---

## 🤝 Contributing

Contributions are welcome! This is a pnpm workspace monorepo.

1. **Fork & Clone**: `git clone https://github.com/alvis/notion-to-anything-monorepo.git`
2. **Install**: `pnpm install`
3. **Build**: `pnpm build`
4. **Test**: `pnpm test`
5. **Lint**: `pnpm lint`
6. **Typecheck**: `pnpm typecheck`
7. **Submit**: Create a pull request

**Dev workflow:**

```bash
# Install all dependencies (including workspace links)
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Lint all packages
pnpm lint

# Type-check all packages
pnpm typecheck
```

**Code style:**

- [Conventional Commits](https://conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, etc.)
- ESLint + Prettier enforced via [presetter](https://github.com/nicolo-ribaudo/presetter)
- All packages share the same toolchain configuration

---

## 🛡️ Security

Found a vulnerability? Please email [alvis@hilbert.space](mailto:alvis@hilbert.space) with details.
We aim to respond within 48 hours and patch as quickly as possible.

Do **not** open a public issue for security vulnerabilities.

---

## 📄 License

**MIT** © 2025-2026 [Alvis HT Tang](https://github.com/alvis)

Free for personal and commercial use. See [LICENSE](LICENSE) for details.

---

<div align="center">

**[⭐ Star on GitHub](https://github.com/alvis/notion-to-anything-monorepo)** · **[📦 View on npm](https://www.npmjs.com/package/notion-to-anything)** · **[🐛 Report an Issue](https://github.com/alvis/notion-to-anything-monorepo/issues)**

_Built for developers who need more than simple Markdown export from Notion._

</div>
