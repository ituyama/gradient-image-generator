# Gradient Image Generator

URL のクエリだけで、有機的なメッシュグラデ PNG を返す API です。

```bash
npm start
```

- Playground: [http://localhost:8787](http://localhost:8787)
- ドキュメント: [http://localhost:8787/docs](http://localhost:8787/docs)

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

- [ChatGPT / Claude / Gemini で開く](http://localhost:8787/docs#ai-links)
- [`/prompt.txt`](http://localhost:8787/prompt.txt)
- [`/llms.txt`](http://localhost:8787/llms.txt)
- [`/llms-full.txt`](http://localhost:8787/llms-full.txt)
- [`/openapi.json`](http://localhost:8787/openapi.json)
