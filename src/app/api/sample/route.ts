import { runRoute } from "@/lib/effect";
import { findSample } from "./handlers";

export const POST = (request: Request) => runRoute(findSample(request));
