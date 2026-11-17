/** Counters for the admin and stage pages. Server only. Every write is best effort. */
import { randomUUID } from "node:crypto";
import { store } from "./store";
import { POLLS, pollById } from "./polls";
import { S1_MISSIONS } from "./s1/lab";
import { S2_MISSIONS } from "./s2/lab";

const DAY = 60 * 60 * 24;
const MISSION_IDS = new Set([...S1_MISSIONS, ...S2_MISSIONS].map((m) => m.id));

export const VID_COOKIE = "vid";
export const newVisitorId = () => randomUUID();
const validVid = (v: string | undefined) => Boolean(v && /^[0-9a-f-]{36}$/.test(v));

/** At most `max` writes per visitor per minute. */
async function allowed(vid: string, max = 60): Promise<boolean> {
  const s = store();
  if (!s) return false;
  const n = await s.incr(`rl:${vid}:${Math.floor(Date.now() / 60000)}`, 1, 120);
  return n <= max;
}

export async function seen(vid: string | undefined) {
  const s = store();
  if (!s || !validVid(vid)) return;
  await s.zseen("seen", vid!, Date.now(), 5 * 60 * 1000);
}

export async function trackMission(vid: string | undefined, id: string) {
  const s = store();
  if (!s || !validVid(vid) || !MISSION_IDS.has(id) || !(await allowed(vid!))) return;
  // count each visitor once per mission
  if (await s.sadd(`solved:${id}`, vid!, 30 * DAY)) await s.hincr("missions", id);
}

export async function trackAttack(vid: string | undefined, ticket: string, paid: number, allOn: boolean) {
  const s = store();
  if (!s || !validVid(vid) || !(await allowed(vid!, 20))) return;
  await s.hincr("red", "attempts");
  if (allOn) {
    await s.hincr("red", "allOn");
    if (paid === 0) await s.hincr("red", "blocked");
  }
  if (paid > 0) await s.hincr("red", "paidRuns");
  await s.lpush(
    "attacks",
    JSON.stringify({ t: Date.now(), ticket: ticket.slice(0, 400), paid, allOn }),
    50,
    7 * DAY,
  );
}

export async function vote(vid: string | undefined, pollId: string, option: string): Promise<boolean> {
  const s = store();
  const poll = pollById(pollId);
  if (!s || !validVid(vid) || !poll || !poll.options.some((o) => o.id === option)) return false;
  if (!(await allowed(vid!))) return false;
  if (!(await s.sadd(`voted:${pollId}`, vid!, 7 * DAY))) return false; // one vote per visitor
  await s.hincr(`poll:${pollId}`, option);
  return true;
}

export interface Stats {
  visitorsNow: number;
  missions: Record<string, number>;
  red: { attempts: number; allOn: number; blocked: number; paidRuns: number };
  polls: Record<string, Record<string, number>>;
}

export async function readStats(): Promise<Stats> {
  const s = store();
  const empty: Stats = { visitorsNow: 0, missions: {}, red: { attempts: 0, allOn: 0, blocked: 0, paidRuns: 0 }, polls: {} };
  if (!s) return empty;
  const [visitorsNow, missions, red, ...polls] = await Promise.all([
    s.zcount("seen", Date.now(), 5 * 60 * 1000),
    s.hgetall("missions"),
    s.hgetall("red"),
    ...POLLS.map((p) => s.hgetall(`poll:${p.id}`)),
  ]);
  return {
    visitorsNow,
    missions,
    red: { attempts: red.attempts ?? 0, allOn: red.allOn ?? 0, blocked: red.blocked ?? 0, paidRuns: red.paidRuns ?? 0 },
    polls: Object.fromEntries(POLLS.map((p, i) => [p.id, polls[i]])),
  };
}

export async function readAttacks(): Promise<{ t: number; ticket: string; paid: number; allOn: boolean }[]> {
  const s = store();
  if (!s) return [];
  return (await s.lrange("attacks", 50)).flatMap((x) => {
    try {
      return [JSON.parse(x)];
    } catch {
      return [];
    }
  });
}

/** Admin "reset counters": clears counts, votes and the attack log. Keeps the switches. */
export async function resetStats() {
  const s = store();
  if (!s) return;
  await s.del([
    "seen",
    "missions",
    "red",
    "attacks",
    ...POLLS.flatMap((p) => [`poll:${p.id}`, `voted:${p.id}`]),
    ...[...MISSION_IDS].map((id) => `solved:${id}`),
  ]);
}
