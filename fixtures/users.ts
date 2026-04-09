import { buildUser } from './factories/user';

import type { InaccessibleNotionAPIUser, NotionAPIUser } from '#types/index';

/** inaccessible user fixture with minimal object properties */
export const inaccessibleUser = {
  id: 'inaccessible_user',
  object: 'user',
} satisfies InaccessibleNotionAPIUser;

/** person user fixture with basic name and email properties */
export const personUser = buildUser({
  id: 'person_user',
  name: 'Name',
  email: 'email',
}) satisfies NotionAPIUser;

/** person user fixture without email (null email) */
export const personUserWithoutEmail = buildUser({
  id: 'person_user',
  name: 'Name',
  email: null,
}) satisfies NotionAPIUser;

/** bot user fixture created by a specific user */
export const botByUser = buildUser({
  id: 'user_bot',
  type: 'bot',
  byUser: true,
}) satisfies NotionAPIUser;

/** bot user fixture created by workspace (not by specific user) */
export const botWithoutUser = buildUser({
  id: 'workspace_bot',
  type: 'bot',
  byUser: false,
}) satisfies NotionAPIUser;
