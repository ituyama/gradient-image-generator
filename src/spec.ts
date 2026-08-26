export const API_VERSION = "1.0.0";
export const DEFAULT_COLORS = ["#2EE59D", "#4FC3F7", "#00ACC1", "#80DEEA"];

export const PARAMS = [
  {
    name: "w",
    aliases: ["width"],
    type: "integer",
    required: false,
    default: 800,
    min: 16,
    max: 2048,
    description: "Image width in pixels. Values outside 16-2048 are clamped.",
  },
  {
    name: "h",
    aliases: ["height"],
    type: "integer",
    required: false,
    default: 800,
    min: 16,
    max: 2048,
    description: "Image height in pixels. Values outside 16-2048 are clamped.",
  },
  {
    name: "seed",
    aliases: [],
    type: "string",
    required: false,
    default: "0",
    description:
      "Any string. Same seed + same other params always produce the same PNG.",
  },
  {
    name: "colors",
    aliases: [],
    type: "string",
    required: false,
    default: DEFAULT_COLORS.join(","),
    description:
      "2+ hex colors, with or without #. Separate with comma, space, or |.",
  },
  {
    name: "warp",
    aliases: [],
    type: "number",
    required: false,
    default: 0.62,
    min: 0,
    max: 1.5,
    description: "Flow distortion strength. 0 is softer blobs, higher is more ribbons.",
  },
  {
    name: "grain",
    aliases: [],
    type: "number",
    required: false,
    default: 0.035,
    min: 0,
    max: 0.2,
    description: "Film-grain amount over the final image.",
  },
] as const;

export function buildOpenApi(origin: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Gradient Image Generator",
      version: API_VERSION,
      summary: "URL-parameter PNG mesh-gradient API",
      description:
        "GET /gradient returns an organic mesh-gradient PNG. No auth. Deterministic for a given query string. CORS is open.",
      contact: { url: origin },
    },
    servers: [{ url: origin, description: "Current origin" }],
    paths: {
      "/gradient": {
        get: {
          operationId: "getGradient",
          summary: "Generate a mesh-gradient PNG",
          description:
            "Returns image/png. Embed directly in <img src>. Invalid numeric params return JSON 400.",
          parameters: PARAMS.map((param) => ({
            name: param.name,
            in: "query",
            required: param.required,
            description: param.aliases.length
              ? `${param.description} Alias: ${param.aliases.join(", ")}.`
              : param.description,
            schema: {
              type: param.type,
              default: param.default,
              ...(param.min !== undefined ? { minimum: param.min } : {}),
              ...(param.max !== undefined ? { maximum: param.max } : {}),
            },
            examples: exampleFor(param.name),
          })),
          responses: {
            "200": {
              description: "PNG image",
              content: {
                "image/png": {
                  schema: { type: "string", format: "binary" },
                },
              },
              headers: {
                "Cache-Control": {
                  schema: { type: "string" },
                  description: "public, max-age=31536000, immutable",
                },
              },
            },
            "400": {
              description: "Invalid numeric query parameter",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["error"],
                    properties: {
                      error: { type: "string" },
                    },
                  },
                  example: { error: "w と h は数値で指定してください" },
                },
              },
            },
          },
        },
      },
    },
    externalDocs: {
      description: "Playground and human docs",
      url: `${origin}/`,
    },
  };
}

function exampleFor(name: string) {
  switch (name) {
    case "w":
      return { square: { value: 800 }, og: { value: 1200 } };
    case "h":
      return { square: { value: 800 }, og: { value: 630 } };
    case "seed":
      return { text: { value: "jalapeno" }, number: { value: "42" } };
    case "colors":
      return {
        mint: { value: "2EE59D,4FC3F7,00ACC1,80DEEA" },
        sunset: { value: "FF6B6B,FFD93D,FF8C42,C44569" },
      };
    case "warp":
      return { default: { value: 0.62 } };
    case "grain":
      return { default: { value: 0.035 } };
    default:
      return undefined;
  }
}

export function buildAgentPrompt(origin: string, exampleUrl?: string): string {
  const example =
    exampleUrl ?? `${origin}/gradient?w=800&h=800&seed=jalapeno&colors=2EE59D,4FC3F7,00ACC1`;
  return [
    "You are helping me use Gradient Image Generator, an unauthenticated HTTP image API.",
    "Read the spec if reachable, otherwise use only this contract. Do not invent endpoints.",
    `Spec: ${origin}/llms.txt`,
    `Full spec: ${origin}/llms-full.txt`,
    `OpenAPI: ${origin}/openapi.json`,
    `Playground: ${origin}/`,
    "Contract:",
    `GET ${origin}/gradient?w=&h=&seed=&colors=&warp=&grain=`,
    "Success is image/png. Broken numeric params return JSON 400 {error}. CORS is open. Same query always returns the same PNG.",
    "w/h: integer 16-2048, default 800, clamped. seed: any string, default 0. colors: 2+ hex (# optional), split by comma/space/|. warp: 0-1.5 default 0.62. grain: 0-0.2 default 0.035.",
    `Current example image: ${example}`,
    "Help me assemble URLs, embed them in HTML/Markdown/OG tags, and pick seeds/colors. If the origin is localhost you cannot fetch the spec; stay inside this prompt.",
  ].join("\n");
}

