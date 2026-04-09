<div align="center">

<img src="https://raw.githubusercontent.com/alvis/notion-to-anything/refs/heads/main/logo.svg" alt="notion-to-anything logo" width="220" />

# notion-to-anything

[![npm](https://img.shields.io/npm/v/notion-to-anything?style=flat-square)](https://www.npmjs.com/package/notion-to-anything)
[![downloads](https://img.shields.io/npm/dm/notion-to-anything?style=flat-square)](https://www.npmjs.com/package/notion-to-anything)
[![license](https://img.shields.io/github/license/alvis/notion-to-anything-monorepo.svg?style=flat-square)](https://github.com/alvis/notion-to-anything-monorepo/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-first-blue?style=flat-square)](https://www.typescriptlang.org/)

**The all-in-one Notion content toolkit**

_Fetch pages and databases from Notion and transform them into Markdown, JSON, or any custom format—with a single package._

</div>

---

## ⚡ Why notion-to-anything?

### 😩 The Problem

Working with Notion content programmatically is painful:

- **Complex API**: The Notion API returns deeply nested block trees that require recursive traversal and pagination handling
- **Scattered tools**: You need one package for the client, another for Markdown, yet another for JSON—each with different APIs
- **Manual wiring**: Connecting block fetching, child traversal, and content transformation requires significant boilerplate
- **No unified model**: Every tool has its own block representation, making it hard to switch formats or support multiple outputs

### 💡 The Solution

notion-to-anything gives you everything in one import:

- **🔌 Unified client**: Wraps `@notionhq/client` with automatic pagination, user enrichment, and concurrency control
- **📝 Markdown output**: Full Notion-to-Markdown transformer with YAML frontmatter, rich text annotations, and 25+ block types
- **📊 JSON output**: Structure-preserving JSON transformer with complete metadata, timestamps, and user attribution
- **🧩 Extensible**: Implement the `NotionTransformer` interface to create your own output format in minutes

---

## 🚀 What's in the Bundle

This package re-exports everything from three focused packages so you only need one install:

| Package                                                                                                            | Description                                                             |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| [`@notion-to-anything/core`](https://github.com/alvis/notion-to-anything-monorepo/tree/main/packages/core)         | Notion client, page/database/datasource fetching, transformer interface |
| [`@notion-to-anything/markdown`](https://github.com/alvis/notion-to-anything-monorepo/tree/main/packages/markdown) | Markdown transformer with block handlers and rich-text renderer         |
| [`@notion-to-anything/json`](https://github.com/alvis/notion-to-anything-monorepo/tree/main/packages/json)         | JSON transformer with full structure preservation                       |

```
┌─────────────────────────────────────────────┐
│            notion-to-anything               │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │     @notion-to-anything/core        │    │
│  │  Notion client, entities, types     │    │
│  └─────────────────────────────────────┘    │
│                    ▲                        │
│          ┌────────┴────────┐                │
│  ┌───────┴──────┐  ┌──────┴───────┐        │
│  │   /markdown  │  │    /json     │        │
│  │  Markdown +  │  │  Structured  │        │
│  │  frontmatter │  │  JSON output │        │
│  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────┘
```

---

## 📦 Installation

```bash
# npm
npm install notion-to-anything @notionhq/client

# pnpm
pnpm add notion-to-anything @notionhq/client

# yarn
yarn add notion-to-anything @notionhq/client
```

> `@notionhq/client` (^5.0.0) is a peer dependency—you must install it alongside this package.

---

## 📖 Usage Examples

### Quick Start—Page to Markdown

```ts
import { Client } from '@notionhq/client';
import { Notion, markdown } from 'notion-to-anything';

const notion = new Notion({
  client: new Client({ auth: process.env.NOTION_TOKEN }),
});

const page = await notion.getPage('your-page-id');
const content = await page.to(markdown);

console.log(content);
// ---
// title: My Page Title
// ---
//
// # Heading
// Paragraph content with **bold** and _italic_ text...
```

### Page to JSON

```ts
import { Client } from '@notionhq/client';
import { Notion, json } from 'notion-to-anything';

const notion = new Notion({
  client: new Client({ auth: process.env.NOTION_TOKEN }),
});

const page = await notion.getPage('your-page-id');
const data = await page.to(json);

console.log(data);
// {
//   id: 'abc-123',
//   title: 'My Page Title',
//   createdAt: '2025-01-01T00:00:00.000Z',
//   createdByName: 'Alice',
//   properties: { ... },
//   blocks: [
//     { id: '...', type: 'heading_1', heading_1: { ... }, children: [] },
//     { id: '...', type: 'paragraph', paragraph: { ... }, children: [] },
//   ]
// }
```

### Database Export

```ts
import { Client } from '@notionhq/client';
import { Notion, markdown } from 'notion-to-anything';

const notion = new Notion({
  client: new Client({ auth: process.env.NOTION_TOKEN }),
  concurrency: 5,
});

// Get a database and its datasources
const database = await notion.getDatabase('your-database-id');
const dataSources = await database.getDataSources();

// Query pages from the first datasource
const { pages } = await dataSources[0].search({
  sorts: [{ field: 'last_edited_time', order: 'desc' }],
  limit: 10,
});

// Transform each page to Markdown
for (const page of pages) {
  const content = await page.to(markdown);
  console.log(`--- ${page.title} ---`);
  console.log(content);
}
```

### Custom Transformer

Build your own output format by implementing the `NotionTransformer` interface:

```ts
import { Client } from '@notionhq/client';
import {
  Notion,
  createBlockTransformer,
  type NotionTransformer,
} from 'notion-to-anything';

// Define a plain-text transformer
const plainText = {
  block: createBlockTransformer({
    paragraph: (block) =>
      block.paragraph.rich_text.map((t) => t.plain_text).join(''),
    heading1: (block) =>
      block.heading_1.rich_text.map((t) => t.plain_text).join(''),
    heading2: (block) =>
      block.heading_2.rich_text.map((t) => t.plain_text).join(''),
    heading3: (block) =>
      block.heading_3.rich_text.map((t) => t.plain_text).join(''),
    fallback: () => null,
  }),
  page: (blocks, page) => ({
    title: page.title,
    text: blocks.join('\n'),
  }),
} satisfies NotionTransformer<string, { title: string; text: string }>;

const notion = new Notion({
  client: new Client({ auth: process.env.NOTION_TOKEN }),
});

const page = await notion.getPage('your-page-id');
const result = await page.to(plainText);

console.log(result.title);
console.log(result.text);
```

---

## 🤔 When to Use Which Package

| Use Case                          | Package                                 | Install                                                       |
| --------------------------------- | --------------------------------------- | ------------------------------------------------------------- |
| Want everything in one install    | `notion-to-anything`                    | `npm i notion-to-anything`                                    |
| Only need the core client + types | `@notion-to-anything/core`              | `npm i @notion-to-anything/core`                              |
| Only need Markdown output         | `@notion-to-anything/markdown` + `core` | `npm i @notion-to-anything/core @notion-to-anything/markdown` |
| Only need JSON output             | `@notion-to-anything/json` + `core`     | `npm i @notion-to-anything/core @notion-to-anything/json`     |
| Building a custom transformer     | `@notion-to-anything/core`              | `npm i @notion-to-anything/core`                              |

**Rule of thumb:** If you are unsure, install `notion-to-anything`. It includes everything and tree-shaking removes what you do not use.

---

## 🔄 Alternatives Comparison

| Feature                       | notion-to-anything | [notion-to-md](https://www.npmjs.com/package/notion-to-md) | [`@notionhq/client`](https://www.npmjs.com/package/@notionhq/client) raw |
| ----------------------------- | ------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Markdown output**           | ✅                 | ✅                                                         | ❌ (manual)                                                              |
| **JSON output**               | ✅                 | ❌                                                         | ❌ (manual)                                                              |
| **Custom transformers**       | ✅                 | Partial                                                    | ❌                                                                       |
| **YAML frontmatter**          | ✅                 | ❌                                                         | ❌                                                                       |
| **User enrichment**           | ✅                 | ❌                                                         | ❌                                                                       |
| **Concurrency control**       | ✅                 | ❌                                                         | ❌                                                                       |
| **Entity caching**            | ✅                 | ❌                                                         | ❌                                                                       |
| **Database querying**         | ✅                 | ❌                                                         | ✅                                                                       |
| **TypeScript-first**          | ✅                 | Partial                                                    | ✅                                                                       |
| **Recursive block traversal** | ✅                 | ✅                                                         | ❌ (manual)                                                              |

**When to choose what:**

- **notion-to-anything**—When you need a complete, type-safe pipeline from Notion API to multiple output formats with built-in concurrency and caching
- **notion-to-md**—When you only need basic Markdown conversion and do not need JSON, frontmatter, or custom formats
- **`@notionhq/client` raw**—When you need full API control and are comfortable writing your own traversal, pagination, and transformation logic

---

## 🌐 Compatibility & Size

| Requirement           | Value                                                                       |
| --------------------- | --------------------------------------------------------------------------- |
| **Node.js**           | >= 18.18                                                                    |
| **TypeScript**        | 5.x+                                                                        |
| **Module format**     | ESM only                                                                    |
| **Browsers**          | Not supported (requires `@notionhq/client` which is Node-only)              |
| **Peer dependencies** | [`@notionhq/client`](https://www.npmjs.com/package/@notionhq/client) ^5.0.0 |

---

## 🛠️ Troubleshooting

| Issue                                         | Solution                                                                                             |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **`Cannot find module 'notion-to-anything'`** | Ensure your project uses ESM (`"type": "module"` in package.json)—this package is ESM only           |
| **`@notionhq/client` not found**              | Install it as a peer dependency: `npm i @notionhq/client`                                            |
| **Authentication errors**                     | Verify your `NOTION_TOKEN` is a valid integration token and has access to the target pages/databases |
| **Empty page content**                        | Ensure your integration has been shared with the page in Notion (Settings > Connections)             |
| **Rate limiting (429 errors)**                | Use the `concurrency` option to limit parallel requests: `new Notion({ concurrency: 3 })`            |
| **TypeScript errors**                         | Ensure TypeScript 5.x+ and `"moduleResolution": "bundler"` or `"node16"` in tsconfig                 |
| **Missing block types in Markdown**           | Unsupported block types return `null` and are silently skipped—check the block type is handled       |

### ❓ FAQ

**Does this package work without the Notion API?**
No. This package requires `@notionhq/client` and a valid Notion integration token to fetch content from the Notion API.

**Can I use both Markdown and JSON transformers on the same page?**
Yes. Call `page.to(markdown)` and `page.to(json)` separately—each returns a different format from the same page object.

**How does caching work?**
Pass `cache: true` when creating the `Notion` client. Entity instances (pages, databases, datasources) are cached in memory for the lifetime of the client, avoiding duplicate API calls.

**Can I transform only specific block types?**
Yes. Use `createBlockTransformer()` with handlers for only the types you care about, plus a `fallback` handler that returns `null` for everything else.

More help: [GitHub Issues](https://github.com/alvis/notion-to-anything-monorepo/issues) · [Discussions](https://github.com/alvis/notion-to-anything-monorepo/discussions)

---

## 🤝 Contributing

This package is part of the [notion-to-anything monorepo](https://github.com/alvis/notion-to-anything-monorepo).

1. **Fork & Clone**: `git clone https://github.com/alvis/notion-to-anything-monorepo.git`
2. **Install**: `pnpm install`
3. **Develop**: `pnpm test:watch` for development mode
4. **Test**: `pnpm test && pnpm lint`
5. **Submit**: Create a pull request

**Code Style:**

- [Conventional Commits](https://conventionalcommits.org/)
- ESLint + Prettier enforced

---

## 🛡️ Security

Found a vulnerability? Please email [alvis@hilbert.space](mailto:alvis@hilbert.space) with details.
We aim to respond within 48 hours and patch as quickly as possible.

---

## 📄 License

**MIT** &copy; 2025-2026 [Alvis HT Tang](https://github.com/alvis)

Free for personal and commercial use. See [LICENSE](https://github.com/alvis/notion-to-anything-monorepo/blob/main/LICENSE) for details.

---

<div align="center">

**[⭐ Star on GitHub](https://github.com/alvis/notion-to-anything-monorepo)** · **[📦 View on npm](https://www.npmjs.com/package/notion-to-anything)** · **[📖 Documentation](https://github.com/alvis/notion-to-anything-monorepo#readme)**

_Transform Notion into anything—one package, every format._

</div>
