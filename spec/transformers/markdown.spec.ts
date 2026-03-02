import { Client } from '@notionhq/client';
import { describe, expect, it } from 'vitest';

import { NotionPage } from '#page';
import { markdown as Markdown } from '#transformers/markdown';

import { buildDummyPage } from '../fixtures/factories/page';

// use global fetch instead of the default node-fetch from @notionhq/client so that we can mock the API
const client = new Client({ fetch });

describe('fn:page', () => {
  const page = new NotionPage(client, buildDummyPage());

  it('should transform page with blocks and frontmatter', () => {
    const blocks = ['# Heading', 'Paragraph content', ''];

    const result = Markdown.page(blocks, page);

    expect(result).toEqual(`---
title: Title
---

# Heading
Paragraph content

`);
  });

  it('should handle mixed content types and filter null values', () => {
    const page = buildDummyPage();
    const blocks = [
      '# Header',
      '',
      'Paragraph',
      '## Subheader',
    ] satisfies string[];

    const result = Markdown.page(blocks, new NotionPage(client, page));

    const content = result.split('\n---\n\n')[1];
    expect(content).toContain('# Header');
    expect(content).toContain('Paragraph');
    expect(content).toContain('## Subheader');
    expect(content).not.toContain('null');
  });
});
