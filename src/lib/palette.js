// Keep decorative colors for tints and charts. Text on those tints needs its
// own contrast pair, which also works on the always-dark filters panel.
const tones = [
  { light: "#21466d", dark: "#a3ccff", accents: ["#0b2545", "#2f6690"] },
  { light: "#475569", dark: "#bdcbdd", accents: ["#475569", "#667085", "#94a3b8", "#9fa3ad", "#4a6080", "#7a8fa6"] },
  { light: "#785509", dark: "#f5d483", accents: ["#d4af37", "#c9a84c", "#b8942e", "#d4a600", "#e9c46a", "#f59e0b"] },
  { light: "#096461", dark: "#75e0d4", accents: ["#2aa6a0", "#14b8a6"] },
  { light: "#375e2e", dark: "#b5e2a5", accents: ["#22c55e", "#7e9a73"] },
  { light: "#4d43aa", dark: "#bec0ff", accents: ["#6366f1", "#6d6875"] },
  { light: "#6035a8", dark: "#d6b5ff", accents: ["#8b5cf6", "#7c3aed"] },
  { light: "#8c2d58", dark: "#ffb0d6", accents: ["#ec4899", "#f472b6", "#9b6a6c", "#b5838d"] },
  { light: "#943816", dark: "#ffbd9c", accents: ["#e56b3a", "#c9613a", "#f4a261"] },
  { light: "#a52622", dark: "#ffaaa5", accents: ["#ef4444", "#cc2200"] },
];

const textColors = Object.fromEntries(tones.flatMap(({ light, dark, accents }) =>
  accents.map(accent => [accent, `light-dark(${light}, ${dark})`])
));

export function paletteText(accent) {
  return textColors[accent?.toLowerCase()] ?? "var(--text-secondary)";
}
