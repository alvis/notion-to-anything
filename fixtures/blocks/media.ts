import {
  createAudio,
  createFile,
  createImage,
  createPdf,
  createTransformedBlock,
  createVideo,
} from '../factories/block';
import { createPlainText } from '../factories/richtext';

// IMAGE BLOCK FIXTURES //

/** embedded image block with file URL and expiry time */
export const embeddedImage = createImage({
  type: 'file',
  caption: [createPlainText('caption')],
  file: {
    url: 'url',
    expiry_time: '2000-01-01T00:00:00.000Z',
  },
});

/** external image block with external URL */
export const externalImage = createImage({
  type: 'external',
  caption: [createPlainText('caption')],
  external: {
    url: 'url',
  },
});

// VIDEO BLOCK FIXTURES //

/** embedded video block with file URL and expiry time */
export const embeddedVideo = createVideo({
  type: 'file',
  caption: [createPlainText('Video caption')],
  file: {
    url: 'https://example.com/video.mp4',
    expiry_time: '2000-01-01T00:00:00.000Z',
  },
});

/** external video block with YouTube URL */
export const externalVideo = createVideo({
  type: 'external',
  caption: [createPlainText('Video caption')],
  external: {
    url: 'https://youtube.com/watch?v=example',
  },
});

// FILE BLOCK FIXTURES //

/** embedded file block with PDF file */
export const embeddedFile = createFile({
  type: 'file',
  name: 'document.pdf',
  caption: [createPlainText('File caption')],
  file: {
    url: 'https://example.com/document.pdf',
    expiry_time: '2000-01-01T00:00:00.000Z',
  },
});

/** external file block with URL */
export const externalFile = createFile({
  type: 'external',
  name: 'document.pdf',
  caption: [createPlainText('File caption')],
  external: {
    url: 'https://example.com/document.pdf',
  },
});

// PDF BLOCK FIXTURES //

/** embedded PDF block with file URL */
export const embeddedPdf = createPdf({
  type: 'file',
  caption: [createPlainText('PDF caption')],
  file: {
    url: 'https://example.com/document.pdf',
    expiry_time: '2000-01-01T00:00:00.000Z',
  },
});

/** external PDF block with URL */
export const externalPdf = createPdf({
  type: 'external',
  caption: [createPlainText('PDF caption')],
  external: {
    url: 'https://example.com/document.pdf',
  },
});

// AUDIO BLOCK FIXTURES //

/** embedded audio block with MP3 file */
export const embeddedAudio = createAudio({
  type: 'file',
  caption: [createPlainText('Audio caption')],
  file: {
    url: 'https://example.com/audio.mp3',
    expiry_time: '2000-01-01T00:00:00.000Z',
  },
});

/** external audio block with URL */
export const externalAudio = createAudio({
  type: 'external',
  caption: [createPlainText('Audio caption')],
  external: {
    url: 'https://example.com/audio.mp3',
  },
});

// TRANSFORMED CHILDREN VARIANTS //

/** media blocks with transformed children for testing purposes */
export const embeddedImageWithChildrenTransformed = createTransformedBlock(
  embeddedImage,
  [],
);

/** external image block with transformed children */
export const externalImageWithChildrenTransformed = createTransformedBlock(
  externalImage,
  [],
);

/** embedded video block with transformed children */
export const embeddedVideoWithChildrenTransformed = createTransformedBlock(
  embeddedVideo,
  [],
);

/** external video block with transformed children */
export const externalVideoWithChildrenTransformed = createTransformedBlock(
  externalVideo,
  [],
);

/** embedded file block with transformed children */
export const embeddedFileWithChildrenTransformed = createTransformedBlock(
  embeddedFile,
  [],
);

/** external file block with transformed children */
export const externalFileWithChildrenTransformed = createTransformedBlock(
  externalFile,
  [],
);

/** embedded PDF block with transformed children */
export const embeddedPdfWithChildrenTransformed = createTransformedBlock(
  embeddedPdf,
  [],
);

/** external PDF block with transformed children */
export const externalPdfWithChildrenTransformed = createTransformedBlock(
  externalPdf,
  [],
);

/** embedded audio block with transformed children */
export const embeddedAudioWithChildrenTransformed = createTransformedBlock(
  embeddedAudio,
  [],
);

/** external audio block with transformed children */
export const externalAudioWithChildrenTransformed = createTransformedBlock(
  externalAudio,
  [],
);
