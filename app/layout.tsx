import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Mzansi Games — South African daily word puzzles",
    template: "%s · Mzansi Games",
  },
  description:
    "Four daily South African word and puzzle games: Wordle, Connections, Mini Crossword, and Strands.",
  applicationName: "Mzansi Games",
  openGraph: {
    title: "Mzansi Games",
    description: "Daily South African word puzzles. Sharp sharp.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Mzansi Games",
    description: "Daily South African word puzzles.",
  },
};

export const viewport: Viewport = {
  themeColor: "#121213",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-[var(--game-green)] focus:px-3 focus:py-1 focus:text-white"
        >
          Skip to content
        </a>
        <Header />
        <main id="main-content" className="flex-1">{children}</main>
      </body>
    </html>
  );
}
