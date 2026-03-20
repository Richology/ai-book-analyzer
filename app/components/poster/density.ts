import type { PosterContent } from "./types";

/**
 * Compute total character count of poster content
 * to determine density scaling factors.
 */
function contentLength(content: PosterContent): number {
  let len = 0;
  len += (content.hook || "").length;
  len += (content.summary || "").length;
  len += (content.highlight || "").length;
  for (const s of content.insights) len += s.length;
  for (const s of content.actions) len += s.length;
  return len;
}

/** Density scaling factors applied to poster layout */
export type DensityScale = {
  /** Font size multiplier (e.g. 1.08 = +8%) */
  fontSize: number;
  /** Line height multiplier */
  lineHeight: number;
  /** Section spacing multiplier */
  spacing: number;
};

/**
 * Compute density scaling based on content length.
 *
 * Short content (< 300 chars) → expand to fill space
 * Normal content (300-500)    → baseline
 * Long content (> 500 chars)  → compress slightly
 */
export function computeDensity(content: PosterContent): DensityScale {
  const len = contentLength(content);

  if (len < 250) {
    // Very short — expand aggressively
    return { fontSize: 1.12, lineHeight: 1.12, spacing: 1.15 };
  }
  if (len < 350) {
    // Short — expand moderately
    return { fontSize: 1.06, lineHeight: 1.08, spacing: 1.08 };
  }
  if (len <= 550) {
    // Normal — baseline
    return { fontSize: 1.0, lineHeight: 1.0, spacing: 1.0 };
  }
  if (len <= 700) {
    // Long — compress slightly
    return { fontSize: 0.95, lineHeight: 0.96, spacing: 0.94 };
  }
  // Very long — compress more
  return { fontSize: 0.92, lineHeight: 0.93, spacing: 0.9 };
}

/** Helper: apply density to a base font size */
export function df(base: number, d: DensityScale): number {
  return Math.round(base * d.fontSize * 10) / 10;
}

/** Helper: apply density to a base line-height ratio */
export function dl(base: number, d: DensityScale): number {
  return Math.round(base * d.lineHeight * 100) / 100;
}

/** Helper: apply density to a base spacing value */
export function ds(base: number, d: DensityScale): number {
  return Math.round(base * d.spacing);
}
