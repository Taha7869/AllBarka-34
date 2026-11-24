/**
 * Server-side binary image validator and metadata (EXIF / GPS / XMP / ICC / text) stripper
 * for customer & admin review photos. Pure Node.js Buffer implementation (zero native deps).
 *
 * Enforces:
 * - Strict raster magic bytes (WebP, JPEG, PNG only — never SVG/HTML/scripts)
 * - Max file size: 2 MB
 * - Max dimensions: 1200 x 1200 px
 * - Strips ALL EXIF, GPS location, XMP, ICCP, comments, and ancillary text chunks
 */

export const MAX_REVIEW_PHOTO_BYTES = 2 * 1024 * 1024;
export const MAX_REVIEW_PHOTO_DIMENSION = 1200;

export interface SanitizedReviewImage {
  buffer: Buffer;
  mime: 'image/webp' | 'image/jpeg' | 'image/png';
  extension: 'webp' | 'jpg' | 'png';
  width: number;
  height: number;
}

function assertDimensions(width: number, height: number): void {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    throw new Error('INVALID_REVIEW_IMAGE');
  }
  if (width > MAX_REVIEW_PHOTO_DIMENSION || height > MAX_REVIEW_PHOTO_DIMENSION) {
    throw new Error('REVIEW_IMAGE_DIMENSIONS_TOO_LARGE');
  }
}

function stripAndValidateWebp(bytes: Buffer): SanitizedReviewImage {
  if (
    bytes.length < 20 ||
    bytes.toString('ascii', 0, 4) !== 'RIFF' ||
    bytes.toString('ascii', 8, 12) !== 'WEBP'
  ) {
    throw new Error('INVALID_REVIEW_IMAGE_TYPE');
  }

  let width = 0;
  let height = 0;
  const keptChunks: Buffer[] = [];
  const METADATA_CHUNKS = new Set(['EXIF', 'XMP ', 'ICCP']);

  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const fourcc = bytes.toString('ascii', offset, offset + 4);
    const chunkSize = bytes.readUInt32LE(offset + 4);
    const paddedSize = chunkSize + (chunkSize % 2);
    const dataStart = offset + 8;
    const nextOffset = dataStart + paddedSize;
    if (nextOffset > bytes.length) {
      throw new Error('INVALID_REVIEW_IMAGE');
    }

    const payload = bytes.subarray(dataStart, dataStart + chunkSize);

    if (fourcc === 'VP8X' && chunkSize >= 10) {
      const vp8xCopy = Buffer.from(bytes.subarray(offset, nextOffset));
      // Clear ICC (bit 5 = 0x20), EXIF (bit 3 = 0x08), XMP (bit 2 = 0x04) flags in VP8X byte 0
      vp8xCopy[8] = vp8xCopy[8] & ~(0x20 | 0x08 | 0x04);
      width = 1 + (payload[4] | (payload[5] << 8) | (payload[6] << 16));
      height = 1 + (payload[7] | (payload[8] << 8) | (payload[9] << 16));
      keptChunks.push(vp8xCopy);
    } else if (fourcc === 'VP8 ' && chunkSize >= 10) {
      // Lossy VP8 bitstream: frame tag (3 bytes), start code 9d 01 2a at bytes 3..5, width/height at 6..9
      if (payload[3] === 0x9d && payload[4] === 0x01 && payload[5] === 0x2a) {
        if (!width || !height) {
          width = payload.readUInt16LE(6) & 0x3fff;
          height = payload.readUInt16LE(8) & 0x3fff;
        }
      }
      keptChunks.push(bytes.subarray(offset, nextOffset));
    } else if (fourcc === 'VP8L' && chunkSize >= 5) {
      // Lossless VP8L: signature 0x2f at byte 0, 14-bit width-1 & 14-bit height-1 in bytes 1..4
      if (payload[0] === 0x2f) {
        const bits = payload.readUInt32LE(1);
        if (!width || !height) {
          width = (bits & 0x3fff) + 1;
          height = ((bits >> 14) & 0x3fff) + 1;
        }
      }
      keptChunks.push(bytes.subarray(offset, nextOffset));
    } else if (!METADATA_CHUNKS.has(fourcc)) {
      keptChunks.push(bytes.subarray(offset, nextOffset));
    }

    offset = nextOffset;
  }

  assertDimensions(width, height);
  const body = Buffer.concat(keptChunks);
  const header = Buffer.alloc(12);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(4 + body.length, 4);
  header.write('WEBP', 8, 'ascii');

  return {
    buffer: Buffer.concat([header, body]),
    mime: 'image/webp',
    extension: 'webp',
    width,
    height,
  };
}

