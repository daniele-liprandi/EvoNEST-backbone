import { redirect } from "next/navigation";

// Moved under the Analysis menu.
export default function Moved() {
  redirect("/analysis/traits");
}
