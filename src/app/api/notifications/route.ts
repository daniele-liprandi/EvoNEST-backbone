import { Effect } from "effect";
import fs from "fs/promises";
import path from "path";
import { runRoute, ok, InternalError } from "@/lib/effect";

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: System notifications from the EvoNEST-news feed
 *     description: >
 *       Served from a 2.5-minute in-memory cache. On a fetch failure it falls
 *       back to the stale cache, then to public/notifications.json, and returns
 *       206 with a warning when it does.
 *     tags: [Utilities]
 *     responses:
 *       200: { description: Notifications }
 *       206: { description: Notifications from a fallback source }
 *       500: { description: Every source failed }
 */

const FEED_URL =
  "https://raw.githubusercontent.com/daniele-liprandi/EvoNEST-news/refs/heads/main/notifications.json";
const CACHE_MS = 2.5 * 60 * 1000;

let cache: { data: unknown; at: number } | null = null;

const fetchFeed = Effect.tryPromise({
  try: async () => {
    const response = await fetch(FEED_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`feed responded ${response.status}`);
    return (await response.json()) as unknown;
  },
  catch: (cause) => new InternalError({ message: "notifications feed fetch failed", cause }),
});

const localFallback = Effect.tryPromise({
  try: async () => {
    const file = path.join(process.cwd(), "public", "notifications.json");
    return JSON.parse(await fs.readFile(file, "utf8")) as unknown;
  },
  catch: (cause) => new InternalError({ message: "notifications local fallback failed", cause }),
});

export const getNotifications = Effect.gen(function* () {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return yield* ok(cache.data);
  }

  const fresh = yield* Effect.either(fetchFeed);
  if (fresh._tag === "Right") {
    cache = { data: fresh.right, at: Date.now() };
    return yield* ok(fresh.right);
  }

  if (cache) {
    return yield* ok(
      { notifications: cache.data, warning: "Using cached data, the feed is unreachable" },
      { status: 206 },
    );
  }

  const local = yield* localFallback;
  cache = { data: local, at: Date.now() };
  return yield* ok(
    { notifications: local, warning: "Using local fallback data, the feed is unreachable" },
    { status: 206 },
  );
});

export const GET = () => runRoute(getNotifications);