function stripAndValidatePng(bytes: Buffer): SanitizedReviewImage {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.length < 33 || !bytes.subarray(0, 8).equals(sig)) {
    throw new Error('INVALID_REVIEW_IMAGE_TYPE');
  }

  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  assertDimensions(width, height);

  // Keep only critical rendering & standard display color chunks; drop eXIf, tEXt, iTXt, zTXt, tIME, pHYs, iCCP
  const ALLOWED_CHUNKS = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'sRGB', 'gAMA']);
  const parts: Buffer[] = [sig];
  let offset = 8;
  let sawIend = false;

  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const totalChunkBytes = 12 + length;
    if (offset + totalChunkBytes > bytes.length) {
      throw new Error('INVALID_REVIEW_IMAGE');
    }
    if (ALLOWED_CHUNKS.has(type)) {
      parts.push(bytes.subarray(offset, offset + totalChunkBytes));
    }
    offset += totalChunkBytes;
    if (type === 'IEND') {
      sawIend = true;
      break;
    }
  }

  if (!sawIend) {
    throw new Error('INVALID_REVIEW_IMAGE');
  }

  return {
    buffer: Buffer.concat(parts),
    mime: 'image/png',
    extension: 'png',
    width,
    height,
  };
}

function stripAndValidateJpeg(bytes: Buffer): SanitizedReviewImage {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error('INVALID_REVIEW_IMAGE_TYPE');
  }

  const parts: Buffer[] = [Buffer.from([0xff, 0xd8])];
  let width = 0;
  let height = 0;
  let offset = 2;

  while (offset + 1 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      throw new Error('INVALID_REVIEW_IMAGE');
    }
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) break;
    const marker = bytes[offset];
    offset += 1;

    // EOI
    if (marker === 0xd9) {
      parts.push(Buffer.from([0xff, 0xd9]));
      break;
    }
    // Standalone markers (RST0..7, TEM)
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      parts.push(Buffer.from([0xff, marker]));
      continue;
    }

    if (offset + 2 > bytes.length) {
      throw new Error('INVALID_REVIEW_IMAGE');
    }
    const segLen = bytes.readUInt16BE(offset);
    if (segLen < 2 || offset + segLen > bytes.length) {
      throw new Error('INVALID_REVIEW_IMAGE');
    }

    // SOF0 / SOF1 / SOF2 (dimensions)
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      if (segLen >= 7) {
        height = bytes.readUInt16BE(offset + 3);
        width = bytes.readUInt16BE(offset + 5);
      }
    }

    // SOS (Start of Scan): keep marker + header + remaining entropy-coded data through EOI
    if (marker === 0xda) {
      parts.push(Buffer.from([0xff, marker]));
      parts.push(bytes.subarray(offset));
      break;
    }

    // Strip ALL APP1..APP15 (0xE1..0xEF: EXIF, GPS, XMP, IPTC, ICC) and COM (0xFE) metadata segments!
    const isMetadataSegment = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (!isMetadataSegment) {
      parts.push(Buffer.from([0xff, marker]));
      parts.push(bytes.subarray(offset, offset + segLen));
    }

    offset += segLen;
  }

  assertDimensions(width, height);
  return {
    buffer: Buffer.concat(parts),
    mime: 'image/jpeg',
    extension: 'jpg',
    width,
    height,
  };
}

/**
 * Validates raster bytes, enforces <= 2MB and <= 1200x1200, and strips ALL EXIF/GPS/XMP/comment metadata.
 */
export function sanitizeReviewImageBuffer(bytes: Buffer, contentType: string): SanitizedReviewImage {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > MAX_REVIEW_PHOTO_BYTES) {
    throw new Error('INVALID_REVIEW_IMAGE_SIZE');
  }
  const normalizedMime = String(contentType || '').split(';')[0].trim().toLowerCase();
  if (normalizedMime === 'image/webp') return stripAndValidateWebp(bytes);
  if (normalizedMime === 'image/png') return stripAndValidatePng(bytes);
  if (normalizedMime === 'image/jpeg' || normalizedMime === 'image/jpg') return stripAndValidateJpeg(bytes);
  throw new Error('INVALID_REVIEW_IMAGE_TYPE');
}
