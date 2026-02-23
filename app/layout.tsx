import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { GameProvider } from "@/lib/GameContext";
import { AgeGate } from "@/components/AgeGate";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LottoAds — Watch Ads, Win Prizes",
  description: "Earn lottery tickets by watching ads and win weekly cash prizes. Free to play. New draw every Sunday.",
  keywords: ["lottery", "ads", "win prizes", "free lottery", "weekly draw"],
  openGraph: {
    title: "LottoAds — Watch Ads, Win Prizes",
    description: "Earn lottery tickets by watching ads and win weekly cash prizes. Free to play.",
    type: "website",
    siteName: "LottoAds",
  },
  twitter: {
    card: "summary",
    title: "LottoAds — Watch Ads, Win Prizes",
    description: "Earn lottery tickets by watching ads and win weekly cash prizes.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-background antialiased selection:bg-yellow-500/30`}>
        <AuthProvider>
          <GameProvider>
            <AgeGate />
            <div className="relative flex min-h-screen flex-col">
              <main className="flex-1">{children}</main>
            </div>
          </GameProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
