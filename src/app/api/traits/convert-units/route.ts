import { runRoute } from "@/lib/effect";
import { convertUnits } from "./handlers";

export const POST = (request: Request) => runRoute(convertUnits(request));
