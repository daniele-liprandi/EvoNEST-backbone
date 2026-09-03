import { runRoute } from "@/lib/effect";
import { geocodeLocation } from "./handlers";

export const POST = (request: Request) => runRoute(geocodeLocation(request));
