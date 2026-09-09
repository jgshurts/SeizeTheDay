// Appends an alpha channel to a 6-digit hex color for a light tint (e.g.
// "#3b82f6" -> "#3b82f61a"). Safe because native <input type="color"> --
// the only source of these values -- always yields 6-digit hex. Only use
// this over a backdrop you control (e.g. the page's own white canvas) --
// against an arbitrary ancestor background (a themed banner) the tint
// blends with whatever's behind it instead of the color itself.
export function withAlpha(hex: string, alphaHex: string): string {
  return `${hex}${alphaHex}`;
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
