import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Client } from '@notionhq/client';

const clientConstructor = vi.hoisted(() =>
  vi.fn(
    class {
      public users = { retrieve: vi.fn() };

      constructor(
        public readonly options?: ConstructorParameters<typeof Client>[0],
      ) {}
    },
  ),
);

vi.mock('@notionhq/client', async () => ({
  ...(await vi.importActual<typeof import('@notionhq/client')>(
    '@notionhq/client',
  )),
  Client: clientConstructor,
}));

const { Notion } = await import('#notion');

describe('cl:Notion logger defaults', () => {
  beforeEach(() => {
    clientConstructor.mockClear();
  });

  it('should pass a no-op logger to the Notion SDK when no logger is provided', () => {
    const client = new Notion({
      token: 'secret_test_token',
      fetch: vi.fn<typeof globalThis.fetch>(),
    });

    const options = clientConstructor.mock.calls[0]?.[0];

    expect(options?.logger).toEqual(expect.any(Function));
    expect(client).toBeInstanceOf(Notion);
  });

  it('should preserve an explicit logger when provided', () => {
    const logger = vi.fn();

    const client = new Notion({
      token: 'secret_test_token',
      fetch: vi.fn<typeof globalThis.fetch>(),
      logger,
    });

    const options = clientConstructor.mock.calls[0]?.[0];

    expect(options?.logger).toBe(logger);
    expect(client).toBeInstanceOf(Notion);
  });
});
