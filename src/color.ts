export type Rgb = { r: number; g: number; b: number };
export type Oklab = { L: number; a: number; b: number };

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function parseHex(input: string): Rgb | null {
  const m = input.trim().match(HEX_RE);
  if (!m) return null;
  let hex = m[1];
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const n = parseInt(hex, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function parseColors(raw: string | undefined, fallback: string[]): Rgb[] {
  const source = raw?.trim()
    ? raw.split(/[,| ]+/).map((s) => s.trim()).filter(Boolean)
    : fallback;
  const colors: Rgb[] = [];
  for (const item of source) {
    const rgb = parseHex(item);
    if (rgb) colors.push(rgb);
  }
  return colors.length >= 2 ? colors : fallback.map((c) => parseHex(c)!);
}

function srgbToLinear(c: number): number {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(c: number): number {
  const x = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.min(255, Math.max(0, Math.round(x * 255)));
}

export function rgbToOklab(rgb: Rgb): Oklab {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

export function oklabToRgb(lab: Oklab): Rgb {
  const l_ = lab.L + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const m_ = lab.L - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const s_ = lab.L - 0.0894841775 * lab.a - 1.291485548 * lab.b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return {
    r: linearToSrgb(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  };
}

export function mixOklab(colors: Oklab[], weights: number[]): Oklab {
  let L = 0;
  let a = 0;
  let b = 0;
  let w = 0;
  for (let i = 0; i < colors.length; i++) {
    const weight = weights[i];
    L += colors[i].L * weight;
    a += colors[i].a * weight;
    b += colors[i].b * weight;
    w += weight;
  }
  const inv = w > 1e-8 ? 1 / w : 1;
  return { L: L * inv, a: a * inv, b: b * inv };
}
