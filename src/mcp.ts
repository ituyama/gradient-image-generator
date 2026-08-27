import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { z } from "zod";
import { generateGradient } from "./generate.js";
import { publicOrigin } from "./meta.js";
import {
  API_VERSION,
  buildGradientUrl,
  buildLlmsTxt,
  buildPlaygroundUrl,
  type GradientQuery,
} from "./spec.js";

const MAX_EMBED_PIXELS = 512 * 512;

const generateInput = z.object({
  w: z.number().optional(),
  h: z.number().optional(),
  seed: z.string().optional(),
  colors: z.string().optional(),
  warp: z.number().optional(),
  grain: z.number().optional(),
  blur: z.number().optional(),
  include_image: z.boolean().optional(),
});

const generateOutput = z.object({
  url: z.string(),
  markdown: z.string(),
  html: z.string(),
  playground: z.string(),
});

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function queryFromInput(input: z.infer<typeof generateInput>): GradientQuery {
  return {
    w: input.w,
    h: input.h,
    seed: input.seed,
    colors: input.colors,
    warp: input.warp,
    grain: input.grain,
    blur: input.blur,
  };
}

export function createGradientMcpServer(origin: string) {
  const server = new McpServer({
    name: "gradient-image-generator",
    version: API_VERSION,
    title: "Gradient Image API",
  });

  server.registerResource(
    "spec",
    `${origin}/llms.txt`,
    {
      title: "Gradient Image API spec",
      description: "Short machine-readable contract for GET /gradient.",
      mimeType: "text/plain",
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "text/plain", text: buildLlmsTxt(origin) }],
    }),
  );

  server.registerTool(
    "generate",
    {
      title: "Generate gradient URL",
      description:
        "Assemble a GET /gradient URL for an organic mesh-gradient PNG. Same params as the HTTP API. Prefer embedding the returned URL; success on HTTP is image/png, not JSON. Set include_image only for small sizes.",
      inputSchema: generateInput,
      outputSchema: generateOutput,
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    async (input) => {
      const query = queryFromInput(input);
      const url = buildGradientUrl(origin, query);
      const width = input.w ?? 800;
      const height = input.h ?? 800;
      const output = {
        url,
        markdown: `![gradient](${url})`,
        html: `<img src="${url}" alt="" width="${Math.round(width)}" height="${Math.round(height)}" />`,
        playground: buildPlaygroundUrl(origin, query),
      };

      const content: Array<
        | { type: "text"; text: string }
        | { type: "image"; data: string; mimeType: "image/png" }
      > = [
        {
          type: "text",
          text: [
            output.url,
            "",
            `Markdown: ${output.markdown}`,
            `HTML: ${output.html}`,
            `Playground: ${output.playground}`,
          ].join("\n"),
        },
      ];

      if (input.include_image) {
        const area = Math.round(width) * Math.round(height);
        if (area > MAX_EMBED_PIXELS) {
          content.push({
            type: "text",
            text: `Image bytes omitted because ${Math.round(width)}×${Math.round(height)} exceeds the MCP embed cap. Use the URL.`,
          });
        } else {
          const png = generateGradient({
            width: input.w,
            height: input.h,
            seed: input.seed,
            colors: input.colors,
            warp: input.warp,
            grain: input.grain,
            blur: input.blur,
          });
          content.push({
            type: "image",
            data: bytesToBase64(png),
            mimeType: "image/png",
          });
        }
      }

      return {
        content,
        structuredContent: output,
      };
    },
  );

  return server;
}

export function handleMcp(
  request: Request,
  env: unknown,
  ctx: { waitUntil(promise: Promise<unknown>): void },
) {
  const origin = publicOrigin(request.url);
  return createMcpHandler(() => createGradientMcpServer(origin), {
    route: "/mcp",
    corsOptions: { origin: "*" },
    allowedOriginHostnames: "*",
  })(request, env, ctx);
}
