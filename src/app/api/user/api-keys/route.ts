import { runRoute } from "@/lib/effect";
import { listApiKeys, createApiKey, revokeApiKey } from "./handlers";

export const GET = () => runRoute(listApiKeys);
export const POST = (request: Request) => runRoute(createApiKey(request));
export const DELETE = (request: Request) => runRoute(revokeApiKey(request));
