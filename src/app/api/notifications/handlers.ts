import { Effect } from "effect";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { ok, InternalError } from "@/lib/effect";

const FEED_URL_DEFAULT =
  "https://raw.githubusercontent.com/daniele-liprandi/EvoNEST-news/refs/heads/main/notifications.json";
const CACHE_MS = 2.5 * 60 * 1000;

// Sent on every response so the browser (and any CDN in front of this route)
// also caches the result, instead of every open tab's poll reaching the handler.
const CACHE_CONTROL = `public, max-age=${Math.round(CACHE_MS / 1000)}, stale-while-revalidate=3600`;
const HEADERS = { "Cache-Control": CACHE_CONTROL };

// App version, read once from package.json, for the minVersion/maxVersion gate.
// `undefined` = not read yet, `null` = read failed.
let appVersion: string | null | undefined;
const getAppVersion = (): string | null => {
  if (appVersion === undefined) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
      appVersion = pkg.version || null;
    } catch {
      appVersion = null;
    }
  }
  return appVersion ?? null;
};

const parseVersion = (v: unknown): [number, number, number] => {
  const parts = String(v ?? "")
    .split(".")
    .map((p) => parseInt(p, 10) || 0);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
};

const compareVersions = (a: unknown, b: unknown) => {
  const [a1, a2, a3] = parseVersion(a);
  const [b1, b2, b3] = parseVersion(b);
  return a1 - b1 || a2 - b2 || a3 - b3;
};

const slugify = (text: unknown) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

// The feed originally used { name, description, icon, color, time } with a
// homegrown "yymmdd-hh:mm" timestamp. Both shapes are accepted here so the feed
// repo can move to the current one on its own schedule.
const legacyTimeToIso = (time: unknown): string | null => {
  const match = /^(\d{2})(\d{2})(\d{2})-(\d{2}):(\d{2})$/.exec(String(time ?? ""));
  if (!match) return null;
  const [, yy, mm, dd, hh, min] = match;
  const date = new Date(Date.UTC(2000 + Number(yy), Number(mm) - 1, Number(dd), Number(hh), Number(min)));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

type RawNotification = Record<string, unknown>;

const normalizeNotification = (raw: RawNotification, index: number) => {
  const title = raw.title || raw.name || "Update";
  const date = raw.date || legacyTimeToIso(raw.time) || new Date(0).toISOString();
  return {
    id: raw.id || `${slugify(title)}-${slugify(date)}` || `notification-${index}`,
    date,
    title,
    body: raw.body || raw.description || "",
    level: raw.level || "info",
    link: raw.link || null,
    icon: raw.icon || null,
    color: raw.color || null,
  };
};

// A notification can name the app version range it applies to, so an older
// deployment isn't told about a feature it doesn't have. No range = always shown.
const isVisibleForVersion = (raw: RawNotification) => {
  const version = getAppVersion();
  if (!version) return true;
  if (raw.minVersion && compareVersions(version, raw.minVersion) < 0) return false;
  if (raw.maxVersion && compareVersions(version, raw.maxVersion) > 0) return false;
  return true;
};

const prepareNotifications = (rawList: unknown) =>
  (Array.isArray(rawList) ? rawList : []).filter(isVisibleForVersion).map(normalizeNotification);

let cache: { data: unknown; at: number } | null = null;

const fetchFeed = Effect.tryPromise({
  try: async () => {
    const url = process.env.NOTIFICATIONS_URL || FEED_URL_DEFAULT;
    // Next's fetch cache, shared across instances, backs up the per-instance
    // in-memory cache above (lost on every cold start).
    const response = await fetch(url, { next: { revalidate: Math.round(CACHE_MS / 1000) } });
    if (!response.ok) throw new Error(`feed responded ${response.status}`);
    return (await response.json()) as unknown;
  },
  catch: (cause) => new InternalError({ message: "notifications feed fetch failed", cause }),
});

const localFallback = Effect.tryPromise({
  try: async () => {
    const file = path.join(process.cwd(), "public", "notifications.json");
    return JSON.parse(await fsp.readFile(file, "utf8")) as unknown;
  },
  catch: (cause) => new InternalError({ message: "notifications local fallback failed", cause }),
});

export const getNotifications = Effect.gen(function* () {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return yield* ok(prepareNotifications(cache.data), { headers: HEADERS });
  }

  const fresh = yield* Effect.either(fetchFeed);
  if (fresh._tag === "Right") {
    cache = { data: fresh.right, at: Date.now() };
    return yield* ok(prepareNotifications(fresh.right), { headers: HEADERS });
  }

  if (cache) {
    return yield* ok(
      { notifications: prepareNotifications(cache.data), warning: "Using cached data, the feed is unreachable" },
      { status: 206, headers: HEADERS },
    );
  }

  const local = yield* localFallback;
  cache = { data: local, at: Date.now() };
  return yield* ok(
    { notifications: prepareNotifications(local), warning: "Using local fallback data, the feed is unreachable" },
    { status: 206, headers: HEADERS },
  );
});
