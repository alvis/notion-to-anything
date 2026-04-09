import type { NotionAPIUser } from '#types/index';

/** options for creating user objects */
export interface UserOptions {
  /** the ID of the user to be retrieved */
  id?: string;
  /** name of the user */
  name?: string;
  /** email of the user (for person type) */
  email?: string | null;
  /** type of user - person or bot */
  type?: 'person' | 'bot';
  /** for bot type - whether bot is owned by user or workspace */
  byUser?: boolean;
}

/**
 * creates a notion API user object with specified properties for testing
 * @param options optional user configuration parameters
 * @returns notion API user object matching user retrieval API response format
 */
export function buildUser(options?: UserOptions): NotionAPIUser {
  const {
    id = 'user-id',
    name = 'Name',
    email = 'email',
    type = 'person',
    byUser = false,
  } = { ...options };

  const basis = {
    object: 'user' as const,
    id,
    name,
    avatar_url: 'url',
  };

  if (type === 'person') {
    return {
      ...basis,
      type: 'person',
      person: email ? { email } : {},
    };
  } else {
    return {
      ...basis,
      type: 'bot',
      bot: byUser
        ? {
            owner: {
              type: 'user',
              user: {
                object: 'user',
                id: 'owner-id',
                type: 'person',
                person: { email: 'email' },
                name: 'Name',
                avatar_url: 'url',
              },
            },
            workspace_name: 'Workspace',
            workspace_id: 'workspace-id',
            workspace_limits: {
              max_file_upload_size_in_bytes: 5242880,
            },
          }
        : {
            owner: {
              type: 'workspace',
              workspace: true,
            },
            workspace_name: 'Workspace',
            workspace_id: 'workspace-id',
            workspace_limits: {
              max_file_upload_size_in_bytes: 5242880,
            },
          },
      name: 'Bot',
    };
  }
}
