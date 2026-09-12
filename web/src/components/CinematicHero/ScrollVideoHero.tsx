"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ChevronUp,
  ShieldAlert,
  Radio,
  Activity,
  Compass,
  Users,
  Zap,
} from "lucide-react";
import { useVideoScrub } from "@/lib/useVideoScrub";

const VIDEO_URL = "/download.mp4";

interface ScrollVideoHeroProps {
  onEnterCommandCenter?: () => void;
}

export default function ScrollVideoHero({ onEnterCommandCenter }: ScrollVideoHeroProps) {
  const { containerRef, videoRef, canvasRef, scrollProgress: p, isCanvasLive } = useVideoScrub(VIDEO_URL);
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
      const el = document.getElementById("sentinel-overview");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else {
        window.scrollTo({ top: window.innerHeight * 4.3, behavior: "smooth" });
      }
    }
  };

  const advanceScroll = (targetProgress: number) => {
    const container = containerRef.current;
    if (!container) return;
    const totalScroll = container.offsetHeight - window.innerHeight;
    if (totalScroll > 0) {
      const targetY = totalScroll * targetProgress;
      if ((window as any).__lenis) {
        (window as any).__lenis.scrollTo(targetY);
      } else {
        window.scrollTo({
          top: targetY,
          behavior: "smooth",
        });
      }
    }
  };

  // Section 1: Active from p = 0.00 to 0.28 (exits 0.20 -> 0.28)
  const s1Opacity = p < 0.20 ? 1 : Math.max(0, 1 - (p - 0.20) / 0.08);
  const s1TranslateY = p < 0.20 ? 0 : -Math.min(40, ((p - 0.20) / 0.08) * 40);
  const s1Active = s1Opacity > 0.05;

  // Section 2: Active from p = 0.30 to 0.65 (enters 0.30 -> 0.38, exits 0.56 -> 0.64)
  let s2Opacity = 0;
  let s2TranslateY = 40;
  if (p >= 0.30 && p < 0.38) {
    const factor = (p - 0.30) / 0.08;
    s2Opacity = factor;
    s2TranslateY = (1 - factor) * 40;
  } else if (p >= 0.38 && p < 0.56) {
    s2Opacity = 1;
    s2TranslateY = 0;
  } else if (p >= 0.56 && p < 0.64) {
    const factor = (p - 0.56) / 0.08;
    s2Opacity = Math.max(0, 1 - factor);
    s2TranslateY = -factor * 40;
  }
  const s2Active = s2Opacity > 0.05;

  // Section 3: Active from p = 0.68 to 1.00 (enters 0.68 -> 0.76)
  let s3Opacity = 0;
  let s3TranslateY = 40;
  if (p >= 0.68 && p < 0.76) {
    const factor = (p - 0.68) / 0.08;
    s3Opacity = factor;
    s3TranslateY = (1 - factor) * 40;
  } else if (p >= 0.76) {
    s3Opacity = 1;
    s3TranslateY = 0;
  }
  const s3Active = s3Opacity > 0.05;

  // Current active stage for HUD
  const activeStage = p < 0.30 ? 1 : p < 0.66 ? 2 : 3;

  return (
    <div ref={containerRef} className="relative h-[420vh] bg-[#05070e]">
      {/* Sticky Fullscreen Scene */}
      <div className="sticky top-0 w-full h-screen overflow-hidden">
        {/* 1) Hardware-accelerated Video (Playback driven purely by scroll scrub) */}
        <video
          ref={videoRef}
          src={VIDEO_URL}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          playsInline
          preload="auto"
        />

        {/* 2) Decoded WebCodecs Frame Canvas (60 FPS instantaneous seek) */}
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isCanvasLive ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* 3) Cinematic Vignette & Gradient Scrim for WCAG AA Text Contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-slate-950/85 pointer-events-none" />

        {/* 4) Hero Top Navbar */}
        <nav className="absolute top-0 left-0 right-0 z-40 px-5 sm:px-10 pt-6 pb-4 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-900/60 border border-white/20 flex items-center justify-center backdrop-blur-xl shadow-lg overflow-hidden p-1.5">
              <img src="/neernetra-icon.png" alt="NeerNetra Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-wider uppercase font-display">
                Neer<span className="text-white/80">Netra</span>
              </span>
              <span className="hidden sm:inline-flex ml-2.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/15 uppercase tracking-[2px] backdrop-blur-md font-sans">
                /ALL-INDIA SENTINEL
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-xl text-white text-xs shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-semibold text-[10px] uppercase tracking-[2.5px] text-white/90 font-sans">
                12 Basins Scanning
              </span>
            </div>

            <button
              onClick={scrollToCommandCenter}
              aria-label="Jump directly to Command Center"
              className="btn-solid-primary text-xs flex items-center gap-2 h-[38px] px-5"
            >
              <span>Command Center</span>
              <ArrowDown className="w-3.5 h-3.5" aria-hidden />
            </button>
          </div>
        </nav>

        {/* 5) Choreographed Foreground Content Stages */}
        <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">

          {/* ================= STAGE 1: NATIONAL SENTINEL ================= */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center text-center px-6 sm:px-10 max-w-5xl mx-auto"
            style={{
              opacity: s1Opacity,
              transform: `translate3d(0, ${s1TranslateY}px, 0)`,
              pointerEvents: s1Active ? "auto" : "none",
              transition: "transform 0.15s ease-out, opacity 0.15s ease-out",
            }}
          >
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="corwdy-subtitle">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>/AUTONOMOUS FLASH FLOOD DETECTION &amp; AUTO-SOS</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white uppercase tracking-tight leading-[1.12] drop-shadow-2xl font-display">
                Predicting Flash Floods Across India <br className="hidden sm:inline" />
                <span className="font-extrabold text-white">
                  With Autonomous SOS Response
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-white/75 max-w-2xl mx-auto leading-relaxed drop-shadow font-sans font-medium">
                Real-time physics-informed AI evaluating Himalayan valleys, Northeast floodplains, and Western Ghats catchments simultaneously. Autonomously dispatches emergency evacuation alerts to citizen devices upon threshold breach.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3.5 pt-3">
                <button
                  onClick={() => advanceScroll(0.45)}
                  className="btn-solid-primary"
                >
                  <span>Scroll to Scrub Video & Radar</span>
                  <ArrowDown className="w-3.5 h-3.5" aria-hidden />
                </button>

                <button
                  onClick={scrollToCommandCenter}
                  className="btn-solid-dark"
                >
                  <span>Skip to Command Center</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                </button>
              </div>

              <div className="pt-2">
                <button
                  onClick={scrollToCommandCenter}
                  className="underline-link"
                >
                  <span>Explore All 12 Basins</span>
                  <span className="hover-line-fill" />
                </button>
              </div>
            </div>
          </div>

          {/* ================= STAGE 2: HYDRODYNAMIC & CRYO-SEISMIC ================= */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center text-center px-6 sm:px-10 max-w-5xl mx-auto"
            style={{
              opacity: s2Opacity,
              transform: `translate3d(0, ${s2TranslateY}px, 0)`,
              pointerEvents: s2Active ? "auto" : "none",
              transition: "transform 0.15s ease-out, opacity 0.15s ease-out",
            }}
          >
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="corwdy-subtitle text-emerald-400/90">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>/CRYO-SEISMIC TELEMETRY • GLOF EARLY BREACH RADAR</span>
              </div>

              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white uppercase tracking-tight leading-[1.12] drop-shadow-2xl font-display">
                Safeguarding Downstream Basins <br className="hidden sm:inline" />
                <span className="font-extrabold text-white">
                  With High-Precision Sensor Telemetry
                </span>
              </h2>

              <p className="text-xs sm:text-sm text-white/75 max-w-2xl mx-auto leading-relaxed drop-shadow font-sans font-medium">
                Dynamic 2D shallow-water kinematic equations coupled with 4.6M cryo-seismic tremor detection to anticipate glacial moraine breach hours before peak flood surge arrival.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3.5 pt-3">
                <Link
                  href="/radar"
                  className="btn-solid-emerald"
                >
                  <Compass className="w-3.5 h-3.5" aria-hidden />
                  <span>Open Tactical GIS Radar</span>
                </Link>

                <button
                  onClick={() => advanceScroll(0.85)}
                  className="btn-solid-primary"
                >
                  <span>Advance to Rescue Operations</span>
                  <ArrowDown className="w-3.5 h-3.5" aria-hidden />
                </button>
              </div>

              <div className="pt-2">
                <Link
                  href="/radar"
                  className="underline-link"
                >
                  <span>View High-Resolution Radar</span>
                  <span className="hover-line-fill" />
                </Link>
              </div>
            </div>
          </div>

          {/* ================= STAGE 3: CITIZEN RESCUE & TRIAGE ================= */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center text-center px-6 sm:px-10 max-w-5xl mx-auto"
            style={{
              opacity: s3Opacity,
              transform: `translate3d(0, ${s3TranslateY}px, 0)`,
              pointerEvents: s3Active ? "auto" : "none",
              transition: "transform 0.15s ease-out, opacity 0.15s ease-out",
            }}
          >
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="corwdy-subtitle text-rose-400/90">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                <span>/ZERO-MINUTE EMERGENCY RELAY • ANDROID APK INTEGRATION</span>
              </div>

              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white uppercase tracking-tight leading-[1.12] drop-shadow-2xl font-display">
                Autonomous Rescue Triage <br className="hidden sm:inline" />
                <span className="font-extrabold text-white">
                  & Citizen Distress Grid
                </span>
              </h2>

              <p className="text-xs sm:text-sm text-white/75 max-w-2xl mx-auto leading-relaxed drop-shadow font-sans font-medium">
                Live GPS vs Last Known Beacons tracked with uncertainty drift buffers, automated high-ground evacuation routing, and 24/7 autonomous sirens across 108 Ambulance and NDRF response units.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3.5 pt-3">
                <button
                  onClick={scrollToCommandCenter}
                  className="btn-solid-primary"
                >
                  <span>Enter Live Tactical Command</span>
                  <ArrowDown className="w-3.5 h-3.5" aria-hidden />
                </button>

                <Link
                  href="/rescue"
                  className="btn-solid-danger"
                >
                  <Users className="w-3.5 h-3.5" aria-hidden />
                  <span>Citizen Rescue Grid</span>
                </Link>

                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="circle-btn"
                  title="Back to Top"
                  aria-label="Back to top"
                >
                  <ChevronUp className="w-4 h-4" aria-hidden />
                </button>
              </div>

              <div className="pt-2">
                <Link
                  href="/rescue"
                  className="underline-link"
                >
                  <span>Access Citizen Grid &amp; SOS</span>
                  <span className="hover-line-fill" />
                </Link>
              </div>
            </div>
          </div>

        </div>

        {/* 6) Interactive HUD Progress & Scrub Controller (Bottom-Right) */}
        <div className="absolute bottom-8 right-6 sm:right-10 z-40 pointer-events-auto flex items-center gap-3 bg-[#161a20]/80 backdrop-blur-xl border border-white/15 rounded-full px-4 py-2 shadow-2xl text-white font-sans">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold tracking-[2px] text-white/60">Scrub</span>
            <span className="text-xs font-bold text-white">
              {Math.round(p * 100)}%
            </span>
          </div>

          <div className="w-px h-4 bg-white/15" />

          {/* 3 Stage Navigation Dots */}
          <div className="flex items-center gap-1.5">
            {[
              { num: 1, target: 0.05, label: "Overview" },
              { num: 2, target: 0.45, label: "Radar" },
              { num: 3, target: 0.85, label: "Rescue" },
            ].map((s) => (
              <button
                key={s.num}
                onClick={() => advanceScroll(s.target)}
                title={`Jump to Stage ${s.num}: ${s.label}`}
                aria-label={`Jump to Stage ${s.num}`}
                className={`w-6 h-6 rounded-full text-[10px] font-bold uppercase transition flex items-center justify-center ${
                  activeStage === s.num
                    ? "bg-white text-[#161a20] shadow-md scale-105"
                    : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                }`}
              >
                {s.num}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-white/15" />

          {/* Smooth Advance Button */}
          <button
            onClick={() => {
              if (activeStage === 1) advanceScroll(0.45);
              else if (activeStage === 2) advanceScroll(0.85);
              else scrollToCommandCenter();
            }}
            aria-label="Advance to next stage"
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white hover:text-[#161a20] flex items-center justify-center transition active:scale-95 text-white"
          >
            <ArrowDown className="w-3 h-3" aria-hidden />
          </button>
        </div>

        {/* 7) Bottom Central Scroll Hint Indicator */}
        {p < 0.15 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none flex flex-col items-center gap-1.5 text-white/70 text-[10px] font-sans tracking-[3px] uppercase animate-pulse">
            <span>/Scroll To Scrub Video</span>
            <ArrowDown className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
    </div>
  );
}