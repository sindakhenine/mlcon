import { NextResponse, type NextRequest } from "next/server";
import { roleOf } from "@/lib/gate";

/**
 * Every page goes through here. Owner (private code) or audience (code from the
 * slide, only while the site is open) get in; everyone else sees /locked.
 * The role is passed on to the app as a request header.
 */
export async function proxy(request: NextRequest) {
  const role = await roleOf(request.cookies);
  if (role) {
    const headers = new Headers(request.headers);
    headers.set("x-mlcon-role", role);
    return NextResponse.next({ request: { headers } });
  }

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
