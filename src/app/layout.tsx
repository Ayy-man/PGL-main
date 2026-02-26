import type { Metadata } from "next";
import { DM_Sans, Cormorant_Garamond, JetBrains_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "@/components/ui/toaster";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${cormorant.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <NuqsAdapter>
          {children}
        </NuqsAdapter>
        <Toaster />
      </body>
    </html>
  );
}
