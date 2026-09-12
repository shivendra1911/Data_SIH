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
    <div className="tilt-card rounded-2xl transition-all duration-200 overflow-hidden bg-[#1b2027]/90 border border-white/10 shadow-xl text-white">
      <div className="p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 relative z-10">
        {/* Left: Voice Broadcast */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSpeak}
            aria-label={isSpeaking ? "Stop voice broadcast" : "Start voice emergency broadcast"}
            className={`flex items-center gap-2.5 text-xs shadow-sm rounded-full px-4 py-2 font-bold transition min-h-[38px] ${
              isSpeaking
                ? "bg-white/20 text-white border border-white/30 animate-pulse"
                : "btn-solid-primary"
            }`}
          >
            {isSpeaking ? (
              <>
                <VolumeX className="w-4 h-4 animate-spin" aria-hidden />
                <span>Broadcasting...</span>
              </>
            ) : (
              <>
                <RadioTower className="w-4 h-4 text-[#161a20]" aria-hidden />
                <span>Acoustic Voice Alert</span>
              </>
            )}
          </button>

          <div className="hidden sm:block">
            <div className="text-[10px] uppercase tracking-widest text-white/50 font-extrabold mb-0.5">
              Civil Defense Voice Dispatch
            </div>
            <p className="text-xs font-bold text-white line-clamp-1">
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
            className="btn-solid-dark px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition min-h-[38px]">
            <PhoneCall className="w-3.5 h-3.5 text-white/70" aria-hidden />
            <span>NDRF 1078</span>
          </a>
          <a href="tel:1070" aria-label="Call SDMA emergency 1070"
            className="btn-solid-dark px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition min-h-[38px]">
            <PhoneCall className="w-3.5 h-3.5 text-white/70" aria-hidden />
            <span>SDMA 1070</span>
          </a>
          <a href="tel:108" aria-label="Call ambulance 108"
            className="btn-solid-dark px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition min-h-[38px]">
            <PhoneCall className="w-3.5 h-3.5 text-white/70" aria-hidden />
            <span>Ambulance 108</span>
          </a>
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Hide evacuation checklist" : "Show evacuation checklist"}
            className="btn-solid-dark px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition min-h-[38px]"
          >
            <span>{isExpanded ? "Hide Checklist" : "Evacuation Checklist"}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" aria-hidden /> : <ChevronDown className="w-3.5 h-3.5" aria-hidden />}
          </button>
        </div>
      </div>

      {/* Evacuation Checklist */}
      {isExpanded && (
        <div className="p-3 sm:p-4 bg-[#161a20] border-t border-white/10 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-[#1b2027] border border-white/10 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/10 text-white border border-white/15 flex items-center justify-center shrink-0 mt-0.5">
                <Footprints className="w-4 h-4 text-white" aria-hidden />
              </div>
              <div>
                <strong className="text-xs text-white block mb-0.5 font-bold">1. Move to High Ground</strong>
                <p className="text-xs text-white/60 leading-relaxed">
                  Evacuate to elevated terrain at least 100m vertically above the nearest riverbank.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#1b2027] border border-white/10 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/10 text-white border border-white/15 flex items-center justify-center shrink-0 mt-0.5">
                <Ban className="w-4 h-4 text-white" aria-hidden />
              </div>
              <div>
                <strong className="text-xs text-white block mb-0.5 font-bold">2. Clear Bridges & Crossings</strong>
                <p className="text-xs text-white/60 leading-relaxed">
                  Do not cross submerged causeways, footbridges, or river fords under any circumstance.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#1b2027] border border-white/10 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/10 text-white border border-white/15 flex items-center justify-center shrink-0 mt-0.5">
                <Radio className="w-4 h-4 text-white" aria-hidden />
              </div>
              <div>
                <strong className="text-xs text-white block mb-0.5 font-bold">3. Maintain BLE Beacon</strong>
                <p className="text-xs text-white/60 leading-relaxed">
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