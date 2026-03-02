import { describe, expect, it } from 'vitest';

import {
  audio,
  bookmark,
  file,
  image,
  linkPreview as linkPreviewTransformer,
  linkToPage,
  pdf,
  video,
} from '#transformers/markdown/block';

import {
  bookmarkWithCaption,
  bookmarkWithoutCaption,
  embeddedAudioWithChildrenTransformed,
  embeddedImage,
  embeddedPdf,
  embeddedVideo,
  externalAudioWithChildrenTransformed,
  externalFile,
  externalImage,
  externalPdf,
  externalVideo,
  linkPreview,
  linkToPageDatabaseWithChildrenTransformed,
  linkToPagePageWithChildrenTransformed,
} from '../../fixtures/blocks';
import { defaultBlockProperties } from '../../fixtures/common';
import {
  createFile,
  createPdf,
  createTransformedBlock,
  createVideo,
} from '../../fixtures/factories/block';
import { createPlainText } from '../../fixtures/factories/richtext';

import type { NotionBlockWithTransformedChildren } from '#types';

describe('Media and File Blocks', () => {
  describe('fn:image', () => {
    it.each([
      { type: 'embedded', stub: embeddedImage },
      { type: 'external', stub: externalImage },
    ])('should convert $type image to markdown format', ({ stub }) => {
      const expected = '![caption](url)';
      const result = image(createTransformedBlock(stub));
      expect(result).toBe(expected);
    });
  });

  describe('fn:video', () => {
    it.each([
      {
        name: 'external video',
        stub: externalVideo,
        expected: '[Video caption](https://youtube.com/watch?v=example)',
      },
      {
        name: 'file video',
        stub: embeddedVideo,
        expected: '[Video caption](https://example.com/video.mp4)',
      },
    ])('should convert $name to markdown link format', ({ stub, expected }) => {
      const result = video(createTransformedBlock(stub));
      expect(result).toBe(expected);
    });

    it('should use fallback text for video without caption', () => {
      const videoBlock = createVideo({
        type: 'external',
        caption: [],
        external: { url: 'https://example.com/video.mp4' },
      });

      const result = video(createTransformedBlock(videoBlock));
      expect(result).toBe('[Video](https://example.com/video.mp4)');
    });
  });

  describe('fn:file', () => {
    it('should transform file blocks with name', () => {
      const result = file(createTransformedBlock(externalFile));
      expect(result).toBe('[document.pdf](https://example.com/document.pdf)');
    });

    it('should transform embedded/internal file blocks', () => {
      const embeddedFile = createFile({
        type: 'file',
        name: 'internal-doc.pdf',
        caption: [createPlainText('Internal file')],
        file: {
          url: 'https://notion.so/file/internal-doc.pdf',
          expiry_time: '2025-01-01T00:00:00.000Z',
        },
      });

      const result = file(createTransformedBlock(embeddedFile));
      expect(result).toBe(
        '[internal-doc.pdf](https://notion.so/file/internal-doc.pdf)',
      );
    });

    it('should handle embedded file blocks without name but with caption', () => {
      const embeddedFile = createFile({
        type: 'file',
        name: '',
        caption: [createPlainText('My Document')],
        file: {
          url: 'https://notion.so/file/doc.pdf',
          expiry_time: '2025-01-01T00:00:00.000Z',
        },
      });

      const result = file(createTransformedBlock(embeddedFile));
      expect(result).toBe('[My Document](https://notion.so/file/doc.pdf)');
    });

    it('should use fallback text for file without name and caption', () => {
      const fileBlock = createFile({
        type: 'external',
        name: '',
        caption: [],
        external: { url: 'https://example.com/document.pdf' },
      });

      const result = file(createTransformedBlock(fileBlock));
      expect(result).toBe('[File](https://example.com/document.pdf)');
    });
  });

  describe('fn:pdf', () => {
    it('should transform external PDF blocks', () => {
      const result = pdf(createTransformedBlock(externalPdf));
      expect(result).toBe('[PDF caption](https://example.com/document.pdf)');
    });

    it('should transform embedded PDF blocks', () => {
      const result = pdf(createTransformedBlock(embeddedPdf));
      expect(result).toBe('[PDF caption](https://example.com/document.pdf)');
    });

    it('should use fallback text for PDF without caption', () => {
      const pdfBlock = createPdf({
        type: 'external',
        caption: [],
        external: { url: 'https://example.com/document.pdf' },
      });

      const result = pdf(createTransformedBlock(pdfBlock));
      expect(result).toBe('[PDF](https://example.com/document.pdf)');
    });
  });

  describe('fn:audio', () => {
    it.each([
      {
        name: 'external audio',
        stub: externalAudioWithChildrenTransformed,
        expected: '[Audio caption](https://example.com/audio.mp3)',
      },
      {
        name: 'embedded audio',
        stub: embeddedAudioWithChildrenTransformed,
        expected: '[Audio caption](https://example.com/audio.mp3)',
      },
    ])(
      'should transform $name to markdown link format',
      ({ stub, expected }) => {
        const result = audio(stub);
        expect(result).toBe(expected);
      },
    );

    it('should handle audio with empty caption using fallback text', () => {
      const audioBlock = {
        ...defaultBlockProperties,
        id: 'audio-no-caption',
        type: 'audio' as const,
        has_children: false,
        audio: {
          type: 'external' as const,
          caption: [],
          external: { url: 'https://example.com/podcast.mp3' },
        },
        children: [],
      } satisfies NotionBlockWithTransformedChildren<string>;

      const result = audio(audioBlock);
      expect(result).toBe('[Audio](https://example.com/podcast.mp3)');
    });

    it('should handle file audio with caption', () => {
      const audioBlock = {
        ...defaultBlockProperties,
        id: 'audio-file',
        type: 'audio' as const,
        has_children: false,
        audio: {
          type: 'file' as const,
          caption: [createPlainText('Music Track')],
          file: {
            url: 'https://notion.so/music.wav',
            expiry_time: '2024-01-01T00:00:00.000Z',
          },
        },
        children: [],
      } satisfies NotionBlockWithTransformedChildren<string>;

      const result = audio(audioBlock);
      expect(result).toBe('[Music Track](https://notion.so/music.wav)');
    });
  });
});

