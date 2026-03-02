import { buildDummyDatabase } from './factories/database';

import type { NotionAPIDatabase } from '#types';

/** complete database fixture with all required properties */
export const database = buildDummyDatabase() satisfies NotionAPIDatabase;
