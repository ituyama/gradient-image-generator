import { Hono } from "hono";
import { cors } from "hono/cors";
import { generateGradient } from "./generate.js";
import {
  applyPageMeta,
  copy,
  gradientCacheUrl,
  LEGACY_HOST,
  OG_HEIGHT,
  OG_WIDTH,
  ogImageUrl,
  ogParams,
  pageLang,
  PUBLIC_ORIGIN,
  publicOrigin,
} from "./meta.js";
import { brandGradientPath, pickBrandPreset, presetsBrowserScript } from "./presets.js";
import { handleMcp } from "./mcp.js";
import {
  listPopular,
  normalizeLook,
  recordPopular,
  shouldAcceptHit,
  shouldCountGradient,
  type RankingStore,
} from "./popular.js";
import { buildAgentPrompt, buildLlmsFull, buildLlmsTxt, buildMcpDiscovery, buildOpenApi } from "./spec.js";

import docsHtml from "./docs.html";
import homeHtml from "./home.html";
import playgroundHtml from "./playground.html";
import i18nJs from "./i18n.js";

type Bindings = { RANKING?: RankingStore };
const app = new Hono<{ Bindings: Bindings }>();

app.use("*", cors());
app.use("*", async (c, next) => {
  const url = new URL(c.req.url);
  if (url.hostname === LEGACY_HOST) {
    return c.redirect(`${PUBLIC_ORIGIN}${url.pathname}${url.search}`, 301);
  }
  await next();
});

app.get("/", (c) => {
  const q = c.req.query();
  if (["w", "h", "width", "height", "seed", "colors", "warp", "grain", "blur"].some((key) => q[key] !== undefined)) {
    const search = new URL(c.req.url).search;
    return c.redirect(`/playground${search}`, 302);
  }
  const origin = publicOrigin(c.req.url);
  const lang = pageLang(c.req.header("accept-language"));
  const text = copy(lang);
  return c.html(
    applyPageMeta(homeHtml, {
      origin,
      path: "/",
      title: text.homeTitle,
      description: text.homeDesc,
      image: ogImageUrl(origin),
      imageAlt: text.imageAlt,
      lang,
      themeColor: "#09090b",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: text.site,
        url: `${origin}/`,
        description: text.homeDesc,
      },
    }),
  );
});
app.get("/playground", (c) => {
  const origin = publicOrigin(c.req.url);
  const q = c.req.query();
  const lang = pageLang(c.req.header("accept-language"));
  const text = copy(lang);
  const seed = q.seed?.trim();
  const search = new URL(c.req.url).search;
  return c.html(
    applyPageMeta(playgroundHtml, {
      origin,
      path: `/playground${search}`,
      title: seed ? `${seed} · ${text.playTitle}` : text.playTitle,
      description: text.playDesc,
      image: ogImageUrl(origin, q),
      imageAlt: seed ? `${seed} · ${text.imageAlt}` : text.imageAlt,
      lang,
      themeColor: "#0b0c10",
    }),
  );
});
app.get("/docs", (c) => {
  const origin = publicOrigin(c.req.url);
  const lang = pageLang(c.req.header("accept-language"));
  const text = copy(lang);
  return c.html(
    applyPageMeta(docsHtml, {
      origin,
      path: "/docs",
      title: text.docsTitle,
      description: text.docsDesc,
      image: ogImageUrl(origin),
      imageAlt: text.imageAlt,
      lang,
      themeColor: "#ffffff",
    }),
  );
});
app.get("/i18n.js", (c) =>
  c.text(i18nJs, 200, { "Content-Type": "text/javascript; charset=utf-8" }),
);
app.get("/presets.js", (c) =>
  c.text(presetsBrowserScript(), 200, {
    "Content-Type": "text/javascript; charset=utf-8",
    "Cache-Control": "public, max-age=86400",
  }),
);

app.get("/llms.txt", (c) =>
  c.text(buildLlmsTxt(publicOrigin(c.req.url)), 200, {
    "Content-Type": "text/plain; charset=utf-8",
  }),
);

app.get("/.well-known/llms.txt", (c) => c.redirect("/llms.txt", 307));

app.get("/llms-full.txt", (c) =>
  c.text(buildLlmsFull(publicOrigin(c.req.url)), 200, {
    "Content-Type": "text/plain; charset=utf-8",
  }),
);

app.get("/openapi.json", (c) => c.json(buildOpenApi(publicOrigin(c.req.url))));

app.get("/popular.json", async (c) =>
  c.json(
    { items: await listPopular(c.env.RANKING) },
    200,
    { "Cache-Control": "public, max-age=60" },
  ),
);

app.post("/popular/hit", async (c) => {
  if (!shouldAcceptHit(c.req.raw)) return c.body(null, 204);
  const body = await c.req.json().catch(() => ({}));
  const look = normalizeLook({
    seed: typeof body.seed === "string" ? body.seed : undefined,
    colors: typeof body.colors === "string" ? body.colors : undefined,
    warp: body.warp === undefined ? undefined : Number(body.warp),
    grain: body.grain === undefined ? undefined : Number(body.grain),
    blur: body.blur === undefined ? undefined : Number(body.blur),
  });
  c.executionCtx.waitUntil(recordPopular(c.env.RANKING, look));
  return c.body(null, 204);
});

