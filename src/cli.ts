#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { generateGradient } from "./generate.js";

const HELP = `Usage:
  npx gradient-image-generator [file.png]
  npx gradient-image-generator --seed jalapeno --colors 2EE59D,4FC3F7 -o out.png

Options match GET /gradient:
  --w, --width     16-2048 (default 800)
  --h, --height    16-2048 (default 800)
  --seed           any string (default 0)
  --colors         HEX, comma/space/| separated
  --warp           0-1.5
  --grain          0-0.2
  --blur           0-32
  --out, -o        write PNG (default: first argument, or stdout)
`;

function parseArgs(argv: string[]) {
  const flags = new Map<string, string>();
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help") {
      flags.set("help", "true");
      continue;
    }
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq !== -1) {
        flags.set(a.slice(2, eq), a.slice(eq + 1));
        continue;
      }
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("-")) {
        flags.set(key, next);
        i += 1;
      } else {
        flags.set(key, "true");
      }
      continue;
    }
    if (a === "-o") {
      const next = argv[i + 1];
      if (!next || next.startsWith("-")) throw new Error("-o にはファイル名が必要です");
      flags.set("out", next);
      i += 1;
      continue;
    }
    rest.push(a);
  }
  return { flags, rest };
}

function num(flags: Map<string, string>, keys: string[]): number | undefined {
  for (const key of keys) {
    const raw = flags.get(key);
    if (raw === undefined) continue;
    const n = Number(raw);
    if (!Number.isFinite(n)) throw new Error(`${key} は数値で指定してください`);
    return n;
  }
  return undefined;
}

const { flags, rest } = parseArgs(process.argv.slice(2));
if (flags.has("help")) {
  process.stdout.write(HELP);
  process.exit(0);
}

const out = flags.get("out") ?? flags.get("o") ?? rest[0];
const png = generateGradient({
  width: num(flags, ["w", "width"]),
  height: num(flags, ["h", "height"]),
  seed: flags.get("seed"),
  colors: flags.get("colors"),
  warp: num(flags, ["warp"]),
  grain: num(flags, ["grain"]),
  blur: num(flags, ["blur"]),
});

if (out) {
  writeFileSync(out, png);
} else {
  process.stdout.write(png);
}
