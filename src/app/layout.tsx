import type { Metadata, Viewport } from "next";
import { Montserrat, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConditionalLayout } from "@/components/conditional-layout";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", weight: ["600", "700"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Hermes Mission Control",
  description: "Tasheer Digital — agency operations cockpit",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr">
      <body className={`${montserrat.variable} ${inter.variable} ${geistMono.variable} ${inter.className} bg-[#f8f9fa] text-[#191c1d] min-h-screen`}>
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  );
}
