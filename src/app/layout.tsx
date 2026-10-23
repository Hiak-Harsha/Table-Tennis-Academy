import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Table Tennis Academy",
  description: "Official Table Tennis Academy Portal. Professional coaching and sports management.",
  manifest: "/manifest.webmanifest",
};

import { ToastProvider } from "@/components/ToastProvider";
import PwaRegister from "@/components/PwaRegister";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          {children}
          <PwaRegister />
        </ToastProvider>
      </body>
    </html>
  );
}
