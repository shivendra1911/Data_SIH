"use client";

import React, { useState, useEffect } from "react";
import { ArrowDown, ShieldAlert, Radio, Activity, Navigation, Zap } from "lucide-react";
import { useVideoScrub } from "@/lib/useVideoScrub";

const VIDEO_URL = "/download.mp4";

interface ScrollVideoHeroProps {
  onEnterCommandCenter?: () => void;
}

export default function ScrollVideoHero({ onEnterCommandCenter }: ScrollVideoHeroProps) {
  const { containerRef, videoRef, canvasRef, isCanvasLive } = useVideoScrub(VIDEO_URL);
  const [navMounted, setNavMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setNavMounted(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const scrollToCommandCenter = () => {
    if (onEnterCommandCenter) {
      onEnterCommandCenter();
    } else {
      const el = document.getElementById("command-center");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else {
        window.scrollTo({ top: window.innerHeight * 0.9, behavior: "smooth" });
      }
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-[75vh] min-h-[540px] max-h-[780px] bg-slate-950 overflow-hidden">
      {/* Background Video (Kept exactly as requested) */}
      <video
        ref={videoRef}
        src={VIDEO_URL}
        className="absolute inset-0 w-full h-full object-cover"
        muted
        playsInline
        autoPlay
        loop
        preload="auto"
      />

      {/* WebCodecs Frame Canvas */}
      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          isCanvasLive ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Gradient Scrim for high legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/40 to-slate-950/85 pointer-events-none" />

      {/* Top Navbar */}
      <nav className="absolute top-0 left-0 right-0 z-30 px-6 sm:px-10 pt-6 pb-4 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-white backdrop-blur-md">
            <ShieldAlert className="w-5 h-5" aria-hidden />
          </div>
          <span className="text-sm font-bold text-white tracking-widest uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            NeerNetra
          </span>
          <span className="hidden sm:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-200 border border-violet-400/30 uppercase">
            All-India Sentinel
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-white text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-semibold text-[11px] uppercase tracking-wider">
              12 River Basins Scanning
            </span>
          </div>

          <button
            onClick={scrollToCommandCenter}
            aria-label="Jump to Command Center"
            className="px-4 py-2 rounded-xl bg-violet-700 hover:bg-violet-600 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg min-h-[44px]"
          >
            <span>Command Center</span>
            <ArrowDown className="w-3.5 h-3.5" aria-hidden />
          </button>
        </div>
      </nav>

      {/* Hero Foreground Content — Concise, Actionable, No 2-page marketing filler */}
      <div className="absolute inset-0 z-20 flex flex-col justify-center items-center text-center px-6 sm:px-8 max-w-4xl mx-auto pointer-events-auto">
        <div
          className="space-y-4 transition-all duration-700"
          style={{
            opacity: navMounted ? 1 : 0,
            transform: navMounted ? "translateY(0)" : "translateY(20px)",
          }}
        >
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/25 backdrop-blur-md text-white text-xs">
            <Zap className="w-3.5 h-3.5 text-amber-300 animate-pulse" aria-hidden />
            <span className="font-bold text-[11px] uppercase tracking-wider">
              Autonomous Flash Flood Detection & Auto-SOS System
            </span>
          </div>

          {/* Main Title */}
          <h1
            className="text-3xl sm:text-5xl lg:text-6xl font-light text-white uppercase tracking-tight leading-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Predicting Flash Floods Across India <br className="hidden sm:inline" />
            <span className="font-bold text-violet-300">With Autonomous SOS Response</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-200 max-w-2xl mx-auto leading-relaxed">
            Real-time physics-informed AI evaluating Himalayan valleys, Northeast floodplains, and Western Ghats catchments simultaneously. Autonomously dispatches emergency evacuation alerts to citizen devices upon threshold breach.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={scrollToCommandCenter}
              className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-xl hover:shadow-violet-500/25 flex items-center gap-2 min-h-[48px]"
            >
              <span>Explore Live Command Radar</span>
              <ArrowDown className="w-4 h-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
