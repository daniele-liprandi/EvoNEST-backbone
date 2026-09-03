import { Effect } from "effect";
import { ok, currentUser, userCapabilities } from "@/lib/effect";

export const getUserRole = Effect.gen(function* () {
  const user = yield* currentUser;
  const role = user.role ?? null;
  return yield* ok({
    role,
    isAdmin: role === "admin",
    capabilities: yield* userCapabilities,
  });
});
