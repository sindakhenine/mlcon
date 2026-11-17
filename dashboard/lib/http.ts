/** Small helpers for API routes. Server only. */
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, adminCookieIsValid } from "./gate";
import { VID_COOKIE, newVisitorId } from "./stats";

export const isAdmin = (req: NextRequest) => adminCookieIsValid(req.cookies.get(ADMIN_COOKIE)?.value);

/** Set by proxy.ts after it checked the cookies. Clients cannot fake it: the proxy overwrites it. */
export const roleHeader = (req: NextRequest) => req.headers.get("x-mlcon-role") as "owner" | "audience" | null;

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/** Visitor id: random, anonymous, used only for counting and one vote per person. */
export function visitorId(req: NextRequest): { vid: string; isNew: boolean } {
  const v = req.cookies.get(VID_COOKIE)?.value;
  return v ? { vid: v, isNew: false } : { vid: newVisitorId(), isNew: true };
}

export function withVid(res: NextResponse, vid: string, isNew: boolean) {
  if (isNew)
    res.cookies.set(VID_COOKIE, vid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  return res;
}
