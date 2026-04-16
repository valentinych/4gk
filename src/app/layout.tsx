import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "@/components/SessionProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CookieConsent } from "@/components/CookieConsent";
import { ToastProvider } from "@/components/Toaster";
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
      <head>
        {process.env.UMAMI_WEBSITE_ID && (
          <Script
            src={`${process.env.UMAMI_HOST || "https://analytics.4gk.pl"}/script.js`}
            data-website-id={process.env.UMAMI_WEBSITE_ID}
            strategy="afterInteractive"
          />
        )}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionProvider>
          <ToastProvider>
            <Header />
            <main className="min-h-screen">{children}</main>
            <Footer />
            <CookieConsent />
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
