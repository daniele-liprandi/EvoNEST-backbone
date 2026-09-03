import { runRoute } from "@/lib/effect";
import { getUser, updateUser } from "./handlers";

export const GET = () => runRoute(getUser);
export const POST = (request: Request) => runRoute(updateUser(request));
