import { Effect } from "effect";
import { InternalError } from "@/lib/effect";

const TIMEOUT_MS = 8_000;
const MIN_INTERVAL_MS = 1_000;

// Nominatim's usage policy is one request per second, shared across this process.
let lastRequestAt = 0;

const throttle = Effect.promise(async () => {
  const wait = MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();
});

/** Call a Nominatim endpoint (`path` is the part after the host, e.g. `search?q=Rome&format=json`). */
export const nominatim = (path: string) =>
  Effect.gen(function* () {
    yield* throttle;
    return yield* Effect.tryPromise({
      try: async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/${path}`, {
            signal: controller.signal,
            headers: { "User-Agent": "EvoNEST-backbone/1.0 (research platform)" },
          });
          return (await response.json()) as unknown;
        } finally {
          clearTimeout(timer);
        }
      },
      catch: (cause) => new InternalError({ message: "Nominatim request failed", cause }),
    });
  });
