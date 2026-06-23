import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";
import { SolanaProviders } from "./providers";

const pixelFont = Press_Start_2P({ subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "TrenchCraft — $TCRAFT",
  description: "Voxel Trench Sandbox on Solana — mine, build, survive.",
  openGraph: {
    title: "TrenchCraft — $TCRAFT",
    description: "A playable voxel world on Solana. Mine, build, survive the trenches.",
    images: ["/og.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TrenchCraft — $TCRAFT",
    description: "A playable voxel world on Solana. Mine, build, survive the trenches.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={pixelFont.className}>
        <SolanaProviders>{children}</SolanaProviders>
      </body>
    </html>
  );
}
