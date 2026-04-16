import type { Metadata, Viewport } from "next";
import { DM_Sans, Cormorant_Garamond, JetBrains_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionGuard } from "@/components/auth/session-guard";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PGL Luxury Buyer Finder",
  description: "Wealth intelligence platform for UHNWI real estate prospecting",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${cormorant.variable} ${jetbrainsMono.variable} font-sans antialiased text-foreground`}
        style={{ backgroundColor: "var(--bg-root)" }}
      >
        <div className="noise-overlay" aria-hidden="true" />
        <NuqsAdapter>
          <SessionGuard />
          <TooltipProvider delayDuration={250} skipDelayDuration={500}>
            {children}
          </TooltipProvider>
        </NuqsAdapter>
        <Toaster />
      </body>
    </html>
  );
}
