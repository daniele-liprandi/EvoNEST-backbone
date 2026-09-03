import { runRoute } from "@/lib/effect";
import { searchGbifImage } from "./handlers";

export const GET = (request: Request) => runRoute(searchGbifImage(request));
