import type { Metadata } from "next";
import "./globals.css";
import SmoothScrollProvider from "@/components/Providers/SmoothScrollProvider";

export const metadata: Metadata = {
  title: "NEERNETRA — Tactical Hydrological Command Platform",
  description:
    "AI-Powered Himalayan Flash Flood, Cloudburst & Cryo-Seismic GLOF Early Warning and Inundation Prediction System.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌊</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#05070e] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
