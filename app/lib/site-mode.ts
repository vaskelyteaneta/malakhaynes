export type SiteMode = "light" | "dark";

// Malak Haynes is always the light site — a fully separate deployment from
// Very Inner Vibrations (which is always dark; see its own site-mode.ts).
export async function getSiteMode(): Promise<SiteMode> {
  return "light";
}
