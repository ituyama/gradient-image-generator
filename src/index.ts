import { serve } from "@hono/node-server";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { generateGradient } from "./generate.js";

const app = new Hono();
const demoHtml = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "demo.html"),
  "utf8",
);

app.use("*", cors());

app.get("/", (c) => c.html(demoHtml));

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

  if (warp !== undefined && !Number.isFinite(warp)) {
    return c.json({ error: "warp は数値で指定してください" }, 400);
  }
  if (grain !== undefined && !Number.isFinite(grain)) {
    return c.json({ error: "grain は数値で指定してください" }, 400);
  }

  const png = generateGradient({ width, height, seed, colors, warp, grain });

  return new Response(png, {
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
