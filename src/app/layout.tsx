import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
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
  title: {
    default: "4GK.pl — Портал онлайн-игр",
    template: "%s | 4GK.pl",
  },
  description:
    "Информационный портал с результатами и сервис для онлайн-игр. Играй, соревнуйся, побеждай!",
  keywords: ["games", "online games", "quiz", "leaderboard", "4gk", "portal"],
  openGraph: {
    title: "4GK.pl — Портал онлайн-игр",
    description: "Играй, соревнуйся, побеждай!",
    url: "https://4gk.pl",
    siteName: "4GK.pl",
    locale: "pl_PL",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
