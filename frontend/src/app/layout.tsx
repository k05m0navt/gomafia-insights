import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GoMafia Analytics - Professional Mafia Game Statistics",
  description: "Comprehensive analytics platform for competitive Mafia game performance tracking, tournament statistics, and player insights from GoMafia.pro",
  keywords: "mafia game, analytics, statistics, gomafia, tournament, player tracking, competitive gaming",
  authors: [{ name: "GoMafia Analytics Team" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-900 text-slate-100 min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
