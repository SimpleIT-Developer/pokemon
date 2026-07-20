import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNavigation from "@/components/BottomNavigation";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import InstallPrompt from "@/components/InstallPrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Minha Pokédex",
  description: "Gerencie sua coleção de cartas e Pokémon",
  manifest: "/manifest.json",
  appleWebApp: {
    title: "Pokédex",
    statusBarStyle: "default",
    capable: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#ef4444",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased pb-20`}
      >
        <main className="min-h-screen bg-background pb-safe">
          {children}
        </main>
        <BottomNavigation />
        <InstallPrompt />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
