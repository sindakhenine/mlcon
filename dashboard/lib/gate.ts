/**
 * Who may see the site. Server only (proxy.ts and API routes).
 *
 * Three keys:
 * - Owner: SITE_ACCESS_CODE (Vercel secret, only Sinda knows it). Opens everything, always.
 * - Audience: the code set on the admin page. Works only while "Site open" is on.
 *   Changing the code, or closing the site, locks every audience browser again.
 * - Admin: ADMIN_PASSWORD (Vercel secret). Needed for /admin and its API.
 *
 * Production without SITE_ACCESS_CODE is locked for everyone (fail closed).
 * Local development without it is open, so building is easy.
 *
 * Cookies hold an HMAC keyed with a secret, never the code itself.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { getConfig } from "./store";

export const GATE_COOKIE = "site_pass";
export const AUD_COOKIE = "aud_pass";
export const ADMIN_COOKIE = "admin_pass";
export const GATE_MAX_AGE = 60 * 60 * 24 * 30; // owner: 30 days
export const AUD_MAX_AGE = 60 * 60 * 24 * 7; // audience: 7 days
export const ADMIN_MAX_AGE = 60 * 60 * 12; // admin: 12 hours

const dev = () => process.env.NODE_ENV === "development";

function code(): string | undefined {
  const c = process.env.SITE_ACCESS_CODE?.trim();
  return c ? c : undefined;
}

function adminPassword(): string | undefined {
  const c = process.env.ADMIN_PASSWORD?.trim();
  return c ? c : undefined;
}

export function gateConfigured(): boolean {
  return Boolean(code());
}

/** Open without a code only in local development with no code configured. */
export function gateDisabled(): boolean {
  return !code() && dev();
}

const hmac = (key: string, msg: string) => createHmac("sha256", key).update(msg).digest("hex");

export function same(a: string, b: string): boolean {
  // Hash first so both sides have the same length; then compare in constant time.
  const ha = createHmac("sha256", "cmp").update(a).digest();
  const hb = createHmac("sha256", "cmp").update(b).digest();
  return timingSafeEqual(ha, hb);
}

// ---------------------------------------------------------------- owner
export function passToken(): string | null {
  const c = code();
  return c ? hmac(c, "mlcon-site-pass-v1") : null;
}

export function codeIsRight(entered: string): boolean {
  const c = code();
  return Boolean(c) && same(entered.trim(), c!);
}

export function cookieIsValid(value: string | undefined): boolean {
  const t = passToken();
  return Boolean(t && value) && same(value!, t!);
}

// ---------------------------------------------------------------- audience
function audKey(): string {
  // Keyed with the owner code; in local development a fixed key is fine.
  return code() ?? "dev-only-audience-key";
}

export function audienceToken(audienceCode: string): string {
  return hmac(audKey(), `mlcon-aud-v1:${audienceCode.trim().toLowerCase()}`);
}

/** Audience codes are not case sensitive (people type them from a slide). */
export async function audienceCodeIsRight(entered: string): Promise<boolean> {
  const cfg = await getConfig(true);
  if (!cfg.siteOpen || !cfg.audienceCode.trim()) return false;
  return same(entered.trim().toLowerCase(), cfg.audienceCode.trim().toLowerCase());
}

export async function audienceCookieIsValid(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const cfg = await getConfig();
  if (!cfg.siteOpen || !cfg.audienceCode.trim()) return false;
  return same(value, audienceToken(cfg.audienceCode));
}

// ---------------------------------------------------------------- admin
export function adminConfigured(): boolean {
  return Boolean(adminPassword());
}

export function adminToken(): string | null {
  const p = adminPassword();
  return p ? hmac(p, "mlcon-admin-v1") : dev() ? "dev-admin" : null;
}

export function adminPasswordIsRight(entered: string): boolean {
  const p = adminPassword();
  if (!p) return dev() && entered === "dev";
  return same(entered, p);
}

export function adminCookieIsValid(value: string | undefined): boolean {
  const t = adminToken();
  return Boolean(t && value) && same(value!, t!);
}

// ---------------------------------------------------------------- roles
export type Role = "owner" | "audience";

/** Reads the cookies of a request and returns who this is, or null if locked. */
export async function roleOf(cookies: { get(name: string): { value: string } | undefined }): Promise<Role | null> {
  if (gateDisabled()) return "owner";
  if (cookieIsValid(cookies.get(GATE_COOKIE)?.value)) return "owner";
  if (await audienceCookieIsValid(cookies.get(AUD_COOKIE)?.value)) return "audience";
  return null;
}

/** Only allow redirects to paths on this site. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
