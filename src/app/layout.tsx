import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ThemeProvider } from "@/components/Theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WebtoonTL - Webtoon Translation Service",
  description: "Translate your webtoons and comics while preserving artwork",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:wght@400;700&family=Luckiest+Guy&family=Nunito:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${geistSans.variable} antialiased min-h-screen flex flex-col`}
        suppressHydrationWarning
      >
        <ThemeProvider>
        <Header />
        <Navbar />
        <main className="container mx-auto px-4 py-8 flex-grow">
          {children}
        </main>
        <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}