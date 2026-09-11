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
  CheckCircle2,
  HelpCircle,
  Footprints,
  Ban,
  Radio,
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
      } है। आपके पास सुरक्षित स्थान पर जाने के लिए ${hours} घंटे और ${mins} मिनट का समय है। कृपया नदी किनारे से तुरंत हटकर ऊंचे स्थानों पर पहुंचे। किसी भी पुल या रपटे को पार न करें।`;
    } else {
      speechText = `Warning! Flash flood risk in ${activeZone.name} is ${riskPercent.toFixed(
        0
      )} percent. Alert level is ${activeZone.alertColor}. You have approximately ${hours} hours and ${mins} minutes of safe evacuation window. Move to higher ground immediately and stay off river bridges.`;
    }

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = language === "hi" ? "hi-IN" : "en-IN";
    utterance.rate = 0.95; // Slightly slower for crisp clarity

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
      className={`rounded-2xl border p-4 sm:p-5 shadow-xl transition-all ${
        isRed
          ? "bg-gradient-to-br from-rose-950/60 via-slate-950 to-slate-950 border-rose-500/50 shadow-rose-950/30"
          : isOrange
          ? "bg-gradient-to-br from-amber-950/50 via-slate-950 to-slate-950 border-amber-500/50 shadow-amber-950/30"
          : "bg-slate-950/80 border-slate-800"
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Big Audio Read-Aloud Button for non-readers */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <button
            onClick={handleSpeak}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-sm sm:text-base transition min-h-[52px] shadow-lg ${
              isSpeaking
                ? "bg-amber-500 text-slate-950 animate-pulse ring-4 ring-amber-400/30"
                : isRed
                ? "bg-rose-600 hover:bg-rose-500 text-white ring-4 ring-rose-500/20"
                : "bg-sky-600 hover:bg-sky-500 text-white"
            }`}
          >
            {isSpeaking ? (
              <>
                <VolumeX className="w-6 h-6 animate-spin" />
                <span>{t.listening}</span>
              </>
            ) : (
              <>
                <Volume2 className="w-6 h-6" />
                <span>{t.listenAlert}</span>
              </>
            )}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {t.plainLanguageSummaryTitle}
              </span>
            </div>
            <p className="text-sm font-semibold text-white mt-0.5">
              {isRed
                ? t.dangerNotice
                : isOrange
                ? t.warningNotice
                : t.safeNotice}
            </p>
          </div>
        </div>

        {/* Right: One-Click Emergency Hotlines */}
        <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1 mr-1">
            <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.emergencyHelplines}:</span>
          </span>

          <a
            href="tel:1078"
            className="px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition min-h-[44px]"
          >
            <span>🚨 {t.ndrfHelpline}</span>
          </a>

          <a
            href="tel:1070"
            className="px-3 py-1.5 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-500/40 text-sky-300 font-bold text-xs flex items-center gap-1.5 transition min-h-[44px]"
          >
            <span>🏛️ {t.sdmaHelpline}</span>
          </a>

          <a
            href="tel:108"
            className="px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition min-h-[44px]"
          >
            <span>🚑 {t.ambulanceHelpline}</span>
          </a>
        </div>
      </div>

      {/* 3-Step Simple Action Cards for Ground Level Users */}
      <div className="mt-4 pt-3.5 border-t border-slate-800/80">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 block">
          {t.actionNowTitle}
        </span>

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
    </div>
  );
}