describe('Link and Reference Blocks', () => {
  describe('fn:bookmark', () => {
    it('should transform bookmark blocks with caption', () => {
      const bookmarkBlock = bookmarkWithCaption;
      const result = bookmark(createTransformedBlock(bookmarkBlock));
      expect(result).toBe('[Example Site](https://example.com)');
    });

    it('should transform bookmark blocks without caption', () => {
      const bookmarkBlock = bookmarkWithoutCaption;
      const result = bookmark(createTransformedBlock(bookmarkBlock));
      expect(result).toBe('[Bookmark](https://example.com)');
    });
  });

  describe('fn:linkPreview', () => {
    it('should transform link preview blocks', () => {
      const linkPreviewBlock = linkPreview;
      const result = linkPreviewTransformer(
        createTransformedBlock(linkPreviewBlock),
      );
      expect(result).toBe('[Link Preview](https://example.com)');
    });
  });

  describe('fn:linkToPage', () => {
    it('should transform link to page block with page_id', () => {
      const result = linkToPage(linkToPagePageWithChildrenTransformed);
      expect(result).toBe(
        '[Page Link](page://61cca5bd-c8c6-4fcc-b517-514da3b8b1e0)',
      );
    });

    it('should transform link to page block with database_id', () => {
      const result = linkToPage(linkToPageDatabaseWithChildrenTransformed);
      expect(result).toBe(
        '[Database Link](database://f336d0bc-b841-465b-8045-024475c079dd)',
      );
    });

    it('should return null for unknown link type', () => {
      const unknownTypeLink: Record<string, string> = {
        type: 'unknown_type',
      };
      const linkToPageBlock = {
        ...defaultBlockProperties,
        id: 'link-unknown',
        type: 'link_to_page' as const,
        has_children: false,
        link_to_page: unknownTypeLink,
        children: [],
      } as unknown as NotionBlockWithTransformedChildren<
        string,
        'link_to_page'
      >;

      const result = linkToPage(linkToPageBlock);
      expect(result).toBe(null);
    });
  });
});
