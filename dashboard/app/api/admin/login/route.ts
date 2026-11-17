import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, ADMIN_MAX_AGE, adminPasswordIsRight, adminToken } from "@/lib/gate";

/** Admin login form posts here. */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const entered = String(form.get("password") ?? "").slice(0, 200);
  if (!adminPasswordIsRight(entered)) {
    await new Promise((r) => setTimeout(r, 1000));
    return NextResponse.redirect(new URL("/admin?error=1", request.url), 303);
  }
  const res = NextResponse.redirect(new URL("/admin", request.url), 303);
  res.cookies.set(ADMIN_COOKIE, adminToken()!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_MAX_AGE,
  });
  return res;
}

/** Log out of admin. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
