import { buildDummyDataSource } from './factories/datasource';

import type {
  InaccessibleNotionAPIDataSource,
  NotionAPIDataSource,
} from '#types/index';

/** complete datasource fixture with all required properties */
export const dataSource = buildDummyDataSource() satisfies NotionAPIDataSource;

/** minimal datasource fixture representing an inaccessible datasource */
export const inaccessibleDataSource = {
  object: 'data_source',
  id: 'id',
  properties: {},
} satisfies InaccessibleNotionAPIDataSource;
