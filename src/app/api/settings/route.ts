import { runRoute } from "@/lib/effect";
import { getSettings, updateSettings } from "./handlers";

export const GET = () => runRoute(getSettings);
export const POST = (request: Request) => runRoute(updateSettings(request));
