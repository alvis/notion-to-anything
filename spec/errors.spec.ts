import {
  APIErrorCode,
  APIResponseError,
  ClientErrorCode,
  RequestTimeoutError,
  UnknownHTTPResponseError,
} from '@notionhq/client';
import { describe, expect, it } from 'vitest';

import { NotionAnythingError, NotionAPIError } from '#errors';

describe('cl:NotionAPIError', () => {
  describe('fn:constructor', () => {
    it('should expose all provided fields and chain the cause', () => {
      const cause = new Error('boom');
      const error = new NotionAPIError({
        code: APIErrorCode.ObjectNotFound,
        status: 404,
        requestId: 'req_1',
        body: '{"object":"error"}',
        message: 'not found',
        cause,
      });

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('NotionAPIError');
      expect(error.message).toBe('not found');
      expect(error.code).toBe(APIErrorCode.ObjectNotFound);
      expect(error.status).toBe(404);
      expect(error.requestId).toBe('req_1');
      expect(error.body).toBe('{"object":"error"}');
      expect(error.cause).toBe(cause);
    });

    it('should leave optional fields undefined when omitted', () => {
      const error = new NotionAPIError({
        code: ClientErrorCode.RequestTimeout,
        message: 'timed out',
      });

      expect(error.status).toBeUndefined();
      expect(error.requestId).toBeUndefined();
      expect(error.body).toBeUndefined();
      expect(error.cause).toBeUndefined();
    });
  });

  describe('fn:from', () => {
    it('should derive code, status, body, and requestId from an APIResponseError', () => {
      const sdkError = new APIResponseError({
        code: APIErrorCode.ValidationError,
        status: 400,
        message: 'invalid request',
        headers: new Headers(),
        rawBodyText: '{"object":"error"}',
        additional_data: undefined,
        request_id: 'req_42',
      });

      const error = NotionAPIError.from(sdkError);

      expect(error.code).toBe(APIErrorCode.ValidationError);
      expect(error.status).toBe(400);
      expect(error.body).toBe('{"object":"error"}');
      expect(error.requestId).toBe('req_42');
      expect(error.message).toBe('invalid request');
      expect(error.cause).toBe(sdkError);
    });

    it('should derive status and body but no requestId from an UnknownHTTPResponseError', () => {
      const sdkError = new UnknownHTTPResponseError({
        status: 502,
        message: undefined,
        headers: new Headers(),
        rawBodyText: 'oops',
      });

      const error = NotionAPIError.from(sdkError);

      expect(error.code).toBe(ClientErrorCode.ResponseError);
      expect(error.status).toBe(502);
      expect(error.body).toBe('oops');
      expect(error.requestId).toBeUndefined();
      expect(error.cause).toBe(sdkError);
    });

    it('should derive only the code from a RequestTimeoutError', () => {
      const sdkError = new RequestTimeoutError();

      const error = NotionAPIError.from(sdkError);

      expect(error.code).toBe(ClientErrorCode.RequestTimeout);
      expect(error.status).toBeUndefined();
      expect(error.body).toBeUndefined();
      expect(error.requestId).toBeUndefined();
      expect(error.cause).toBe(sdkError);
    });
  });
});

describe('cl:NotionAnythingError', () => {
  describe('fn:constructor', () => {
    it('should expose the code and chain the cause', () => {
      const cause = new Error('root');
      const error = new NotionAnythingError({
        code: 'ENTITY_NOT_ACCESSIBLE',
        message: 'cannot read entity',
        cause,
      });

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('NotionAnythingError');
      expect(error.message).toBe('cannot read entity');
      expect(error.code).toBe('ENTITY_NOT_ACCESSIBLE');
      expect(error.cause).toBe(cause);
    });

    it('should leave the cause undefined when omitted', () => {
      const error = new NotionAnythingError({
        code: 'INVALID_CONCURRENCY',
        message: 'bad concurrency',
      });

      expect(error.code).toBe('INVALID_CONCURRENCY');
      expect(error.cause).toBeUndefined();
    });
  });
});
