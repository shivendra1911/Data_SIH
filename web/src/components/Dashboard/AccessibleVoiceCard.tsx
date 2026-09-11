"use client";

import React, { useState } from "react";
import { Language, translations } from "@/lib/i18n";
import { HazardZone } from "@/lib/types";
import {
  Volume2,
  VolumeX,
  PhoneCall,
  ShieldAlert,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Footprints,
  Ban,
  Radio,
  RadioTower,
} from "lucide-react";

interface AccessibleVoiceCardProps {
  activeZone: HazardZone;
  riskPercent: number;
  language: Language;
}

export default function AccessibleVoiceCard({
  activeZone,
  riskPercent,
  language,
}: AccessibleVoiceCardProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const t = translations[language];

  const handleSpeak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Text-to-speech is not supported on this browser.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const hours = Math.floor(activeZone.leadTimeMinutes / 60);
    const mins = activeZone.leadTimeMinutes % 60;

    let speechText = "";
    if (language === "hi") {
      speechText = `सावधान! ${activeZone.name} में बाढ़ का खतरा ${riskPercent.toFixed(
        0
      )} प्रतिशत है। खतरे का स्तर ${
        activeZone.alertColor === "RED" ? "अत्यधिक लाल" : "नारंगी"
      } है। सुरक्षित निकासी के लिए लगभग ${hours} घंटे ${mins} मिनट का समय शेष है। कृपया नदी किनारे से तुरंत हटकर ऊंचे स्थानों पर पहुंचे।`;
    } else {
      speechText = `Warning! Flash flood and GLOF risk in ${activeZone.name} is ${riskPercent.toFixed(
        0
      )} percent. Alert level is ${activeZone.alertColor}. You have an estimated ${hours} hours and ${mins} minutes safe evacuation lead-time window. Move to higher ground immediately and stay clear of riverbanks.`;
    }

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = language === "hi" ? "hi-IN" : "en-IN";
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
      className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-xl ${
        isRed
          ? "bg-slate-950/90 border-rose-500/40 shadow-rose-950/20"
          : isOrange
          ? "bg-slate-950/90 border-amber-500/40 shadow-amber-950/20"
          : "bg-slate-950/90 border-slate-800"
      }`}
    >
      <div className="p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
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
                <span>Broadcasting Audio Alert...</span>
              </>
            ) : (
              <>
                <RadioTower className="w-4 h-4 animate-pulse" />
                <span>Acoustic Siren & Audio Broadcast</span>
              </>
            )}
          </button>

          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                Civil Defense Audio Alert
              </span>
            </div>
            <p className="text-xs font-medium text-slate-200 line-clamp-1">
              {isRed
                ? "CRITICAL EVACUATION PROTOCOL: Low-lying riverbanks must evacuate uphill immediately."
                : isOrange
                ? "ELEVATED VIGILANCE: River levels accelerating towards warning marks."
                : "BASELINE CONDITIONS: All hydrometric stations reporting normal river velocity."}
            </p>
          </div>
        </div>

        {/* Right: Hotline Speed Dials & Checklist Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="tel:1078"
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5 transition min-h-[38px]"
          >
            <span>NDRF 1078</span>
          </a>

          <a
            href="tel:1070"
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-sky-500/40 text-sky-300 font-mono text-xs font-bold flex items-center gap-1.5 transition min-h-[38px]"
          >
            <span>SDMA 1070</span>
          </a>

          <a
            href="tel:108"
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-rose-500/40 text-rose-300 font-mono text-xs font-bold flex items-center gap-1.5 transition min-h-[38px]"
          >
            <span>Ambulance 108</span>
          </a>

          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition min-h-[38px]"
          >
            <span>{isExpanded ? "Hide Actions" : "Ground Directives"}</span>
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
        <div className="p-3 sm:p-4 bg-slate-950/60 border-t border-slate-800/80">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Footprints className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                {t.actions.moveHighGround}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                <Ban className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                {t.actions.avoidBridges}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                <Radio className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                {t.actions.keepPhoneCharged}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}