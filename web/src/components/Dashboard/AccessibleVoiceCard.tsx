"use client";

import React, { useState } from "react";
import { HazardZone } from "@/lib/types";
import {
  Volume2,
  VolumeX,
  RadioTower,
  ChevronDown,
  ChevronUp,
  Footprints,
  Ban,
  Radio,
  PhoneCall,
} from "lucide-react";

interface AccessibleVoiceCardProps {
  activeZone: HazardZone;
  riskPercent: number;
}

export default function AccessibleVoiceCard({
  activeZone,
  riskPercent,
}: AccessibleVoiceCardProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSpeak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Text-to-speech audio is not supported in this browser.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const hours = Math.floor(activeZone.leadTimeMinutes / 60);
    const mins = activeZone.leadTimeMinutes % 60;

    const speechText = `Emergency Bulletin for ${activeZone.name}. Hydrological risk is at ${riskPercent.toFixed(
      0
    )} percent. Alert status is ${activeZone.alertColor}. An estimated evacuation lead-time of ${hours} hours and ${mins} minutes remains before the river breaches the danger threshold of ${activeZone.dangerMarkM} meters. Move uphill from riverbanks immediately and halt highway bridge crossings.`;

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = "en-US";
    utterance.rate = 0.95;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const isRed = riskPercent >= 75;
  const isOrange = riskPercent >= 55 && !isRed;

  return (
    <div
      className={`tilt-card rounded-2xl border transition-all duration-200 overflow-hidden shadow-xl ${
        isRed
          ? "bg-slate-950/90 border-rose-500/50 glow-border-rose"
          : isOrange
          ? "bg-slate-950/90 border-amber-500/50"
          : "bg-slate-950/90 border-slate-800"
      }`}
    >
      <div className="p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 relative z-10">
        {/* Left: Audio Broadcast Controller */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSpeak}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition min-h-[44px] shadow-lg ${
              isSpeaking
                ? "bg-amber-400 text-slate-950 ring-4 ring-amber-400/30 animate-pulse"
                : isRed
                ? "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-900/50"
                : "bg-sky-600 hover:bg-sky-500 text-white"
            }`}
          >
            {isSpeaking ? (
              <>
                <VolumeX className="w-4 h-4 animate-spin" />
                <span>Broadcasting Voice Alert...</span>
              </>
            ) : (
              <>
                <RadioTower className="w-4 h-4 animate-pulse" />
                <span>Broadcast Acoustic Voice Alert</span>
              </>
            )}
          </button>

          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                Civil Defense Voice Dispatch
              </span>
            </div>
            <p className="text-xs font-medium text-slate-200 line-clamp-1">
              {isRed
                ? "CRITICAL EVACUATION PROTOCOL: Low-lying riverbanks must evacuate uphill immediately."
                : isOrange
                ? "ELEVATED VIGILANCE: River levels accelerating towards warning marks."
                : "BASELINE CONDITIONS: All hydrometric stations reporting normal channel velocity."}
            </p>
          </div>
        </div>

        {/* Right: Emergency Hotline Speed Dials & Directive Checklist Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="tel:1078"
            className="px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5 transition min-h-[38px]"
          >
            <PhoneCall className="w-3 h-3" />
            <span>NDRF 1078</span>
          </a>

          <a
            href="tel:1070"
            className="px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-sky-500/40 text-sky-300 font-mono text-xs font-bold flex items-center gap-1.5 transition min-h-[38px]"
          >
            <PhoneCall className="w-3 h-3" />
            <span>SDMA 1070</span>
          </a>

          <a
            href="tel:108"
            className="px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-rose-500/40 text-rose-300 font-mono text-xs font-bold flex items-center gap-1.5 transition min-h-[38px]"
          >
            <PhoneCall className="w-3 h-3" />
            <span>Ambulance 108</span>
          </a>

          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition min-h-[38px]"
          >
            <span>{isExpanded ? "Hide Directives" : "Evacuation Checklist"}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Ground Directives */}
      {isExpanded && (
        <div className="p-3 sm:p-4 bg-slate-950/70 border-t border-slate-800/80 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Footprints className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-xs text-white block mb-0.5 font-bold">1. Move to High Ground</strong>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Evacuate to elevated terrain at least 100m vertically above the riverbank.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                <Ban className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-xs text-white block mb-0.5 font-bold">2. Clear Bridges & Low Crossings</strong>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Do not attempt to drive or walk across submerged footbridges or river causeways.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-xs text-white block mb-0.5 font-bold">3. Maintain Comms & Beacon</strong>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Keep Android device connected to offline BLE mesh nodes for relay to emergency services.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}