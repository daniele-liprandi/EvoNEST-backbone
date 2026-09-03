import { runRoute } from "@/lib/effect";
import { previewConversion } from "./handlers";

export const POST = (request: Request) => runRoute(previewConversion(request));
