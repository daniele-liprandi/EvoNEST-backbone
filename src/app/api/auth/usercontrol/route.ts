import { runRoute } from "@/lib/effect";
import { getUserControl } from "./handlers";

export const GET = () => runRoute(getUserControl);
