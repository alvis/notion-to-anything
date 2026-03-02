import { buildDummyPage } from './factories/page';

import type { InaccessibleNotionAPIPage } from '#types';

/** complete page fixture with all required properties */
export const page = buildDummyPage();

/** minimal page fixture representing an inaccessible page */
export const inaccessiblePage = {
  object: 'page',
  id: 'page-id',
} satisfies InaccessibleNotionAPIPage;
