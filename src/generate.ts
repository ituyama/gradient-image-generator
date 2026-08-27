import {
  mixOklabInto,
  parseColors,
  rgbToOklab,
  writeOklabRgb,
  type Oklab,
  type Rgb,
} from "./color.js";
import { createPerlin, type Noise2D } from "./noise.js";
import { encodePngRgb } from "./png.js";
import { hashSeed, mulberry32 } from "./rng.js";

export const DEFAULT_COLORS = ["#2EE59D", "#4FC3F7", "#00ACC1", "#80DEEA"];

export type GenerateOptions = {
  width: number;
  height: number;
  seed: string;
  colors?: string;
  warp?: number;
  grain?: number;
  blur?: number;
};

type Blob = {
  x: number;
  y: number;
  r: number;
  color: Oklab;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function smoothstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function buildBlobs(seed: number, palette: Oklab[]): Blob[] {
  const rand = mulberry32(seed ^ 0x9e3779b9);
  const blobs: Blob[] = [];

  for (let i = 0; i < palette.length; i++) {
    const angle = (i / palette.length) * Math.PI * 2 + rand() * 0.7;
    const dist = 0.16 + rand() * 0.38;
    blobs.push({
      x: 0.5 + Math.cos(angle) * dist,
      y: 0.5 + Math.sin(angle) * dist,
      r: 0.16 + rand() * 0.18,
      color: palette[i],
    });
  }

  const extra = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < extra; i++) {
    blobs.push({
      x: -0.1 + rand() * 1.2,
      y: -0.1 + rand() * 1.2,
      r: 0.14 + rand() * 0.2,
      color: palette[Math.floor(rand() * palette.length)],
    });
  }

  return blobs;
}

function workingSize(width: number, height: number): { w: number; h: number } {
  const maxSide = 420;
  const longSide = Math.max(width, height);
  if (longSide <= maxSide) return { w: width, h: height };
  const scale = maxSide / longSide;
  return {
    w: Math.max(16, Math.round(width * scale)),
    h: Math.max(16, Math.round(height * scale)),
  };
}

function fbm4(noise: Noise2D, x: number, y: number): number {
  return (
    (noise(x, y) * 0.5 +
      noise(x * 2, y * 2) * 0.25 +
      noise(x * 4, y * 4) * 0.125 +
      noise(x * 8, y * 8) * 0.0625) /
    0.9375
  );
}

