import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import Starfield from "@/components/Starfield";
import Nav from "@/components/Nav";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: "ExoHabit — Exoplanet Habitability Assessment",
  description:
    "From raw astronomical measurements to an explainable assessment of alien worlds.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-text">
        <Starfield />
        <Nav />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-[var(--border)] px-5 py-6 text-center">
          <p className="label-eyebrow">
            ExoHabit · Data: NASA Exoplanet Archive (pscomppars) · Model-based assessment, not a
            measurement of life
          </p>
        </footer>
      </body>
    </html>
  );
}