export const AI_LINKS = [
  {
    name: "ChatGPT",
    href: (prompt: string) =>
      `https://chatgpt.com/?hints=search&q=${encodeURIComponent(prompt)}`,
  },
  {
    name: "Claude",
    href: (prompt: string) => `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
  },
  {
    name: "Gemini",
    href: (prompt: string) =>
      `https://gemini.google.com/app?prompt=${encodeURIComponent(prompt)}`,
  },
  {
    name: "Perplexity",
    href: (prompt: string) =>
      `https://www.perplexity.ai/search?q=${encodeURIComponent(prompt)}`,
  },
  {
    name: "Grok",
    href: (prompt: string) => `https://grok.com/?q=${encodeURIComponent(prompt)}`,
  },
  {
    name: "Copilot",
    href: (prompt: string) =>
      `https://copilot.microsoft.com/?q=${encodeURIComponent(prompt)}`,
  },
  {
    name: "DeepSeek",
    href: (prompt: string) =>
      `https://chat.deepseek.com/?q=${encodeURIComponent(prompt)}`,
  },
  {
    name: "Mistral",
    href: (prompt: string) =>
      `https://chat.mistral.ai/chat?q=${encodeURIComponent(prompt)}`,
  },
] as const;

export function buildLlmsTxt(origin: string): string {
  return `# Gradient Image Generator

> HTTP API that returns organic mesh-gradient PNG images from URL query parameters. No authentication.

This service is an image API. Prefer GET /gradient and embed the URL in <img>, Markdown, or Open Graph tags. Do not expect JSON on success.

## Human docs

- [Playground](${origin}/): live parameter editor
- [Open in ChatGPT / Claude / Gemini / ...](${origin}/#ai): prefilled prompt links
- [OpenAPI 3.1](${origin}/openapi.json)
- [Full machine doc](${origin}/llms-full.txt)

## Endpoint

GET ${origin}/gradient

Success: 200 image/png
Error: 400 application/json {"error": string}
CORS: *
Cache: public, max-age=31536000, immutable
Auth: none

## Query parameters

- w (alias width): integer 16-2048, default 800, clamped
- h (alias height): integer 16-2048, default 800, clamped
- seed: string, default "0". Deterministic.
- colors: hex list (# optional), split by comma / space / |. Default ${DEFAULT_COLORS.join(", ")}. Needs 2+ valid colors or defaults are used.
- warp: number 0-1.5, default 0.62
- grain: number 0-0.2, default 0.035

## Examples

- ${origin}/gradient?w=800&h=800&seed=jalapeno
- ${origin}/gradient?w=1200&h=630&seed=og&colors=2EE59D,4FC3F7,00ACC1
- Markdown: ![gradient](${origin}/gradient?w=640&h=360&seed=hero)

## Agent rules

- Same query string always returns the same bytes.
- To change the look, change seed or colors. Do not invent extra endpoints.
- Never request width or height above 2048.
- For documentation of this API itself, fetch ${origin}/llms-full.txt or ${origin}/openapi.json.
`;
}

export function buildLlmsFull(origin: string): string {
  const paramLines = PARAMS.map((param) => {
    const extra = [
      param.aliases.length ? `aliases: ${param.aliases.join(", ")}` : null,
      `type: ${param.type}`,
      `default: ${String(param.default)}`,
      param.min !== undefined ? `min: ${param.min}` : null,
      param.max !== undefined ? `max: ${param.max}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return `### ${param.name}\n${param.description}\n${extra}`;
  }).join("\n\n");

  return `# Gradient Image Generator — full spec

Version ${API_VERSION}
Base URL: ${origin}

## Purpose

Generate decorative organic mesh-gradient PNGs for cards, OG images, placeholders, and backgrounds. The only generation endpoint is GET /gradient.

## Contract

Method: GET
Path: /gradient
Success content-type: image/png
Error content-type: application/json
Authentication: none
CORS: Access-Control-Allow-Origin: *
Caching: Cache-Control: public, max-age=31536000, immutable
Determinism: identical query => identical PNG

## Parameters

${paramLines}

## Errors

If w/h/warp/grain are present but not numeric:

\`\`\`json
{"error":"w と h は数値で指定してください"}
\`\`\`

Invalid hex colors are skipped. If fewer than 2 valid colors remain, the default palette is used. This is not an error.

## Related URLs

- Playground / human docs: ${origin}/
- Prefilled AI prompt links: ${origin}/#ai
- Short AI summary: ${origin}/llms.txt
- OpenAPI: ${origin}/openapi.json
- This document: ${origin}/llms-full.txt

## Copy-paste snippets

HTML:

\`\`\`html
<img src="${origin}/gradient?w=800&h=800&seed=jalapeno" alt="" width="800" height="800" />
\`\`\`

curl:

\`\`\`bash
curl -o gradient.png "${origin}/gradient?w=800&h=800&seed=jalapeno&colors=2EE59D,4FC3F7,00ACC1"
\`\`\`

JavaScript:

\`\`\`js
const url = new URL("${origin}/gradient");
url.searchParams.set("w", "1200");
url.searchParams.set("h", "630");
url.searchParams.set("seed", "hero");
url.searchParams.set("colors", "2EE59D,4FC3F7,00ACC1");
const img = document.createElement("img");
img.src = url.toString();
\`\`\`
`;
}
