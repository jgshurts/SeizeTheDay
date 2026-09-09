// Appends an alpha channel to a 6-digit hex color for a light tint (e.g.
// "#3b82f6" -> "#3b82f61a"). Safe because native <input type="color"> --
// the only source of these values -- always yields 6-digit hex. Only use
// this over a backdrop you control (e.g. the page's own white canvas) --
// against an arbitrary ancestor background (a themed banner) the tint
// blends with whatever's behind it instead of the color itself.
export function withAlpha(hex: string, alphaHex: string): string {
  return `${hex}${alphaHex}`;
}

// Mixes a hex color toward white by `percent` (0-100) -- used to derive a
// lighter tint of a user's theme color rather than hardcoding one.
export function lighten(hex: string, percent: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * (percent / 100));
  const toHex = (c: number) => c.toString(16).padStart(2, "0");
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

// Picks black or white text for readability against a solid hex background,
// via the standard perceptual-luminance threshold.
export function readableTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0f172a" : "#f8fafc";
}
