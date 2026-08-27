import { parseColors, type Rgb } from "./color.js";
import { DEFAULT_COLORS } from "./generate.js";

export type RankingStore = {
  get(key: string, options: { type: "json" }): Promise<unknown>;
  put(key: string, value: string): Promise<void>;
};

export type PopularLook = {
  seed: string;
  colors: string;
  warp: number;
  grain: number;
  blur: number;
};

export type PopularItem = PopularLook & { count: number };

const STORE_KEY = "counts:v1";
const MAX_TRACKED = 240;
const LIST_SIZE = 12;

function clamp(n: number, min: number, max: number, fallback: number): number {
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function hex(rgb: Rgb): string {
  return [rgb.r, rgb.g, rgb.b]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function lookId(look: PopularLook): string {
  return [look.seed, look.colors, look.warp, look.grain, look.blur].join("|");
}

export function normalizeLook(input: {
  seed?: string;
  colors?: string;
  warp?: number;
  grain?: number;
  blur?: number;
}): PopularLook {
  return {
    seed: (input.seed ?? "0").trim() || "0",
    colors: parseColors(input.colors, DEFAULT_COLORS).map(hex).join(","),
    warp: Math.round(clamp(Number(input.warp ?? 0.62), 0, 1.5, 0.62) * 1000) / 1000,
    grain: Math.round(clamp(Number(input.grain ?? 0.02), 0, 0.2, 0.02) * 1000) / 1000,
    blur: Math.round(clamp(Number(input.blur ?? 0), 0, 32, 0) * 1000) / 1000,
  };
}

export function lookSearch(look: PopularLook): string {
  const params = new URLSearchParams();
  params.set("seed", look.seed);
  params.set("colors", look.colors);
  if (look.warp !== 0.62) params.set("warp", String(look.warp));
  if (look.grain !== 0.02) params.set("grain", String(look.grain));
  if (look.blur !== 0) params.set("blur", String(look.blur));
  return params.toString().replace(/%2C/gi, ",");
}

export function isOwnHost(url: string | undefined, requestUrl: string): boolean {
  if (!url) return false;
  try {
    const host = new URL(url, requestUrl).hostname;
    return (
      host === new URL(requestUrl).hostname ||
      host === "gradient.ituyama.com" ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".workers.dev")
    );
  } catch {
    return false;
  }
}

export function shouldCountGradient(request: Request): boolean {
  const dest = request.headers.get("sec-fetch-dest");
  const referer = request.headers.get("referer");
  return !(dest === "image" && isOwnHost(referer, request.url));
}

export function shouldAcceptHit(request: Request): boolean {
  return isOwnHost(request.headers.get("origin") ?? request.headers.get("referer") ?? undefined, request.url);
}

export async function recordPopular(store: RankingStore | undefined, look: PopularLook, n = 1): Promise<void> {
  if (!store || n <= 0) return;
  const current = ((await store.get(STORE_KEY, { type: "json" })) as PopularItem[] | null) ?? [];
  const id = lookId(look);
  const next = current.filter((item) => lookId(item) !== id);
  const prev = current.find((item) => lookId(item) === id);
  next.push({ ...look, count: (prev?.count ?? 0) + n });
  next.sort((a, b) => b.count - a.count || a.seed.localeCompare(b.seed));
  await store.put(STORE_KEY, JSON.stringify(next.slice(0, MAX_TRACKED)));
}

export async function listPopular(store: RankingStore | undefined, limit = LIST_SIZE): Promise<PopularItem[]> {
  if (!store) return [];
  const current = ((await store.get(STORE_KEY, { type: "json" })) as PopularItem[] | null) ?? [];
  return current
    .filter((item) => item && item.seed && item.colors && item.count > 0)
    .sort((a, b) => b.count - a.count || a.seed.localeCompare(b.seed))
    .slice(0, limit);
}
