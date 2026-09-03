import { runRoute } from "@/lib/effect";
import { exportExperiments } from "./handlers";

export const GET = (request: Request) => runRoute(exportExperiments(request));
