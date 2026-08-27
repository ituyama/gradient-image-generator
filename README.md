# Gradient Image Generator

URL のクエリだけで、有機的なメッシュグラデ PNG を返す API です。同じ入力は同じ画像になります。

- 公開: [https://gradient.ituyama.com](https://gradient.ituyama.com)
- npm: [https://www.npmjs.com/package/gradient-image-generator](https://www.npmjs.com/package/gradient-image-generator)
- GitHub: [https://github.com/ituyama/gradient-image-generator](https://github.com/ituyama/gradient-image-generator)
- ドキュメント: [npm](https://gradient.ituyama.com/docs#npm) / [コントリビュート](https://gradient.ituyama.com/docs#contribute)

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

ソースから入れるなら:

```bash
npm install github:ituyama/gradient-image-generator
```

```bash
npm start
```

- トップ: [https://gradient.ituyama.com](https://gradient.ituyama.com)
- Playground: [https://gradient.ituyama.com/playground](https://gradient.ituyama.com/playground)
- ドキュメント: [https://gradient.ituyama.com/docs](https://gradient.ituyama.com/docs)

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

- [ChatGPT / Claude / Gemini で開く](https://gradient.ituyama.com/docs#ai-links)
- [`/prompt.txt`](https://gradient.ituyama.com/prompt.txt)
- [`/llms.txt`](https://gradient.ituyama.com/llms.txt)
- [`/llms-full.txt`](https://gradient.ituyama.com/llms-full.txt)
- [`/openapi.json`](https://gradient.ituyama.com/openapi.json)
- [MCP](https://gradient.ituyama.com/docs#mcp): `https://gradient.ituyama.com/mcp`

Cursor の `mcp.json`:

```json
{
  "mcpServers": {
    "gradient": {
      "url": "https://gradient.ituyama.com/mcp"
    }
  }
}
```

ローカルは `npm start`（`wrangler dev`）。再公開は `npm run deploy`。

## コントリビュート

小さな修正から歓迎です。`GET /gradient` の契約は変えないでください。同じクエリは同じ画像のままにします。

```bash
git clone https://github.com/ituyama/gradient-image-generator.git
cd gradient-image-generator
npm install
npm start
```

直したら `main` 向けに Pull Request を送ってください。完成した塊ごとにコミットすると追いやすいです。詳しくは [ドキュメント](https://gradient.ituyama.com/docs#contribute) と [CONTRIBUTING.md](CONTRIBUTING.md) を見てください。
