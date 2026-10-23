import type { Metadata } from "next";
import { Big_Shoulders, Barlow, Chakra_Petch } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";
import PwaRegister from "@/components/PwaRegister";

const bigShoulders = Big_Shoulders({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["600", "700", "800", "900"],
});

const barlow = Barlow({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const chakraPetch = Chakra_Petch({
  subsets: ["latin"],
  variable: "--font-scoreboard",
  display: "swap",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "TTA Table Tennis Academy | Match Night Portal",
  description: "Official Table Tennis Academy Portal. High-performance coaching, tournament circuits, and player development.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bigShoulders.variable} ${barlow.variable} ${chakraPetch.variable}`}>
      <body className="font-body bg-arena text-arena">
        <ToastProvider>
          {children}
          <PwaRegister />
        </ToastProvider>
      </body>
    </html>
  );
}
