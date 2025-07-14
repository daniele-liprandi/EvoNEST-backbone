import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/themeprovider";
import { Toaster } from "@/components/ui/sonner"
import { NavBar } from "@/components/nest/navbar";
import { Providers } from "./providers";
import { Fira_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/ui/custom/footer";
import SWRProvider from "./providers/swr-provider";

const inter = Inter({ subsets: ["latin"] });

const fira_sans = Fira_Sans({
  weight: "400",
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fira_sans',
})

export const metadata: Metadata = {
  title: "EvoNEST",
  description: "The Evolutionary Nexus",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <Providers>
        <body className={cn(
          "min-h-screen bg-background flex flex-col",
          fira_sans.variable)
        }>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <SWRProvider>
              <Toaster richColors />
              <div className="flex-grow">
                {children}
              </div>
              <Footer />
            </SWRProvider>
          </ThemeProvider>
        </body>
      </Providers>
    </html>
  );
}
