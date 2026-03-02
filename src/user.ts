/* eslint-disable max-classes-per-file -- user-related classes are cohesive */

import type { Client } from '@notionhq/client';

import type { NotionAPIDataSource, NotionAPIPage, NotionAPIUser } from '#types';

/** normalized user domain object wrapping a Notion API user response */
export class NotionUser {
  /** unique identifier for the user */
  public readonly id: string;

  /** identifies the user as a person or bot */
  public readonly type: 'person' | 'bot';

  /** user's display name, or null if not set */
  public readonly name: string | null;

  /** user's avatar URL, or null if not set */
  public readonly avatar: string | null;

  /** user's email address (only for person type), or null if unavailable */
  public readonly email: string | null;

  /**
   * creates a NotionUser from a full Notion API user object
   * @param user a full user object returned from the Notion API
   */
  constructor(user: NotionAPIUser) {
    this.id = user.id;
    this.type = user.type;
    this.name = user.name;
    this.avatar = user.avatar_url;
    this.email = user.type === 'person' ? (user.person.email ?? null) : null;
  }
}

/** caches user API calls to avoid duplicate requests */
export class UserResolver {
  /** Notion API client for user lookups */
  readonly #client: Client;

  /** cache mapping user IDs to promise-wrapped user objects */
  readonly #cache: Map<string, Promise<NotionAPIUser | null>>;

  /**
   * creates a resolver that caches user lookups
   * @param client the Notion API client
   */
  constructor(client: Client) {
    this.#client = client;
    this.#cache = new Map();
  }

  /** number of cached entries */
  public get size(): number {
    return this.#cache.size;
  }

  /**
   * resolves a user ID to a full user object, using cache for deduplication
   * @param userId the ID of the user to resolve
   * @returns the full user object, or null if inaccessible
   */
  public async resolve(userId: string): Promise<NotionAPIUser | null> {
    const cached = this.#cache.get(userId);

    if (cached) {
      return cached;
    }

    const promise = this.#client.users
      .retrieve({ user_id: userId })
      .then((user) => (isPartialUser(user) ? null : user))
      .catch(() => null);

    this.#cache.set(userId, promise);

    return promise;
  }
}

/**
 * enriches an entity's created_by and last_edited_by with full user data
 * @param entity the page or datasource entity to enrich
 * @param resolver the user resolver for API lookups
 * @returns the entity with enriched user fields
 */
export async function resolveEntityUsers<
  E extends NotionAPIPage | NotionAPIDataSource,
>(entity: E, resolver: UserResolver): Promise<E> {
  const [createdBy, lastEditedBy] = await Promise.all([
    isPartialUser(entity.created_by)
      ? resolver.resolve(entity.created_by.id)
      : null,
    isPartialUser(entity.last_edited_by)
      ? resolver.resolve(entity.last_edited_by.id)
      : null,
  ]);

  return {
    ...entity,
    ...(createdBy ? { created_by: createdBy } : {}),
    ...(lastEditedBy ? { last_edited_by: lastEditedBy } : {}),
  } as E;
}

/**
 * checks whether a user object is a partial reference without full details
 * @param user the user object to check
 * @param user.object the object type identifier
 * @param user.id the user's unique identifier
 * @param user.type the user type, absent for partial users
 * @returns true if the user lacks a type field
 */
export function isPartialUser(user: {
  object: string;
  id: string;
  type?: string;
}): boolean {
  return !user.type;
}

/* eslint-enable max-classes-per-file */
