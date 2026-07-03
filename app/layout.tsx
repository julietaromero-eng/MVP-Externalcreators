import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Brkaway – Portfolio Generator",
  description: "Generá portfolios de creators a partir de información pública",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${inter.className} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