app.get("/.well-known/mcp.json", (c) => c.json(buildMcpDiscovery(publicOrigin(c.req.url))));
app.get("/.well-known/mcp/server-card.json", (c) =>
  c.json(buildMcpDiscovery(publicOrigin(c.req.url))),
);

app.get("/prompt.txt", (c) =>
  c.text(buildAgentPrompt(publicOrigin(c.req.url), c.req.query("example")), 200, {
    "Content-Type": "text/plain; charset=utf-8",
  }),
);

app.get("/robots.txt", (c) =>
  c.text(["User-agent: *", "Allow: /", `Sitemap: ${PUBLIC_ORIGIN}/llms.txt`].join("\n")),
);

const pngHeaders = {
  "Content-Type": "image/png",
  "Cache-Control": "public, max-age=31536000, immutable",
  "CDN-Cache-Control": "public, max-age=31536000, immutable",
  "Access-Control-Allow-Origin": "*",
} as const;

const brandIcon = async (requestUrl: string, size: number, waitUntil: (task: Promise<unknown>) => void) => {
  const preset = pickBrandPreset();
  const key = new Request(new URL(brandGradientPath(size, size, preset), requestUrl), { method: "GET" });
  const cached = await caches.default.match(key);
  if (cached) {
    return new Response(cached.body, {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
    });
  }
  const png = generateGradient({ width: size, height: size, seed: preset.seed, colors: preset.colors });
  const res = new Response(png, { headers: pngHeaders });
  waitUntil(caches.default.put(key, res.clone()));
  return new Response(png, {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
  });
};

app.get("/favicon.ico", (c) => brandIcon(c.req.url, 64, (task) => c.executionCtx.waitUntil(task)));
app.get("/apple-touch-icon.png", (c) => brandIcon(c.req.url, 180, (task) => c.executionCtx.waitUntil(task)));

app.get("/og.png", async (c) => {
  const query = c.req.query();
  const params = ogParams(query);
  const seed = params.seed;
  const colors = params.colors;
  const warp = params.warp === undefined ? undefined : Number(params.warp);
  const grain = params.grain === undefined ? undefined : Number(params.grain);
  const blur = params.blur === undefined ? undefined : Number(params.blur);

  if (warp !== undefined && !Number.isFinite(warp)) {
    return c.json({ error: "warp は数値で指定してください" }, 400);
  }
  if (grain !== undefined && !Number.isFinite(grain)) {
    return c.json({ error: "grain は数値で指定してください" }, 400);
  }
  if (blur !== undefined && !Number.isFinite(blur)) {
    return c.json({ error: "blur は数値で指定してください" }, 400);
  }

  const origin = publicOrigin(c.req.url);
  const cacheKey = new Request(gradientCacheUrl(origin, query), { method: "GET" });
  const cached = await caches.default.match(cacheKey);
  if (cached) {
    return new Response(cached.body, { headers: pngHeaders });
  }

  const png = generateGradient({
    width: OG_WIDTH,
    height: OG_HEIGHT,
    seed,
    colors,
    warp,
    grain,
    blur,
  });
  const res = new Response(png, { headers: pngHeaders });
  c.executionCtx.waitUntil(caches.default.put(cacheKey, res.clone()));
  return res;
});

app.get("/gradient", async (c) => {
  const query = c.req.query();
  const width = Number(query.w ?? query.width ?? 800);
  const height = Number(query.h ?? query.height ?? 800);

  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return c.json({ error: "w と h は数値で指定してください" }, 400);
  }

  const seed = (query.seed ?? "0").trim() || "0";
  const colors = query.colors;
  const warp = query.warp === undefined ? undefined : Number(query.warp);
  const grain = query.grain === undefined ? undefined : Number(query.grain);
  const blur = query.blur === undefined ? undefined : Number(query.blur);

  if (warp !== undefined && !Number.isFinite(warp)) {
    return c.json({ error: "warp は数値で指定してください" }, 400);
  }
  if (grain !== undefined && !Number.isFinite(grain)) {
    return c.json({ error: "grain は数値で指定してください" }, 400);
  }
  if (blur !== undefined && !Number.isFinite(blur)) {
    return c.json({ error: "blur は数値で指定してください" }, 400);
  }

  const look = normalizeLook({ seed, colors, warp, grain, blur });
  if (shouldCountGradient(c.req.raw)) {
    c.executionCtx.waitUntil(recordPopular(c.env.RANKING, look));
  }

  const cacheKey = new Request(c.req.url, { method: "GET" });
  const cached = await caches.default.match(cacheKey);
  if (cached) return cached;

  const png = generateGradient({ width, height, seed, colors, warp, grain, blur });
  const res = new Response(png, { headers: pngHeaders });
  c.executionCtx.waitUntil(caches.default.put(cacheKey, res.clone()));
  return res;
});

export default {
  fetch(request: Request, env: unknown, ctx: { waitUntil(promise: Promise<unknown>): void }) {
    const path = new URL(request.url).pathname;
    if (path === "/mcp" || path.startsWith("/mcp/")) {
      return handleMcp(request, env, ctx);
    }
    return app.fetch(request, env, ctx);
  },
};
