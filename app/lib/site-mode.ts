import { headers } from "next/headers";

export type SiteMode = "light" | "dark";

// Reads the mode proxy.ts decided for this request (by domain, or ?dark/?light override).
export async function getSiteMode(): Promise<SiteMode> {
  const headersList = await headers();
  return headersList.get("x-site-mode") === "dark" ? "dark" : "light";
}
