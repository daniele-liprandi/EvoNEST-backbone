import { NavBar } from "@/components/nest/navbar";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <>
      <NavBar />
      {children}
    </>
  );
}
