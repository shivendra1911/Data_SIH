"use client";

import React, { useState } from "react";
import { HazardZone } from "@/lib/types";
import {
  VolumeX, RadioTower, ChevronDown, ChevronUp,
  Footprints, Ban, Radio, PhoneCall,
} from "lucide-react";

interface AccessibleVoiceCardProps {
  activeZone: HazardZone;
  riskPercent: number;
}

export default function AccessibleVoiceCard({ activeZone, riskPercent }: AccessibleVoiceCardProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSpeak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Text-to-speech is not supported in this browser.");
      return;
    }
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const hours = Math.floor(activeZone.leadTimeMinutes / 60);
    const mins = activeZone.leadTimeMinutes % 60;
    const speechText = `Emergency Bulletin for ${activeZone.name}. Hydrological risk is at ${riskPercent.toFixed(0)} percent. Alert status is ${activeZone.alertColor}. An estimated evacuation window of ${hours} hours and ${mins} minutes remains before the river breaches the danger threshold of ${activeZone.dangerMarkM} meters. Move uphill from riverbanks immediately. Halt all highway bridge crossings.`;
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = "en-IN";
    utterance.rate = 0.92;
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
      className={`tilt-card rounded-2xl transition-all duration-200 overflow-hidden glass-panel shadow-md border ${
        isRed
          ? "border-red-300"
          : isOrange
          ? "border-amber-300"
          : "border-white/60"
      }`}
    >
      <div className="p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 relative z-10">
        {/* Left: Voice Broadcast */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSpeak}
            aria-label={isSpeaking ? "Stop voice broadcast" : "Start voice emergency broadcast"}
            className={`btn-solid-danger flex items-center gap-2.5 text-xs shadow-md ${
              isSpeaking
                ? "bg-amber-400 text-slate-950 ring-4 ring-amber-400/40 animate-pulse"
                : ""
            }`}
          >
            {isSpeaking ? (
              <>
                <VolumeX className="w-4 h-4 animate-spin" aria-hidden />
                <span>Broadcasting...</span>
              </>
            ) : (
              <>
                <RadioTower className="w-4 h-4 animate-pulse" aria-hidden />
                <span>Acoustic Voice Alert</span>
              </>
            )}
          </button>

          <div className="hidden sm:block">
            <div className="text-[10px] uppercase tracking-widest text-slate-600 font-extrabold mb-0.5">
              Civil Defense Voice Dispatch
            </div>
            <p className="text-xs font-bold text-slate-900 line-clamp-1">
              {isRed
                ? "CRITICAL: Low-lying riverbanks must evacuate uphill immediately."
                : isOrange
                ? "ELEVATED VIGILANCE: River levels approaching warning marks."
                : "BASELINE: All hydrometric stations reporting normal velocity."}
            </p>
          </div>
        </div>

        {/* Right: Solid Action Hotlines & Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <a href="tel:1078" aria-label="Call NDRF emergency 1078"
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition min-h-[44px] shadow-sm active:scale-[0.98]">
            <PhoneCall className="w-3.5 h-3.5" aria-hidden />
            <span>NDRF 1078</span>
          </a>
          <a href="tel:1070" aria-label="Call SDMA emergency 1070"
            className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 transition min-h-[44px] shadow-sm active:scale-[0.98]">
            <PhoneCall className="w-3.5 h-3.5" aria-hidden />
            <span>SDMA 1070</span>
          </a>
          <a href="tel:108" aria-label="Call ambulance 108"
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition min-h-[44px] shadow-sm active:scale-[0.98]">
            <PhoneCall className="w-3.5 h-3.5" aria-hidden />
            <span>Ambulance 108</span>
          </a>
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Hide evacuation checklist" : "Show evacuation checklist"}
            className="px-3.5 py-2 rounded-xl bg-white/90 hover:bg-white text-slate-900 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition min-h-[44px] shadow-sm active:scale-[0.98]"
          >
            <span>{isExpanded ? "Hide Checklist" : "Evacuation Checklist"}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" aria-hidden /> : <ChevronDown className="w-3.5 h-3.5" aria-hidden />}
          </button>
        </div>
      </div>

      {/* Evacuation Checklist */}
      {isExpanded && (
        <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-100 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-white border border-gray-200 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                <Footprints className="w-4 h-4" aria-hidden />
              </div>
              <div>
                <strong className="text-xs text-gray-900 block mb-0.5 font-bold">1. Move to High Ground</strong>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Evacuate to elevated terrain at least 100m vertically above the nearest riverbank.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-gray-200 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0 mt-0.5">
                <Ban className="w-4 h-4" aria-hidden />
              </div>
              <div>
                <strong className="text-xs text-gray-900 block mb-0.5 font-bold">2. Clear Bridges & Crossings</strong>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Do not cross submerged causeways, footbridges, or river fords under any circumstance.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white border border-gray-200 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 border border-violet-200 flex items-center justify-center shrink-0 mt-0.5">
                <Radio className="w-4 h-4" aria-hidden />
              </div>
              <div>
                <strong className="text-xs text-gray-900 block mb-0.5 font-bold">3. Maintain BLE Beacon</strong>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Keep Android device on and connected to offline BLE mesh nodes for relay to emergency services.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}