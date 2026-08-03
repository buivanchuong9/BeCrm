import { deflateSync } from 'zlib';

/**
 * Minimal, dependency-free 8-bit RGB PNG encoder used only to generate
 * deterministic demo fixture images (baseline/target/aligned/mask/heatmap/
 * thumbnail). Deliberately avoids adding sharp/canvas/jimp — this project
 * has no existing native image-processing dependency and the demo slice
 * does not need one. Not suitable for arbitrary/production image encoding.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

export type Rgb = readonly [number, number, number];

/** Deterministic — same (width, height, pixelAt) always produces the same bytes. */
export function encodePng(
  width: number,
  height: number,
  pixelAt: (x: number, y: number) => Rgb,
): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor (RGB, no alpha)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelAt(x, y);
      const offset = rowStart + 1 + x * 3;
      raw[offset] = clampByte(r);
      raw[offset + 1] = clampByte(g);
      raw[offset + 2] = clampByte(b);
    }
  }
  const idat = deflateSync(raw, { level: 9 });

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

const SKIN_TONE: Rgb = [224, 172, 144];
const LESION_CORE: Rgb = [176, 60, 52];
const LESION_EDGE: Rgb = [206, 104, 92];

function withinCircle(x: number, y: number, cx: number, cy: number, radius: number): number {
  const distance = Math.hypot(x - cx, y - cy);
  return distance <= radius ? 1 : 0;
}

/** A skin-tone photo with one circular erythematous lesion of the given radius. */
export function lesionPhoto(width: number, height: number, radius: number): Buffer {
  const cx = width / 2;
  const cy = height / 2;
  return encodePng(width, height, (x, y) => {
    const distance = Math.hypot(x - cx, y - cy);
    if (distance > radius) return SKIN_TONE;
    const edgeMix = Math.min(1, Math.max(0, (radius - distance) / (radius * 0.35)));
    return mix(LESION_EDGE, LESION_CORE, edgeMix);
  });
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Black background, white filled circle marking the segmented lesion boundary. */
export function lesionMask(width: number, height: number, radius: number): Buffer {
  const cx = width / 2;
  const cy = height / 2;
  return encodePng(width, height, (x, y) =>
    withinCircle(x, y, cx, cy, radius) ? [255, 255, 255] : [0, 0, 0],
  );
}

/**
 * Blue→red heatmap of the ring between the baseline and target lesion
 * radius — i.e. exactly the region that changed between the two captures.
 */
export function differenceHeatmap(
  width: number,
  height: number,
  baselineRadius: number,
  targetRadius: number,
): Buffer {
  const cx = width / 2;
  const cy = height / 2;
  const outer = Math.max(baselineRadius, targetRadius);
  const inner = Math.min(baselineRadius, targetRadius);
  const band = Math.max(outer - inner, 1);
  return encodePng(width, height, (x, y) => {
    const distance = Math.hypot(x - cx, y - cy);
    if (distance < inner - 6 || distance > outer + 6) return [12, 18, 38];
    const intensity = 1 - Math.min(1, Math.abs(distance - (inner + band / 2)) / (band / 2 + 6));
    return mix([30, 60, 180], [220, 40, 30], Math.max(0, intensity));
  });
}

/** Nearest-neighbour downscale — enough fidelity for a thumbnail fixture. */
export function thumbnailOf(
  sourceWidth: number,
  sourceHeight: number,
  targetSize: number,
  sourcePixelAt: (x: number, y: number) => Rgb,
): Buffer {
  const scaleX = sourceWidth / targetSize;
  const scaleY = sourceHeight / targetSize;
  return encodePng(targetSize, targetSize, (x, y) =>
    sourcePixelAt(
      Math.min(sourceWidth - 1, Math.floor(x * scaleX)),
      Math.min(sourceHeight - 1, Math.floor(y * scaleY)),
    ),
  );
}
