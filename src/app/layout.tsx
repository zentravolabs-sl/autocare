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

import type { Viewport } from "next";
import { ServiceWorkerRegistrar } from "@/components/offline/sw-registrar";

export const metadata: Metadata = {
  title: "AutoCare Pro | Enterprise Automotive Service Center Management SaaS",
  description:
    "Multi-tenant, offline-first operating system for automotive workshops, multi-brand service centers, and commercial fleet garages.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0B132B",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
