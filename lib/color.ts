import type { CSSProperties } from "react";

export function lightenColor(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const to2 = (n: number) => mix(n).toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

export function colorGradient(hex: string, from = 0.12, to = 0.32): string {
  const top = lightenColor(hex, from);
  const bottom = lightenColor(hex, to);
  return `linear-gradient(135deg, ${top}, ${bottom})`;
}

export function gradientTextStyle(hex: string): CSSProperties {
  return {
    // Subtle sheen only — start at the true color, lift slightly, so text
    // stays saturated and never fades toward white.
    background: colorGradient(hex, 0, 0.16),
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  };
}
