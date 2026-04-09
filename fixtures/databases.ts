import { buildDummyDatabase } from './factories/database';

import type { NotionAPIDatabase } from '#types/index';

/** complete database fixture with all required properties */
export const database = buildDummyDatabase() satisfies NotionAPIDatabase;
