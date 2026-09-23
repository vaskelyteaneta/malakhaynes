import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Malak Haynes is always the light site, so its home page redirects straight
// to the films page. (Very Inner Vibrations is a fully separate deployment
// that redirects to /music instead — see its own proxy.ts.)
//
// This target must match the films page's uid in Prismic. It was /movies
// until that document was renamed to "films"; the old URL kept working only
// because a stale prerender was still cached, and would have 404'd once that
// cleared. If the page is renamed again, change it here too.
const HOME = "/films";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /movies was the de-facto home URL before the rename, so it's in browser
  // histories and any links shared up to now — send it on rather than 404.
  if (pathname === "/" || pathname === "/movies") {
    return NextResponse.redirect(new URL(HOME, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/movies"],
};
