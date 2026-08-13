import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Hotlink guard for game art under /img — the images ride the platform's edge
 * cache; this keeps them usable by this site only.
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

function hostOf(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value.includes("://") ? value : `https://${value}`).host;
  } catch {
    return null;
  }
}

/**
 * Every host that counts as "us". Behind a reverse proxy the request URL
 * carries the container's own address (on Railway, localhost:8080), so the
 * public domain has to come from the forwarded headers or the environment —
 * without it the guard would 403 our own pages' images.
 */
function selfHosts(request: NextRequest): Set<string> {
  const candidates = [
    request.nextUrl.host,
    request.headers.get("x-forwarded-host"),
    request.headers.get("host"),
    process.env.AUTH_URL,
    process.env.RAILWAY_PUBLIC_DOMAIN,
    process.env.NEXT_PUBLIC_SITE_URL,
  ];
  const hosts = new Set<string>();
  for (const candidate of candidates) {
    const host = hostOf(candidate);
    if (host) hosts.add(host);
  }
  return hosts;
}

export function proxy(request: NextRequest) {
  const refererHost = hostOf(request.headers.get("referer"));
  if (refererHost !== null && !selfHosts(request).has(refererHost)) {
    return new NextResponse(null, { status: 403 });
  }

  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noimageindex");
  return response;
}

export const config = { matcher: "/img/:path*" };
