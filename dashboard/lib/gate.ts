/**
 * Site lock. The whole site is closed unless the visitor has entered the private
 * code (environment variable SITE_ACCESS_CODE, set only in Vercel, never in git).
 *
 * - Production without SITE_ACCESS_CODE: locked for everyone (fail closed).
 * - Local development without it: open, so building is easy.
 * - The cookie holds an HMAC of a fixed text, keyed with the code. It proves the
 *   code was entered without storing the code itself. Changing the code in Vercel
 *   logs everyone out.
 *
 * Server only (used by proxy.ts and the unlock route).
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const GATE_COOKIE = "site_pass";
export const GATE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function code(): string | undefined {
  const c = process.env.SITE_ACCESS_CODE?.trim();
  return c ? c : undefined;
}

export function gateConfigured(): boolean {
  return Boolean(code());
}

/** Open without a code only in local development with no code configured. */
export function gateDisabled(): boolean {
  return !code() && process.env.NODE_ENV === "development";
}

export function passToken(): string | null {
  const c = code();
  return c ? createHmac("sha256", c).update("mlcon-site-pass-v1").digest("hex") : null;
}

function same(a: string, b: string): boolean {
  // Hash first so both sides have the same length; then compare in constant time.
  const ha = createHmac("sha256", "cmp").update(a).digest();
  const hb = createHmac("sha256", "cmp").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function codeIsRight(entered: string): boolean {
  const c = code();
  return Boolean(c) && same(entered.trim(), c!);
}

export function cookieIsValid(value: string | undefined): boolean {
  const t = passToken();
  return Boolean(t && value) && same(value!, t!);
}

/** Only allow redirects to paths on this site. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
