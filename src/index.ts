import { Hono } from "hono";
import { cors } from "hono/cors";
import { generateGradient } from "./generate.js";
import { brandGradientPath, pickBrandPreset, presetsBrowserScript } from "./presets.js";
import { buildAgentPrompt, buildLlmsFull, buildLlmsTxt, buildOpenApi } from "./spec.js";
import docsHtml from "./docs.html";
import homeHtml from "./home.html";
import playgroundHtml from "./playground.html";
import i18nJs from "./i18n.js";

const app = new Hono();

app.use("*", cors());

app.get("/", (c) => {
  const q = c.req.query();
  if (["w", "h", "width", "height", "seed", "colors", "warp", "grain", "blur"].some((key) => q[key] !== undefined)) {
    const search = new URL(c.req.url).search;
    return c.redirect(`/playground${search}`, 302);
  }
  return c.html(homeHtml);
});
app.get("/playground", (c) => c.html(playgroundHtml));
app.get("/docs", (c) => c.html(docsHtml));
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
  c.text(buildLlmsTxt(new URL(c.req.url).origin), 200, {
    "Content-Type": "text/plain; charset=utf-8",
  }),
);

app.get("/.well-known/llms.txt", (c) => c.redirect("/llms.txt", 307));

app.get("/llms-full.txt", (c) =>
  c.text(buildLlmsFull(new URL(c.req.url).origin), 200, {
    "Content-Type": "text/plain; charset=utf-8",
  }),
);

app.get("/openapi.json", (c) => c.json(buildOpenApi(new URL(c.req.url).origin)));

app.get("/prompt.txt", (c) =>
  c.text(buildAgentPrompt(new URL(c.req.url).origin, c.req.query("example")), 200, {
    "Content-Type": "text/plain; charset=utf-8",
  }),
);

app.get("/robots.txt", (c) =>
  c.text(["User-agent: *", "Allow: /", "Sitemap: /llms.txt"].join("\n")),
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

  const cacheKey = new Request(c.req.url, { method: "GET" });
  const cached = await caches.default.match(cacheKey);
  if (cached) return cached;

  const png = generateGradient({ width, height, seed, colors, warp, grain, blur });
  const res = new Response(png, { headers: pngHeaders });
  c.executionCtx.waitUntil(caches.default.put(cacheKey, res.clone()));
  return res;
});

export default app;
