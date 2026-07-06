import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const circularStd = localFont({
  src: [
    { path: "./fonts/CircularStd-Book.otf", weight: "400", style: "normal" },
    { path: "./fonts/CircularStd-Medium.otf", weight: "500", style: "normal" },
  ],
  variable: "--font-circular",
});

export const metadata: Metadata = {
  title: "Brkaway – Portfolio Generator",
  description: "Generá portfolios de creators a partir de información pública",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${circularStd.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
