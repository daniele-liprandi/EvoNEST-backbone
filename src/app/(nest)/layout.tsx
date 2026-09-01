import { NavBar } from "@/components/nest/navbar";
import { FirstRunGate } from "@/components/first-run-gate";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <FirstRunGate>
      <NavBar />
      {children}
    </FirstRunGate>
  );
}
