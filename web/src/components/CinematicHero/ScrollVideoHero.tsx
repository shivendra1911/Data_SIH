"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight, ArrowDown, ChevronUp, Info, X, ShieldAlert, Radio, Activity, Navigation, Smartphone } from "lucide-react";
import { useVideoScrub } from "@/lib/useVideoScrub";

const VIDEO_URL = "/download.mp4";
const DARK = "#1D3045";

interface StaggerProps {
  show: boolean;
  delayMs?: number;
  className?: string;
  children: React.ReactNode;
}

function Stagger({ show, delayMs = 0, className = "", children }: StaggerProps) {
  return (
    <div
      className={className}
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms`,
      }}
    >
      {children}
    </div>
  );
}

interface ScrollVideoHeroProps {
  onEnterCommandCenter?: () => void;
}

export default function ScrollVideoHero({ onEnterCommandCenter }: ScrollVideoHeroProps) {
  const { containerRef, videoRef, canvasRef, scrollProgress: p, isCanvasLive } = useVideoScrub(VIDEO_URL);

  const [navMounted, setNavMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Entrance animation for Navbar
  useEffect(() => {
    const timer = setTimeout(() => {
      setNavMounted(true);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [menuOpen]);

  // Color flips at p > 0.55: DARK -> white (duration-500)
  const isLightNav = p > 0.55;

  // Sequential Opacities
  // s1Opacity: p < 0.20 -> 1; else -> max(0, 1 - (p - 0.20) / 0.08)
  const s1Opacity = p < 0.20 ? 1 : Math.max(0, 1 - (p - 0.20) / 0.08);

  // s2Opacity: p < 0.32 -> 0; p < 0.40 -> (p - 0.32) / 0.08; p < 0.55 -> 1; else -> max(0, 1 - (p - 0.55) / 0.08)
  const s2Opacity =
    p < 0.32
      ? 0
      : p < 0.40
      ? (p - 0.32) / 0.08
      : p < 0.55
      ? 1
      : Math.max(0, 1 - (p - 0.55) / 0.08);

  // s3Opacity: p < 0.67 -> 0; p < 0.75 -> (p - 0.67) / 0.08; else -> 1
  const s3Opacity = p < 0.67 ? 0 : p < 0.75 ? (p - 0.67) / 0.08 : 1;

  // Stagger triggers when section opacity > 0.3
  const s1Show = s1Opacity > 0.3;
  const s2Show = s2Opacity > 0.3;
  const s3Show = s3Opacity > 0.3;

  const scrollToCommandCenter = () => {
    if (onEnterCommandCenter) {
      onEnterCommandCenter();
    } else {
      const el = document.getElementById("command-center");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else {
        window.scrollTo({ top: window.innerHeight * 5.1, behavior: "smooth" });
      }
    }
  };

  const navLinks = [
    { label: "NEERNETRA TAC-OPS", action: () => scrollToCommandCenter() },
    { label: "GLOF SURGE SENSORS", action: () => scrollToCommandCenter() },
    { label: "BASIN HYDROLOGY", action: () => scrollToCommandCenter() },
    { label: "RESCUE TRIAGE", action: () => scrollToCommandCenter() },
  ];

  return (
    <div ref={containerRef} className="relative h-[500vh] bg-[#1D3045]">
      {/* Sticky scene */}
      <div className="sticky top-0 w-full h-screen overflow-hidden">
        {/* 1) Video full cover (playback driven purely by scroll, never autoplayed) */}
        <video
          ref={videoRef}
          src={VIDEO_URL}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          playsInline
          preload="auto"
        />

        {/* 2) Canvas 1920x1080 for decoded WebCodecs frames */}
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isCanvasLive ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* 3) Cinematic Vignette & Ambient Gradient Overlays for High Legibility */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/25 via-transparent to-black/40" />

        {/* 4) Overlay containing Navbar + 3 sequential sections */}
        <div className="absolute inset-0 pointer-events-none">
          {/* NAVBAR */}
          <nav className="absolute top-0 left-0 right-0 z-50 pointer-events-auto px-6 sm:px-8 md:px-12 pt-8 sm:pt-10 pb-6 flex items-center justify-between transition-colors duration-500">
            {/* Desktop Left Cluster */}
            <div className="hidden lg:flex items-center gap-8 xl:gap-10">
              {/* Brand Emblem */}
              <div className="flex items-center gap-2.5 mr-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors duration-500 ${
                  isLightNav
                    ? "bg-white/10 border-white/30 text-white"
                    : "bg-[#1D3045]/15 border-[#1D3045]/30 text-[#1D3045]"
                }`}>
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <span className={`font-mono text-xs font-bold tracking-widest uppercase transition-colors duration-500 ${
                  isLightNav ? "text-white" : "text-[#1D3045]"
                }`}>
                  NEERNETRA
                </span>
              </div>

              {navLinks.map((link, i) => (
                <button
                  key={link.label}
                  onClick={link.action}
                  className={`relative text-xs tracking-[0.15em] uppercase font-medium transition-colors duration-500 hover:opacity-75 min-h-[44px] flex items-center ${
                    isLightNav ? "text-white" : "text-[#1D3045]"
                  }`}
                  style={{
                    opacity: navMounted ? 1 : 0,
                    transform: navMounted ? "translateY(0)" : "translateY(-12px)",
                    transition: `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${
                      i * 80 + 100
                    }ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${
                      i * 80 + 100
                    }ms, color 0.5s ease`,
                  }}
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* Mobile <lg Brand + Hamburger */}
            <div className="lg:hidden flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors duration-500 ${
                  isLightNav
                    ? "bg-white/10 border-white/30 text-white"
                    : "bg-[#1D3045]/15 border-[#1D3045]/30 text-[#1D3045]"
                }`}>
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <span className={`font-mono text-xs font-bold tracking-widest uppercase transition-colors duration-500 ${
                  isLightNav ? "text-white" : "text-[#1D3045]"
                }`}>
                  NEERNETRA
                </span>
              </div>

              <button
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
                className="flex flex-col justify-center gap-[5px] p-2 min-h-[44px] min-w-[44px] focus:outline-none"
              >
                <span
                  className={`block w-6 h-[2px] transition-colors duration-500 ${
                    isLightNav ? "bg-white" : "bg-[#1D3045]"
                  }`}
                />
                <span
                  className={`block w-6 h-[2px] transition-colors duration-500 ${
                    isLightNav ? "bg-white" : "bg-[#1D3045]"
                  }`}
                />
                <span
                  className={`block w-4 h-[2px] transition-colors duration-500 ${
                    isLightNav ? "bg-white" : "bg-[#1D3045]"
                  }`}
                />
              </button>
            </div>

            {/* Right Cluster (Desktop) */}
            <div
              className="hidden sm:flex items-center gap-5"
              style={{
                opacity: navMounted ? 1 : 0,
                transform: navMounted ? "translateY(0)" : "translateY(-12px)",
                transition:
                  "opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) 500ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) 500ms",
              }}
            >
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-current/20 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span
                  className={`text-[11px] tracking-[0.2em] uppercase font-mono font-semibold transition-colors duration-500 ${
                    isLightNav ? "text-white" : "text-[#1D3045]"
                  }`}
                >
                  SIH26192 RADAR ACTIVE
                </span>
              </div>

              {/* Direct Jump to Command Center */}
              <button
                onClick={scrollToCommandCenter}
                className={`px-4 py-2 rounded-full text-xs tracking-[0.15em] uppercase font-mono font-semibold transition-all duration-300 min-h-[44px] flex items-center gap-2 border ${
                  isLightNav
                    ? "bg-white text-[#1D3045] hover:bg-white/90 border-white"
                    : "bg-[#1D3045] text-white hover:bg-[#1D3045]/90 border-[#1D3045]"
                }`}
              >
                <span>ENTER COMMAND OPS</span>
                <ArrowDown size={13} />
              </button>
            </div>
          </nav>

          {/* SECTION 1: Hero (left-aligned, vertically centered) */}
          <div
            className="absolute inset-0 px-6 sm:px-8 md:px-20 lg:px-32 flex flex-col justify-center"
            style={{
              opacity: s1Opacity,
              transition: "opacity 0.1s ease-out",
              pointerEvents: s1Opacity > 0.05 ? "auto" : "none",
            }}
          >
            <div className="max-w-4xl space-y-4">
              <Stagger show={s1Show} delayMs={0}>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1D3045]/10 border border-[#1D3045]/20 backdrop-blur-md">
                  <Activity className="w-3.5 h-3.5 text-[#1D3045]" />
                  <span className="text-xs font-mono font-semibold tracking-[0.2em] uppercase text-[#1D3045]">
                    CENTRAL WATER COMMISSION • SDMA UTTARAKHAND
                  </span>
                </div>
              </Stagger>

              <Stagger show={s1Show} delayMs={100}>
                <h1
                  className="text-[clamp(2.2rem,5.5vw,5.2rem)] font-light uppercase leading-[1.12] tracking-tight font-sans"
                  style={{ color: DARK }}
                >
                  PREDICTING HIMALAYAN FLASH FLOODS WITH ZERO-MINUTE LEAD TIME
                </h1>
              </Stagger>

              <Stagger show={s1Show} delayMs={220}>
                <p
                  className="text-sm sm:text-base tracking-[0.25em] uppercase font-mono font-medium max-w-2xl"
                  style={{ color: "#1D3045B8" }}
                >
                  PHYSICS-INFORMED NEURAL HYDROLOGY • CRYO-SEISMIC GLOF SURGE DETECTION
                </p>
              </Stagger>
            </div>

            {/* Bottom-right Advance Arrow Button */}
            <div className="absolute bottom-12 right-6 sm:right-8 md:right-12">
              <Stagger show={s1Show} delayMs={350}>
                <button
                  aria-label="Advance to Next Horizon"
                  onClick={() => {
                    window.scrollBy({ top: window.innerHeight * 1.5, behavior: "smooth" });
                  }}
                  className="w-14 h-14 rounded-full border flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 min-h-[44px] min-w-[44px] bg-[#1D3045]/5 backdrop-blur-sm shadow-lg"
                  style={{ borderColor: `${DARK}80`, color: DARK }}
                >
                  <ArrowDown size={22} />
                </button>
              </Stagger>
            </div>
          </div>

          {/* SECTION 2: Center */}
          <div
            className="absolute inset-0 px-6 sm:px-8 flex items-center justify-center"
            style={{
              opacity: s2Opacity,
              transition: "opacity 0.1s ease-out",
              pointerEvents: s2Opacity > 0.05 ? "auto" : "none",
            }}
          >
            <div className="max-w-[960px] mx-auto text-center space-y-6">
              <Stagger show={s2Show} delayMs={0}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1D3045]/10 border border-[#1D3045]/20 backdrop-blur-md mx-auto">
                  <Radio className="w-3.5 h-3.5 text-[#1D3045]" />
                  <span className="text-[11px] font-mono font-semibold tracking-[0.2em] uppercase text-[#1D3045]">
                    CATCHMENT TELEMETRY • HIGHWAY SENSORS
                  </span>
                </div>
              </Stagger>

              <Stagger show={s2Show} delayMs={100}>
                <h2
                  className="text-[clamp(1.6rem,4.5vw,4.2rem)] font-extralight tracking-tight leading-[1.25] text-center uppercase font-sans"
                  style={{ color: DARK }}
                >
                  WE SAFEGUARD DOWNSTREAM BASINS WITH PRECISION TELEMETRY{" "}
                  <span style={{ color: `${DARK}CC` }}>ACROSS EVERY HIMALAYAN VALLEY</span>{" "}
                  <span style={{ color: `${DARK}80` }}>AND MORAINE GLACIER FRONTIER</span>
                </h2>
              </Stagger>
            </div>

            {/* Right column controls */}
            <div className="absolute bottom-16 right-6 sm:right-8 md:right-12 flex flex-col items-center gap-4">
              <Stagger show={s2Show} delayMs={200}>
                <button
                  aria-label="Advance scroll"
                  onClick={() => {
                    window.scrollBy({ top: window.innerHeight * 1.5, behavior: "smooth" });
                  }}
                  className="w-12 h-12 rounded-full border flex items-center justify-center hover:scale-105 active:scale-95 transition-all min-h-[44px] min-w-[44px]"
                  style={{ borderColor: `${DARK}66`, color: DARK }}
                >
                  <ArrowDown size={18} />
                </button>
              </Stagger>

              <Stagger show={s2Show} delayMs={350}>
                <div className="flex flex-col items-center gap-2 mt-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: DARK }} />
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `${DARK}66` }} />
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `${DARK}66` }} />
                </div>
              </Stagger>

              <Stagger show={s2Show} delayMs={500}>
                <button
                  aria-label="Scroll to top"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="w-11 h-11 rounded-full border flex items-center justify-center mt-2 hover:opacity-75 transition-opacity min-h-[44px] min-w-[44px]"
                  style={{ borderColor: `${DARK}4D`, color: `${DARK}CC` }}
                >
                  <ChevronUp size={16} />
                </button>
              </Stagger>
            </div>
          </div>

          {/* SECTION 3: Right aligned, white type (video is dark here) */}
          <div
            className="absolute inset-0 px-6 sm:px-8 md:px-20 lg:px-32 flex items-center justify-end"
            style={{
              opacity: s3Opacity,
              transition: "opacity 0.1s ease-out",
              pointerEvents: s3Opacity > 0.05 ? "auto" : "none",
            }}
          >
            <div className="max-w-2xl text-left space-y-6">
              <Stagger show={s3Show} delayMs={0}>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-white/80 font-mono text-xs tracking-[0.2em] uppercase font-semibold">
                    DISASTER MANAGEMENT CRISIS PORTAL
                  </span>
                </div>
              </Stagger>

              <Stagger show={s3Show} delayMs={150}>
                <h2 className="text-[clamp(2.2rem,4.5vw,4.4rem)] font-light text-white leading-[1.15] uppercase tracking-tight font-sans">
                  AUTONOMOUS RESCUE TRIAGE,<br />
                  <span className="text-cyan-400">REGIONAL MOBILE ALERT BROADCAST.</span>
                </h2>
              </Stagger>

              <Stagger show={s3Show} delayMs={280}>
                <p className="text-white/70 font-mono text-sm leading-relaxed max-w-xl">
                  Real-time synchronization between CWC river hydrometry, BLE mesh-relayed citizen distress beacons, and geo-fenced acoustic push sirens across affected mountain valleys.
                </p>
              </Stagger>

              <Stagger show={s3Show} delayMs={380}>
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    aria-label="Enter Live Command Center"
                    onClick={scrollToCommandCenter}
                    className="px-7 py-3.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono text-xs font-bold tracking-[0.2em] uppercase shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300 flex items-center gap-3 min-h-[48px] border border-cyan-400/30"
                  >
                    <span>ENTER LIVE COMMAND CENTER</span>
                    <ArrowDown size={16} />
                  </button>

                  <button
                    aria-label="Scroll Back to Top"
                    onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    className="px-5 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-mono text-xs tracking-[0.15em] uppercase transition-colors min-h-[48px] border border-white/20 flex items-center gap-2"
                  >
                    <ChevronUp size={15} />
                    <span>OVERVIEW TOP</span>
                  </button>
                </div>
              </Stagger>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE MENU OVERLAY */}
      <div
        className={`fixed inset-0 z-[100] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          menuOpen ? "opacity-100 visible pointer-events-auto" : "opacity-0 invisible pointer-events-none"
        }`}
        style={{ backgroundColor: DARK }}
      >
        <div
          className={`h-full flex flex-col justify-between transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            menuOpen ? "translate-y-0" : "-translate-y-8"
          }`}
        >
          {/* Top close button */}
          <div className="flex items-center justify-between px-6 sm:px-8 pt-8 sm:pt-12">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-cyan-400" />
              <span className="font-mono text-sm font-bold text-white tracking-widest uppercase">
                NEERNETRA
              </span>
            </div>

            <button
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="w-11 h-11 rounded-full border border-white/30 flex items-center justify-center text-white hover:border-white transition-colors min-h-[44px] min-w-[44px]"
            >
              <X size={20} />
            </button>
          </div>

          {/* Links centered vertically */}
          <div className="flex flex-col px-8 sm:px-12 py-4 space-y-2">
            {navLinks.map((link, i) => (
              <button
                key={link.label}
                onClick={() => {
                  setMenuOpen(false);
                  link.action();
                }}
                className="py-3 text-left text-xl sm:text-2xl font-light tracking-wide uppercase text-white/80 hover:text-cyan-400 transition-colors"
                style={{
                  transform: menuOpen ? "translateY(0)" : "translateY(20px)",
                  opacity: menuOpen ? 1 : 0,
                  transitionDelay: `${i * 60}ms`,
                }}
              >
                {link.label}
              </button>
            ))}

            <div className="pt-6">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  scrollToCommandCenter();
                }}
                className="w-full py-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition"
              >
                <span>LAUNCH TACTICAL OPS</span>
                <ArrowDown size={16} />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-8 sm:px-12 pb-10 border-t border-white/10 pt-6">
            <span className="text-xs font-mono tracking-[0.2em] uppercase text-white/60">
              NDRF 1078 • SDMA 1070
            </span>
            <span className="text-xs font-mono tracking-[0.2em] uppercase text-cyan-400">
              ZERO-MINUTE PROTOCOL
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
