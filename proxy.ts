import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Malak Haynes is always the light site, so its home page redirects straight
// to /movies. (Very Inner Vibrations is a fully separate deployment that
// redirects to /music instead — see its own proxy.ts.)
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/movies", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/",
};