function sampleBilinear(
  src: Uint8Array,
  sw: number,
  sh: number,
  x: number,
  y: number,
): [number, number, number] {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(sw - 1, x0 + 1);
  const y1 = Math.min(sh - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;
  const w00 = (1 - tx) * (1 - ty);
  const w10 = tx * (1 - ty);
  const w01 = (1 - tx) * ty;
  const w11 = tx * ty;

  const i00 = (y0 * sw + x0) * 3;
  const i10 = (y0 * sw + x1) * 3;
  const i01 = (y1 * sw + x0) * 3;
  const i11 = (y1 * sw + x1) * 3;

  return [
    src[i00] * w00 + src[i10] * w10 + src[i01] * w01 + src[i11] * w11,
    src[i00 + 1] * w00 + src[i10 + 1] * w10 + src[i01 + 1] * w01 + src[i11 + 1] * w11,
    src[i00 + 2] * w00 + src[i10 + 2] * w10 + src[i01 + 2] * w01 + src[i11 + 2] * w11,
  ];
}

function boxBlurPass(
  src: Uint8Array,
  w: number,
  h: number,
  radius: number,
  horizontal: boolean,
): Uint8Array {
  const out = new Uint8Array(src.length);
  const extent = horizontal ? w : h;
  const lines = horizontal ? h : w;
  const window = radius * 2 + 1;

  for (let line = 0; line < lines; line++) {
    let r = 0;
    let g = 0;
    let b = 0;
    for (let i = -radius; i <= radius; i++) {
      const p = clamp(i, 0, extent - 1);
      const idx = horizontal ? (line * w + p) * 3 : (p * w + line) * 3;
      r += src[idx];
      g += src[idx + 1];
      b += src[idx + 2];
    }
    for (let i = 0; i < extent; i++) {
      const idx = horizontal ? (line * w + i) * 3 : (i * w + line) * 3;
      out[idx] = r / window;
      out[idx + 1] = g / window;
      out[idx + 2] = b / window;
      const drop = clamp(i - radius, 0, extent - 1);
      const add = clamp(i + radius + 1, 0, extent - 1);
      const di = horizontal ? (line * w + drop) * 3 : (drop * w + line) * 3;
      const ai = horizontal ? (line * w + add) * 3 : (add * w + line) * 3;
      r += src[ai] - src[di];
      g += src[ai + 1] - src[di + 1];
      b += src[ai + 2] - src[di + 2];
    }
  }
  return out;
}

function blurPixels(src: Uint8Array, w: number, h: number, radius: number): Uint8Array {
  const r = Math.round(radius);
  if (r < 1) return src;
  let pixels = src;
  for (let i = 0; i < 3; i++) {
    pixels = boxBlurPass(pixels, w, h, r, true);
    pixels = boxBlurPass(pixels, w, h, r, false);
  }
  return pixels;
}

function renderField(
  width: number,
  height: number,
  seedValue: number,
  palette: Oklab[],
  warp: number,
): Uint8Array {
  const blobs = buildBlobs(seedValue, palette);
  const blobColors = blobs.map((blob) => blob.color);
  const noiseA = createPerlin(seedValue);
  const noiseB = createPerlin(seedValue ^ 0xa5a5a5a5);
  const noiseC = createPerlin(seedValue ^ 0x3c6ef372);
  const rand = mulberry32(seedValue ^ 0x27d4eb2f);
  const angle = rand() * Math.PI * 2;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const bandFreq = 5.4 + rand() * 2.2;

  const scale = 1 / Math.max(width, height);
  const pixels = new Uint8Array(width * height * 3);
  const weights = new Array<number>(blobs.length);
  const invR2 = blobs.map((blob) => 1 / (blob.r * blob.r));
  const bandColor: Oklab = { L: 0, a: 0, b: 0 };
  const blobColor: Oklab = { L: 0, a: 0, b: 0 };
  const mixed: Oklab = { L: 0, a: 0, b: 0 };
  const rgb: Rgb = { r: 0, g: 0, b: 0 };
  const pair = [bandColor, blobColor];
  const pairW = [0.62, 0.38];
  const palPair: Oklab[] = [palette[0], palette[Math.min(1, palette.length - 1)]];
  const mixT = [0, 0];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = x * scale;
      const ny = y * scale;

      const w1x = fbm4(noiseA, nx * 1.7, ny * 1.7);
      const w1y = fbm4(noiseB, nx * 1.7 + 4.8, ny * 1.7 + 1.1);
      const px = nx + w1x * warp;
      const py = ny + w1y * warp;

      const w2x = fbm4(noiseC, px * 2.4 + 12.0, py * 2.4);
      const w2y = fbm4(noiseA, px * 2.4 + 18.4, py * 2.4 + 3.7);
      const qx = px + w2x * warp * 0.55;
      const qy = py + w2y * warp * 0.55;

      const along = qx * cosA + qy * sinA;
      const across = -qx * sinA + qy * cosA;
      const flow = fbm4(noiseC, qx * 2.1, qy * 2.1);
      const ribbon = 0.5 + 0.5 * Math.sin(along * bandFreq + flow * 3.4);
      const ribbon2 = 0.5 + 0.5 * Math.sin(across * (bandFreq * 0.62) + flow * 2.1);
      const field = smoothstep(clamp(ribbon * 0.72 + ribbon2 * 0.28, 0, 1));
      if (palette.length === 1) {
        bandColor.L = palette[0].L;
        bandColor.a = palette[0].a;
        bandColor.b = palette[0].b;
      } else {
        const palX = field * (palette.length - 1);
        const palI = Math.min(palette.length - 2, Math.floor(palX));
        const f = palX - palI;
        palPair[0] = palette[palI];
        palPair[1] = palette[palI + 1];
        mixT[0] = 1 - f;
        mixT[1] = f;
        mixOklabInto(palPair, mixT, bandColor);
      }

      for (let i = 0; i < blobs.length; i++) {
        const dx = qx - blobs[i].x;
        const dy = qy - blobs[i].y;
        weights[i] = Math.exp(-0.5 * (dx * dx + dy * dy) * invR2[i]);
      }

      mixOklabInto(blobColors, weights, blobColor);
      mixOklabInto(pair, pairW, mixed);
      mixed.L = clamp(mixed.L + (field - 0.5) * 0.045, 0, 1);
      mixed.a *= 1.12;
      mixed.b *= 1.12;
      writeOklabRgb(mixed, rgb);

      const idx = (y * width + x) * 3;
      pixels[idx] = rgb.r;
      pixels[idx + 1] = rgb.g;
      pixels[idx + 2] = rgb.b;
    }
  }

  return pixels;
}

export function generateGradient(options: GenerateOptions): Uint8Array {
  const width = clamp(Math.round(options.width), 16, 2048);
  const height = clamp(Math.round(options.height), 16, 2048);
  const seedValue = hashSeed(options.seed);
  const warp = clamp(options.warp ?? 0.62, 0, 1.5);
  const grain = clamp(options.grain ?? 0.02, 0, 0.2);
  const blur = clamp(options.blur ?? 0, 0, 32);

  const rgbPalette = parseColors(options.colors, DEFAULT_COLORS);
  const palette = rgbPalette.map(rgbToOklab);
  const { w, h } = workingSize(width, height);
  const field = renderField(w, h, seedValue, palette, warp);
  const workRadius = blur * (w / Math.max(width, 1));
  const src = blurPixels(field, w, h, workRadius);

  if (w === width && h === height && grain === 0) {
    return encodePngRgb(width, height, src);
  }

  const rgb = new Uint8Array(width * height * 3);
  const grainRng = mulberry32(seedValue ^ 0x85ebca6b);
  const scaleX = (w - 1) / Math.max(1, width - 1);
  const scaleY = (h - 1) / Math.max(1, height - 1);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = sampleBilinear(src, w, h, x * scaleX, y * scaleY);
      const n = grain === 0 ? 0 : (grainRng() - 0.5) * 255 * grain;
      const idx = (y * width + x) * 3;
      rgb[idx] = clamp(r + n, 0, 255);
      rgb[idx + 1] = clamp(g + n, 0, 255);
      rgb[idx + 2] = clamp(b + n, 0, 255);
    }
  }

  return encodePngRgb(width, height, rgb);
}
