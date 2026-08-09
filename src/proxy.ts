import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Hotlink guard for game art under /img — the images already ride Vercel's
 * edge cache (our built-in CDN); this keeps them usable by this site only.
 *
 * - Foreign Referer → 403: other sites can't embed our images and spend our
 *   bandwidth.
 * - Same-origin, missing, or unparsable Referer → allowed: browsers may
 *   legitimately omit or mangle it (privacy settings, Referrer-Policy), and
 *   blocking those would break our own users.
 * - `X-Robots-Tag: noimageindex` keeps the art out of image-search results,
 *   the main way strangers would find it to reuse.
 *
 * This is a deterrent, not access control — Referer headers are spoofable.
 */
export function proxy(request: NextRequest) {
  const referer = request.headers.get("referer");
  if (referer) {
    let refererHost: string | null = null;
    try {
      refererHost = new URL(referer).host;
    } catch {
      // unparsable referer — treat like a missing one
    }
    if (refererHost !== null && refererHost !== request.nextUrl.host) {
      return new NextResponse(null, { status: 403 });
    }
  }

  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noimageindex");
  return response;
}

export const config = { matcher: "/img/:path*" };
