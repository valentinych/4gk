import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "@/components/SessionProvider";
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
    default: "4GK.pl — Интеллектуальные игры",
    template: "%s | 4GK.pl",
  },
  description:
    "Портал результатов интеллектуальных игр в Польше — чемпионаты, лиги и турниры.",
  keywords: ["quiz", "чгк", "что где когда", "4gk", "intellectual games", "Poland"],
  openGraph: {
    title: "4GK.pl — Интеллектуальные игры",
    description: "Результаты. Рейтинги. Турниры.",
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
        <SessionProvider>
          <Header />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  );
}
