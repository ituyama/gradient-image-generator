import { serve } from "@hono/node-server";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { generateGradient } from "./generate.js";
import { buildAgentPrompt, buildLlmsFull, buildLlmsTxt, buildOpenApi } from "./spec.js";

const app = new Hono();
const publicDir = dirname(fileURLToPath(import.meta.url));
const page = (name: string) => readFileSync(join(publicDir, name), "utf8");

app.use("*", cors());

app.get("/", (c) => c.html(page("playground.html")));
app.get("/docs", (c) => c.html(page("docs.html")));

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

app.get("/gradient", (c) => {
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

  const png = generateGradient({ width, height, seed, colors, warp, grain, blur });

  return new Response(Uint8Array.from(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`http://localhost:${info.port}`);
});
