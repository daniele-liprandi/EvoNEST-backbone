import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EvoNEST — Design",
  description: "The EvoNEST component set and themes.",
};

export default function DesignLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground">{children}</div>;
}
