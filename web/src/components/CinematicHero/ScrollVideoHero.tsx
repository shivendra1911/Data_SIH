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
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setNavMounted(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToCommandCenter = () => {
    if (onEnterCommandCenter) {
      onEnterCommandCenter();
    } else {
      const el = document.getElementById("command-center");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else {
        window.scrollTo({ top: window.innerHeight * 0.85, behavior: "smooth" });
      }
    }
  };

  // Dynamic in-and-out text animation calculation based on scroll progress
  const heroTextOpacity = Math.max(0, 1 - scrollY / 350);
  const heroTextTranslateY = -Math.min(60, scrollY * 0.28);

  return (
    <div ref={containerRef} className="relative w-full h-[75vh] min-h-[540px] max-h-[780px] bg-transparent overflow-hidden">
      {/* Background Video (Hardware-accelerated WebCodecs fallback) */}
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

      {/* Subtle Gradient Scrim for high legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/65 via-slate-950/35 to-slate-950/80 pointer-events-none" />

      {/* Top Navbar */}
      <nav className="absolute top-0 left-0 right-0 z-30 px-6 sm:px-10 pt-6 pb-4 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white backdrop-blur-xl shadow-md">
            <ShieldAlert className="w-5 h-5" aria-hidden />
          </div>
          <span className="text-base font-black text-white tracking-widest uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Neer<span className="text-violet-400">Netra</span>
          </span>
          <span className="hidden sm:inline-flex text-[10px] font-bold px-2.5 py-1 rounded-full bg-violet-500/25 text-violet-200 border border-violet-400/40 uppercase tracking-wider backdrop-blur-md">
            All-India Sentinel
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/30 backdrop-blur-xl text-white text-xs shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-bold text-[11px] uppercase tracking-wider">
              12 River Basins Scanning
            </span>
          </div>

          <button
            onClick={scrollToCommandCenter}
            aria-label="Jump to Command Center"
            className="btn-solid-primary text-xs"
          >
            <span>Command Center</span>
            <ArrowDown className="w-3.5 h-3.5" aria-hidden />
          </button>
        </div>
      </nav>

      {/* Hero Foreground Content — With Smooth In-and-Out Scroll Animation */}
      <div className="absolute inset-0 z-20 flex flex-col justify-center items-center text-center px-6 sm:px-8 max-w-4xl mx-auto pointer-events-auto">
        <div
          className="space-y-4 transition-all duration-300 ease-out"
          style={{
            opacity: navMounted ? heroTextOpacity : 0,
            transform: `translateY(${navMounted ? heroTextTranslateY : 20}px)`,
          }}
        >
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 border border-white/30 backdrop-blur-xl text-white text-xs shadow-md">
            <Zap className="w-3.5 h-3.5 text-amber-300 animate-pulse" aria-hidden />
            <span className="font-bold text-[11px] uppercase tracking-wider">
              Autonomous Flash Flood Detection & Auto-SOS System
            </span>
          </div>

          {/* Main Title with Rabto Typography */}
          <h1
            className="text-3xl sm:text-5xl lg:text-6xl font-light text-white uppercase tracking-tight leading-tight drop-shadow-md"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Predicting Flash Floods Across India <br className="hidden sm:inline" />
            <span className="font-extrabold text-violet-300 drop-shadow-lg">With Autonomous SOS Response</span>
          </h1>

          <p className="text-xs sm:text-sm text-slate-100 max-w-2xl mx-auto leading-relaxed drop-shadow">
            Real-time physics-informed AI evaluating Himalayan valleys, Northeast floodplains, and Western Ghats catchments simultaneously. Autonomously dispatches emergency evacuation alerts to citizen devices upon threshold breach.
          </p>

          {/* Solid Action CTA Button (Rabto style) */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <button
              onClick={scrollToCommandCenter}
              className="btn-solid-primary text-xs sm:text-sm font-bold uppercase tracking-wider shadow-2xl hover:shadow-violet-600/40 min-h-[48px] px-8 py-3"
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
