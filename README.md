# Gradient Image Generator

URL のクエリだけで、有機的なメッシュグラデ PNG を返す API です。同じ入力は同じ画像になります。

公開: [https://gradient-image-generator.ituyama01.workers.dev](https://gradient-image-generator.ituyama01.workers.dev)

## npm

```bash
npm install gradient-image-generator
```

```js
import { writeFileSync } from "node:fs";
import { generateGradient } from "gradient-image-generator";

const png = generateGradient({
  width: 800,
  height: 800,
  seed: "jalapeno",
  colors: "2EE59D,4FC3F7,00ACC1",
});
writeFileSync("gradient.png", png);
```

CLI:

```bash
npx gradient-image-generator --seed jalapeno --colors 2EE59D,4FC3F7,00ACC1 -o gradient.png
```

公開前は GitHub から入れられます。

```bash
npm install github:ituyama/gradient-image-generator
```

```bash
npm start
```

- トップ: [https://gradient-image-generator.ituyama01.workers.dev](https://gradient-image-generator.ituyama01.workers.dev)
- Playground: [https://gradient-image-generator.ituyama01.workers.dev/playground](https://gradient-image-generator.ituyama01.workers.dev/playground)
- ドキュメント: [https://gradient-image-generator.ituyama01.workers.dev/docs](https://gradient-image-generator.ituyama01.workers.dev/docs)

## 画像を取る

```text
GET /gradient?w=800&h=800&seed=jalapeno&colors=2EE59D,4FC3F7,00ACC1
```

`<img src="...">` にそのまま置けます。同じクエリはいつも同じ画像です。

| パラメータ | 説明 |
|---|---|
| `w` / `h` | 幅・高さ（16–2048、省略時 800） |
| `seed` | 模様を固定する文字列 |
| `colors` | HEX。カンマ / スペース / `\|` 区切り |
| `warp` | 流れの強さ（0–1.5） |
| `grain` | 粒子（0–0.2） |
| `blur` | ぼかし半径（0–32、px） |

## AI / エージェント向け

認証なし。成功時は PNG、壊れた数値だけ JSON 400 です。

- [ChatGPT / Claude / Gemini で開く](https://gradient-image-generator.ituyama01.workers.dev/docs#ai-links)
- [`/prompt.txt`](https://gradient-image-generator.ituyama01.workers.dev/prompt.txt)
- [`/llms.txt`](https://gradient-image-generator.ituyama01.workers.dev/llms.txt)
- [`/llms-full.txt`](https://gradient-image-generator.ituyama01.workers.dev/llms-full.txt)
- [`/openapi.json`](https://gradient-image-generator.ituyama01.workers.dev/openapi.json)

ローカルは `npm start`（`wrangler dev`）。再公開は `npm run deploy`。
