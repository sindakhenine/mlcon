import { NextResponse, type NextRequest } from "next/server";
import {
  AUD_COOKIE,
  AUD_MAX_AGE,
  GATE_COOKIE,
  GATE_MAX_AGE,
  audienceCodeIsRight,
  audienceToken,
  codeIsRight,
  passToken,
  safeNext,
} from "@/lib/gate";
import { getConfig } from "@/lib/store";

const secure = () => process.env.NODE_ENV === "production";

/** The lock page form posts here. Owner code or (while open) the audience code sets a pass cookie. */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const entered = String(form.get("code") ?? "").slice(0, 200);
  const next = safeNext(String(form.get("next") ?? "/"));

  if (codeIsRight(entered)) {
    const res = NextResponse.redirect(new URL(next, request.url), 303);
    res.cookies.set(GATE_COOKIE, passToken()!, { httpOnly: true, secure: secure(), sameSite: "lax", path: "/", maxAge: GATE_MAX_AGE });
    return res;
  }

  if (await audienceCodeIsRight(entered)) {
    const cfg = await getConfig();
    const res = NextResponse.redirect(new URL(next, request.url), 303);
    res.cookies.set(AUD_COOKIE, audienceToken(cfg.audienceCode), {
      httpOnly: true,
      secure: secure(),
      sameSite: "lax",
      path: "/",
      maxAge: AUD_MAX_AGE,
    });
    return res;
  }

  await new Promise((r) => setTimeout(r, 800)); // slow down guessing
  const back = new URL("/locked", request.url);
  back.searchParams.set("next", next);
  back.searchParams.set("error", "1");
  return NextResponse.redirect(back, 303);
}

/** /api/unlock?lock=1 locks this browser again. */
export async function GET(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/locked", request.url), 303);
  if (request.nextUrl.searchParams.get("lock") === "1") {
    res.cookies.delete(GATE_COOKIE);
    res.cookies.delete(AUD_COOKIE);
  }
  return res;
}
