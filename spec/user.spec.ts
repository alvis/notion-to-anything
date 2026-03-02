import { Client } from '@notionhq/client';
import { describe, expect, it, vi } from 'vitest';

import {
  NotionUser,
  UserResolver,
  isPartialUser,
  resolveEntityUsers,
} from '#user';

import { defaultInaccessibleUser } from './fixtures/common';
import { buildDummyDataSource } from './fixtures/factories/datasource';
import { buildDummyPage } from './fixtures/factories/page';
import { buildUser } from './fixtures/factories/user';
import { inaccessibleUser, personUser } from './fixtures/users';

describe('cl:NotionUser', () => {
  it('should extract person user properties', () => {
    const user = buildUser({
      id: 'u1',
      name: 'Alice',
      email: 'alice@example.com',
    });

    const result = new NotionUser(user);

    expect(result).toEqual({
      id: 'u1',
      type: 'person',
      name: 'Alice',
      avatar: 'url',
      email: 'alice@example.com',
    });
  });

  it('should extract bot user properties with null email', () => {
    const user = buildUser({ id: 'b1', type: 'bot' });

    const result = new NotionUser(user);

    expect(result).toEqual({
      id: 'b1',
      type: 'bot',
      name: 'Bot',
      avatar: 'url',
      email: null,
    });
  });

  it('should handle person user without email', () => {
    const user = buildUser({ id: 'u2', email: null });

    const result = new NotionUser(user);

    expect(result.email).toBeNull();
  });
});

describe('cl:UserResolver', () => {
  const fetch = vi.fn<typeof globalThis.fetch>();
  const client = new Client({ fetch, logger: () => undefined });

  const userResponse = buildUser({ id: 'user-1', name: 'Alice' });

  describe('mt:resolve', () => {
    it('should fetch and return full user for valid ID', async () => {
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(userResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      const resolver = new UserResolver(client);

      const result = await resolver.resolve('user-1');

      expect(result).toEqual(userResponse);
    });

    it('should return null for inaccessible user', async () => {
      const partialUser = { object: 'user', id: 'partial-user' };
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(partialUser), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      const resolver = new UserResolver(client);

      const result = await resolver.resolve('partial-user');

      expect(result).toBeNull();
    });

    it('should return null when API call fails', async () => {
      const errorResponse = {
        code: 'object_not_found',
        message: 'Could not find user.',
        object: 'error',
        request_id: 'request-id',
        status: 404,
      };
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(errorResponse), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      const resolver = new UserResolver(client);

      const result = await resolver.resolve('nonexistent');

      expect(result).toBeNull();
    });

    it('should make only one API call for repeated resolution of same user ID', async () => {
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(userResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      const resolver = new UserResolver(client);

      const first = await resolver.resolve('user-1');
      const second = await resolver.resolve('user-1');

      expect(first).toEqual(userResponse);
      expect(second).toEqual(userResponse);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should deduplicate concurrent calls for the same user ID', async () => {
      fetch.mockResolvedValueOnce(
        new Response(JSON.stringify(userResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      const resolver = new UserResolver(client);

      const [first, second] = await Promise.all([
        resolver.resolve('user-1'),
        resolver.resolve('user-1'),
      ]);

      expect(first).toEqual(userResponse);
      expect(second).toEqual(userResponse);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should make separate calls for different user IDs', async () => {
      const user2 = buildUser({ id: 'user-2', name: 'Bob' });
      fetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify(userResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(user2), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      const resolver = new UserResolver(client);

      const first = await resolver.resolve('user-1');
      const second = await resolver.resolve('user-2');

      expect(first).toEqual(userResponse);
      expect(second).toEqual(user2);
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('gt:size', () => {
    it('should return number of cached entries', async () => {
      fetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify(userResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(buildUser({ id: 'user-2' })), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      const resolver = new UserResolver(client);

      await resolver.resolve('user-1');
      await resolver.resolve('user-2');

      expect(resolver.size).toBe(2);
    });
  });
});

describe('fn:resolveEntityUsers', () => {
  const fetch = vi.fn<typeof globalThis.fetch>();
  const client = new Client({ fetch, logger: () => undefined });

  it('should resolve partial created_by and last_edited_by', async () => {
    const fullUser = buildUser({ id: 'partial-user-id', name: 'Resolved' });
    fetch.mockResolvedValue(
      new Response(JSON.stringify(fullUser), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const resolver = new UserResolver(client);
    const page = {
      ...buildDummyPage(),
      created_by: { object: 'user' as const, id: 'partial-user-id' },
      last_edited_by: { object: 'user' as const, id: 'partial-user-id' },
    };

    const result = await resolveEntityUsers(page, resolver);

    expect(result.created_by).toEqual(fullUser);
    expect(result.last_edited_by).toEqual(fullUser);
  });

  it('should preserve already-full user objects without API calls', async () => {
    const resolver = new UserResolver(client);
    const page = buildDummyPage();

    const result = await resolveEntityUsers(page, resolver);

    expect(result.created_by).toEqual(personUser);
    expect(result.last_edited_by).toEqual(personUser);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should keep original partial user when resolution fails', async () => {
    const errorResponse = {
      code: 'object_not_found',
      message: 'Not found',
      object: 'error',
      request_id: 'req-id',
      status: 404,
    };
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const resolver = new UserResolver(client);
    const partial = { object: 'user' as const, id: 'gone-user' };
    const page = {
      ...buildDummyPage(),
      created_by: partial,
      last_edited_by: personUser,
    };

    const result = await resolveEntityUsers(page, resolver);

    expect(result.created_by).toEqual(partial);
    expect(result.last_edited_by).toEqual(personUser);
  });

  it('should enrich datasource entities', async () => {
    const fullUser = buildUser({ id: 'ds-user', name: 'DS User' });
    fetch.mockResolvedValue(
      new Response(JSON.stringify(fullUser), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const resolver = new UserResolver(client);
    const dataSource = {
      ...buildDummyDataSource(),
      created_by: { object: 'user' as const, id: 'ds-user' },
      last_edited_by: { object: 'user' as const, id: 'ds-user' },
    };

    const result = await resolveEntityUsers(dataSource, resolver);

    expect(result.created_by).toEqual(fullUser);
    expect(result.last_edited_by).toEqual(fullUser);
  });
});

describe('fn:isPartialUser', () => {
  it('should return true for partial user without type field', () => {
    const result = isPartialUser(inaccessibleUser);

    expect(result).toBe(true);
  });

  it('should return false for full user with type field', () => {
    const result = isPartialUser(personUser);

    expect(result).toBe(false);
  });

  it('should return true for default inaccessible user', () => {
    const result = isPartialUser(defaultInaccessibleUser);

    expect(result).toBe(true);
  });
});
