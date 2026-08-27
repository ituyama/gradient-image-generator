export type BrandPreset = { seed: string; colors: string };

export const BRAND_PRESETS: BrandPreset[] = [
  { seed: "mint", colors: "2EE59D,4FC3F7,00ACC1,80DEEA" },
  { seed: "aurora", colors: "2EE59D,4FC3F7,00ACC1,80DEEA" },
  { seed: "sunset", colors: "FF6B6B,FFD93D,FF8C42,C44569" },
  { seed: "twilight", colors: "7C5CFF,49C6E5,F472B6,1E1B4B" },
  { seed: "peach", colors: "FFB4A2,E5989B,FFCDB2,B5838D" },
  { seed: "ocean", colors: "0EA5E9,0369A1,22D3EE,082F49" },
  { seed: "forest", colors: "14532D,4ADE80,166534,A3E635" },
  { seed: "ember", colors: "7C2D12,F97316,FBBF24,1C1917" },
  { seed: "sakura", colors: "FBCFE8,F472B6,9F1239,FFE4E6" },
  { seed: "lemon", colors: "FDE68A,F59E0B,84CC16,14532D" },
];

export function pickBrandPreset(): BrandPreset {
  return BRAND_PRESETS[(Math.random() * BRAND_PRESETS.length) | 0];
}

export function brandGradientPath(width: number, height: number, preset = pickBrandPreset()): string {
  return `/gradient?w=${width}&h=${height}&seed=${preset.seed}&colors=${preset.colors}`;
}

export function presetsBrowserScript(): string {
  return (
    `window.GIG_PRESETS=${JSON.stringify(BRAND_PRESETS)};` +
    `window.gigPick=function(){return GIG_PRESETS[Math.random()*GIG_PRESETS.length|0]};` +
    `window.gigPath=function(w,h,p){p=p||gigPick();return"/gradient?w="+w+"&h="+h+"&seed="+p.seed+"&colors="+p.colors};`
  );
}
