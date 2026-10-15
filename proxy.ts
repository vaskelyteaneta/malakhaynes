import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Only the legacy redirect lives here now. Which page the site root shows is
// resolved from Settings > Home page in app/page.tsx — not in middleware,
// which would have to query Prismic on every single request to "/".
export function proxy(request: NextRequest) {
  // /movies was the de-facto home URL before the films page was renamed, so
  // it's in browser histories and in any links shared up to now — send it on
  // rather than 404.
  if (request.nextUrl.pathname === "/movies") {
    return NextResponse.redirect(new URL("/films", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/movies"],
};
