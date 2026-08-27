import { Hono } from "hono";
import { cors } from "hono/cors";
import { generateGradient } from "./generate.js";
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

const favicon = (size: number) => {
  const seed = Math.random().toString(36).slice(2, 10);
  const png = generateGradient({ width: size, height: size, seed });
  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
};

app.get("/favicon.ico", () => favicon(64));
app.get("/apple-touch-icon.png", () => favicon(180));

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

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});

export default app;
