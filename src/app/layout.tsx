import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/themeprovider";
import { Toaster } from "@/components/ui/sonner"
import { Providers } from "./providers";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/ui/custom/footer";
import SWRProvider from "./providers/swr-provider";

const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-atkinson",
  // Next has no capsize metrics for this face yet, so skip the auto-generated
  // size-adjust fallback and name a plain stack instead.
  adjustFontFallback: false,
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

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
      <body className={cn("min-h-screen bg-background flex flex-col", atkinson.variable)}>
        <Providers>
          <ThemeProvider
            attribute="data-theme"
            defaultTheme="evonest"
            themes={["evonest", "sepia", "edge", "dark"]}
            enableSystem={false}
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
        </Providers>
      </body>
    </html>
  );
}
