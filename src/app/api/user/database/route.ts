import { runRoute } from "@/lib/effect";
import { getUserDatabases, setActiveDatabase } from "./handlers";

export const GET = () => runRoute(getUserDatabases);
export const POST = (request: Request) => runRoute(setActiveDatabase(request));
