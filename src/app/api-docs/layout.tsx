import { NavBar } from "@/components/nest/navbar";

export default function APIDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NavBar />
      <div className="w-full">
        {children}
      </div>
    </>
  );
}
