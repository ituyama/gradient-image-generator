export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
export const OG_DEFAULT_SEED = "og";
export const OG_DEFAULT_COLORS = "7C5CFF,49C6E5,F472B6,1E1B4B";

export type Lang = "ja" | "en" | "zh";

const COPY: Record<
  Lang,
  { site: string; homeTitle: string; homeDesc: string; playTitle: string; playDesc: string; docsTitle: string; docsDesc: string; imageAlt: string }
> = {
  ja: {
    site: "Gradient Image API",
    homeTitle: "Gradient Image API",
    homeDesc: "URL に幅・高さ・シード・色を載せるだけで、有機的なメッシュグラデ PNG が返ります。同じクエリは同じ画像です。",
    playTitle: "Playground · Gradient Image API",
    playDesc: "値を動かしてメッシュグラデ PNG を作ります。同じクエリは同じ画像になります。",
    docsTitle: "ドキュメント · Gradient Image API",
    docsDesc: "GET /gradient の使い方。認証なし。同じクエリは同じ PNG です。",
    imageAlt: "メッシュグラデーションの作例",
  },
  en: {
    site: "Gradient Image API",
    homeTitle: "Gradient Image API",
    homeDesc: "Put width, height, seed, and colors in a URL and get an organic mesh-gradient PNG. Same query, same image.",
    playTitle: "Playground · Gradient Image API",
    playDesc: "Tweak values and make a mesh-gradient PNG. The same query always returns the same image.",
    docsTitle: "Docs · Gradient Image API",
    docsDesc: "How to use GET /gradient. No auth. Same query always returns the same PNG.",
    imageAlt: "Mesh gradient example",
  },
  zh: {
    site: "Gradient Image API",
    homeTitle: "Gradient Image API",
    homeDesc: "把宽、高、种子和颜色放进 URL，就会返回有机的网格渐变 PNG。相同查询永远得到同一张图。",
    playTitle: "Playground · Gradient Image API",
    playDesc: "调整参数生成网格渐变 PNG。相同查询永远得到同一张图。",
    docsTitle: "文档 · Gradient Image API",
    docsDesc: "GET /gradient 的用法。无需认证。相同查询永远得到同一张 PNG。",
    imageAlt: "网格渐变示例",
  },
};

const LOCALES: Record<Lang, string> = { ja: "ja_JP", en: "en_US", zh: "zh_CN" };

export function pageLang(acceptLanguage: string | undefined): Lang {
  const raw = (acceptLanguage ?? "").toLowerCase();
  const first = raw.split(",")[0]?.trim() ?? "";
  if (first.startsWith("zh")) return "zh";
  if (first.startsWith("en")) return "en";
  if (first.startsWith("ja")) return "ja";
  if (raw.includes("zh")) return "zh";
  if (raw.includes("en")) return "en";
  return "ja";
}

export function copy(lang: Lang) {
  return COPY[lang];
}

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function ogParams(query: Record<string, string | undefined> = {}) {
  const custom = ["seed", "colors", "warp", "grain", "blur"].some((key) => query[key]?.trim());
  return {
    seed: (query.seed ?? (custom ? "0" : OG_DEFAULT_SEED)).trim() || (custom ? "0" : OG_DEFAULT_SEED),
    colors: query.colors?.trim() || (custom ? undefined : OG_DEFAULT_COLORS),
    warp: query.warp?.trim() || undefined,
    grain: query.grain?.trim() || undefined,
    blur: query.blur?.trim() || undefined,
  };
}

export function ogImageUrl(origin: string, query: Record<string, string | undefined> = {}): string {
  const url = new URL("/og.png", origin);
  for (const key of ["seed", "colors", "warp", "grain", "blur"] as const) {
    const value = query[key]?.trim();
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

export function gradientCacheUrl(origin: string, query: Record<string, string | undefined> = {}): string {
  const params = ogParams(query);
  const url = new URL("/gradient", origin);
  url.searchParams.set("w", String(OG_WIDTH));
  url.searchParams.set("h", String(OG_HEIGHT));
  url.searchParams.set("seed", params.seed);
  if (params.colors) url.searchParams.set("colors", params.colors);
  for (const key of ["warp", "grain", "blur"] as const) {
    const value = params[key];
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

type PageMeta = {
  origin: string;
  path: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  lang: Lang;
  themeColor: string;
  jsonLd?: Record<string, unknown>;
};

export function applyPageMeta(html: string, page: PageMeta): string {
  const url = `${page.origin}${page.path}`;
  const locale = LOCALES[page.lang];
  const tags = [
    `<meta name="description" content="${esc(page.description)}" />`,
    `<meta name="theme-color" content="${esc(page.themeColor)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${esc(COPY[page.lang].site)}" />`,
    `<meta property="og:locale" content="${locale}" />`,
    `<meta property="og:title" content="${esc(page.title)}" />`,
    `<meta property="og:description" content="${esc(page.description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(page.image)}" />`,
    `<meta property="og:image:width" content="${OG_WIDTH}" />`,
    `<meta property="og:image:height" content="${OG_HEIGHT}" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:alt" content="${esc(page.imageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(page.title)}" />`,
    `<meta name="twitter:description" content="${esc(page.description)}" />`,
    `<meta name="twitter:image" content="${esc(page.image)}" />`,
    `<meta name="twitter:image:alt" content="${esc(page.imageAlt)}" />`,
  ];
  if (page.jsonLd) {
    tags.push(`<script type="application/ld+json">${JSON.stringify(page.jsonLd)}</script>`);
  }

  return html
    .replace(/<html\b([^>]*)lang="[^"]*"/, `<html$1lang="${page.lang}"`)
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(page.title)}</title>`)
    .replace("</head>", `${tags.join("\n    ")}\n  </head>`);
}
