import { URL } from 'node:url';

import { MockAgent, setGlobalDispatcher } from 'undici';

import {
  buildDummyDataSource,
  buildDummyDataSourcePageList,
} from '../factories/datasource';
import { buildDummyBlockList } from '../factories/page';
import { buildUser } from '../factories/user';

/** configuration for mocking block list API responses */
interface BlockListParams {
  /** unique identifier of the parent block */
  readonly id: string;
  /** number of child blocks to generate */
  readonly blocks?: number;
  /** whether blocks should have nested children */
  readonly hasChildren?: boolean;
}

/** configuration for mocking datasource API responses */
interface DataSourceParams {
  /** unique identifier of the datasource */
  readonly id: string;
  /** number of pages to generate in the datasource */
  readonly pages?: number;
  /** number of blocks to generate per page */
  readonly blocks?: number;
}

/** request body structure for API pagination */
interface RequestBody {
  /** pagination cursor for continuing requests */
  readonly start_cursor?: string;
}

const HTTP_OK = 200;

// initialize mock agent for test isolation
const mockAgent = new MockAgent();
setGlobalDispatcher(mockAgent);

/**
 * mocks successful block list responses from the Notion API with configurable pagination support
 * recursively creates child blocks when hasChildren is true to simulate nested block structures
 * @param params configuration defining block ID, number of blocks, and children behavior
 */
export const setupBlockList = (params: BlockListParams): void => {
  const { id: blockId, blocks: count = 0, hasChildren = true } = params;

  if (hasChildren) {
    // mock the API for the children
    for (let i = 0; i < count; i++) {
      setupBlockList({
        id: `${blockId}-block${i}`,
        blocks: 1,
        hasChildren: false,
      });
    }
  }

  mockAgent
    .get('https://api.notion.com')
    .intercept({
      method: 'GET',
      path: (path) => path.startsWith(`/v1/blocks/${blockId}/children`),
    })
    .reply(HTTP_OK, ({ path }: { path: string }) => {
      const query = new URL(path, 'https://api.notion.com').searchParams;

      const current = Number(query.get('start_cursor') ?? '0');

      return buildDummyBlockList({
        // NOTE: one block per call
        blockIds: [`${blockId}-block${current}`],
        parent: { type: 'block_id', block_id: blockId },
        hasChildren,
        next: current + 1 < count ? `${current + 1}` : null,
      });
    })
    .persist();
};

/**
 * mocks user responses from the Notion API for testing user-related functionality
 * creates persistent mock for the specified user ID that will respond to all subsequent requests
 * @param params configuration for user properties including ID, name, email, and avatar
 */
export const setupUser = (params: Parameters<typeof buildUser>[0]): void => {
  const body = buildUser(params);

  mockAgent
    .get('https://api.notion.com')
    .intercept({
      method: 'GET',
      path: `/v1/users/${body.id}`,
    })
    .reply(HTTP_OK, body)
    .persist();
};

/**
 * mocks datasource responses from the Notion API including associated users and page lists
 * automatically sets up related mocks for datasource creator and paginated page content
 * @param params configuration specifying datasource ID, number of pages, and blocks per page
 */
export const setupDataSource = (params: DataSourceParams): void => {
  const { id: dataSourceID, pages = 1, blocks = 1 } = params;

  const body = buildDummyDataSource({ id: dataSourceID });

  setupUser({ id: body.created_by.id });
  setupDataSourcePageList({ id: dataSourceID, pages, blocks });

  mockAgent
    .get('https://api.notion.com')
    .intercept({
      method: 'GET',
      path: `/v1/data_sources/${dataSourceID}`,
    })
    .reply(HTTP_OK, body)
    .persist();
};

/**
 * mocks datasource page list responses from the Notion API with pagination support
 * creates individual block list mocks for each page and handles cursor-based pagination
 * @param params configuration defining datasource ID, number of pages, and blocks per page
 */
const setupDataSourcePageList = (params: DataSourceParams): void => {
  const { id, pages = 0, blocks = 1 } = params;

  for (const pageID of [...Array(pages).keys()]) {
    setupBlockList({ id: `${id}-page${pageID}`, blocks });
  }

  mockAgent
    .get('https://api.notion.com')
    .intercept({
      method: 'POST',
      path: `/v1/data_sources/${id}/query`,
    })
    .reply(HTTP_OK, (request) => {
      const requestBody = JSON.parse(request.body as string) as RequestBody;
      const startCursor: string | undefined = requestBody.start_cursor;
      const currentPageMatch = startCursor?.match(/^.*-page(\d+)$/);
      const current = currentPageMatch ? Number(currentPageMatch[1]) : 0;

      return buildDummyDataSourcePageList({
        databaseID: id,
        // NOTE: one page per call
        pageIDs: [`${id}-page${current}`],
        next: current + 1 < pages ? `${id}-page${current + 1}` : null,
      });
    })
    .persist();
};
