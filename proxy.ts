import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Domains that should render the dark "Very Inner Vibrations" theme by default.
const DARK_MODE_HOSTS = ["veryinnervibrations.com", "www.veryinnervibrations.com"];

const MODE_COOKIE = "site-mode";
const MODE_HEADER = "x-site-mode";

// If this project is deployed once per site (e.g. two separate Vercel projects,
// each with its own domain), set SITE_MODE=dark or SITE_MODE=light as an
// environment variable on that project. Useful before a custom domain is
// attached, since the temporary *.vercel.app URL won't match DARK_MODE_HOSTS.
const envMode = process.env.SITE_MODE === "dark" || process.env.SITE_MODE === "light"
  ? process.env.SITE_MODE
  : null;

// Mode is decided by domain only (never by prefers-color-scheme / OS theme).
// ?dark or ?light on any domain forces that mode and remembers it via cookie.
export function proxy(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const hostname = (request.headers.get("host") || "").split(":")[0];

  const forcedMode = searchParams.has("dark") ? "dark" : searchParams.has("light") ? "light" : null;

  // ?dark / ?light (e.g. from the theme toggle button) sets the cookie, then
  // redirects to the same URL without the query param so it doesn't linger.
  if (forcedMode) {
    const cleanUrl = new URL(request.nextUrl);
    cleanUrl.searchParams.delete("dark");
    cleanUrl.searchParams.delete("light");
    const response = NextResponse.redirect(cleanUrl);
    response.cookies.set(MODE_COOKIE, forcedMode, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }

  const cookieMode = request.cookies.get(MODE_COOKIE)?.value;
  const mode =
    (cookieMode === "dark" || cookieMode === "light" ? cookieMode : null) ??
    envMode ??
    (DARK_MODE_HOSTS.includes(hostname) ? "dark" : "light");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(MODE_HEADER, mode);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
