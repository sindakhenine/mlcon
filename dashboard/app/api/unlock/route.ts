import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, GATE_MAX_AGE, codeIsRight, passToken, safeNext } from "@/lib/gate";

/** The lock page form posts here. Right code: set the pass cookie. Wrong code: back to the form. */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const entered = String(form.get("code") ?? "").slice(0, 200);
  const next = safeNext(String(form.get("next") ?? "/"));

  if (!codeIsRight(entered)) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    const back = new URL("/locked", request.url);
    back.searchParams.set("next", next);
    back.searchParams.set("error", "1");
    return NextResponse.redirect(back, 303);
  }

  const res = NextResponse.redirect(new URL(next, request.url), 303);
  res.cookies.set(GATE_COOKIE, passToken()!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GATE_MAX_AGE,
  });
  return res;
}

/** Lock this browser again: /api/unlock with DELETE, or the "Lock" link (GET ?lock=1). */
export async function GET(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/locked", request.url), 303);
  if (request.nextUrl.searchParams.get("lock") === "1") res.cookies.delete(GATE_COOKIE);
  return res;
}
