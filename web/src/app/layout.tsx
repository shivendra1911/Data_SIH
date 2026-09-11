import type { Metadata } from "next";
import { Montserrat, Syne } from "next/font/google";
import "./globals.css";
import SmoothScrollProvider from "@/components/Providers/SmoothScrollProvider";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

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
      <body className={`${montserrat.variable} ${syne.variable} font-sans min-h-screen bg-[#161a20] text-white antialiased selection:bg-white selection:text-[#161a20]`}>
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
