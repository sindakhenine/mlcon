import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, cookieIsValid, gateDisabled } from "@/lib/gate";

/** Every page goes through here. Without the pass cookie, visitors only see /locked. */
export function proxy(request: NextRequest) {
  if (gateDisabled()) return NextResponse.next();
  if (cookieIsValid(request.cookies.get(GATE_COOKIE)?.value)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "locked" }, { status: 401, headers: { "X-Robots-Tag": "noindex" } });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/locked";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  const res = NextResponse.redirect(url, 307);
  res.headers.set("X-Robots-Tag", "noindex");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = {
  // Everything except the lock page itself, the unlock endpoint and static build files.
  matcher: ["/((?!locked|api/unlock|_next/static|_next/image|favicon.ico).*)"],
};
