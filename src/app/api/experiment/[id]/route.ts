import { runRoute } from "@/lib/effect";
import { getExperiment } from "./handlers";

export const GET = (request: Request) => runRoute(getExperiment(request));
