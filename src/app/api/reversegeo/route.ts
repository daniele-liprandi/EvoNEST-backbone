import { runRoute } from "@/lib/effect";
import { reverseGeocode } from "./handlers";

export const POST = (request: Request) => runRoute(reverseGeocode(request));
