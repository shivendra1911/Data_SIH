"use client";

import React, { useState } from "react";
import { Language, translations } from "@/lib/i18n";
import { HazardZone } from "@/lib/types";
import EmergencyDosDonts from "./EmergencyDosDonts";
import ReliefCampDirectory from "./ReliefCampDirectory";
import RadioWeatherBulletin from "./RadioWeatherBulletin";
import WebSOSRequestModal from "./WebSOSRequestModal";
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Clock,
  PhoneCall,
  Tent,
  Radio,
  LifeBuoy,
  BookOpen,
  Send,
} from "lucide-react";

interface CitizenSafetyHubProps {
  activeZone: HazardZone;
  riskPercent: number;
  language: Language;
  onSuccessSOS: (event: any) => void;
}

export default function CitizenSafetyHub({
  activeZone,
  riskPercent,
  language,
  onSuccessSOS,
}: CitizenSafetyHubProps) {
  const [isSOSModalOpen, setIsSOSModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"BULLETIN" | "CAMPS" | "DOS_DONTS">("BULLETIN");

  const isRed = riskPercent >= 75;
  const isOrange = riskPercent >= 55 && !isRed;
  const hours = Math.floor(activeZone.leadTimeMinutes / 60);
  const mins = activeZone.leadTimeMinutes % 60;

  return (
    <div className="space-y-5">
      {/* 1. Big "Am I Safe Right Now?" Status Banner */}
      <div
        className={`rounded-2xl p-5 sm:p-6 border shadow-2xl transition-all ${
          isRed
            ? "bg-gradient-to-r from-red-950 via-rose-950 to-slate-950 border-rose-500 shadow-rose-950/50 text-white"
            : isOrange
            ? "bg-gradient-to-r from-amber-950 via-yellow-950 to-slate-950 border-amber-500 shadow-amber-950/50 text-white"
            : "bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 border-emerald-500 shadow-emerald-950/50 text-white"
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                isRed
                  ? "bg-rose-600 text-white animate-bounce"
                  : isOrange
                  ? "bg-amber-500 text-slate-950"
                  : "bg-emerald-500 text-white"
              }`}
            >
              {isRed ? (
                <AlertOctagon className="w-8 h-8" />
              ) : isOrange ? (
                <AlertTriangle className="w-8 h-8" />
              ) : (
                <ShieldCheck className="w-8 h-8" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/40 border border-white/20">
                  {language === "hi" ? "आपकी वर्तमान सुरक्षा स्थिति" : "Your Current Safety Status"}
                </span>
                <span className="text-xs font-mono opacity-80">{activeZone.name}</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                {isRed
                  ? language === "hi"
                    ? "🔴 अत्यंत गंभीर चेतावनी: तुरंत सुरक्षित स्थान पर जाएं!"
                    : "🔴 CRITICAL DANGER: Evacuate Uphill Immediately!"
                  : isOrange
                  ? language === "hi"
                    ? "🟠 सतर्क रहें: नदी का जलस्तर बढ़ रहा है, जरूरी सामान बांधें!"
                    : "🟠 HIGH ALERT: River Rising, Prepare to Evacuate!"
                  : language === "hi"
                  ? "🟢 आप सुरक्षित हैं: नदी का जलस्तर सामान्य है।"
                  : "🟢 YOU ARE SAFE: River is within normal baseline."}
              </h2>

              <p className="text-xs sm:text-sm opacity-90 leading-relaxed max-w-2xl font-normal">
                {isRed
                  ? language === "hi"
                    ? `अगले ${hours} घंटे ${mins} मिनट में नदी में प्रचंड बहाव आने का अनुमान है। नदी किनारे और निचले पुलों से कम से कम 100 मीटर दूर ऊंचे राहत शिविर में पहुंचे।`
                    : `Peak flood surge predicted to arrive in approximately ${hours}h ${mins}m. Move at least 100 meters above the river to designated high-ground shelters.`
                  : isOrange
                  ? language === "hi"
                    ? `नदी का पानी लगातार बढ़ रहा है। जरूरी दस्तावेज, दवाएं और पानी का थैला तैयार रखें और ऊंचे स्थानों की ओर ध्यान रखें।`
                    : `Water levels are rising fast. Keep emergency bags packed and stay alert for loudspeaker announcements.`
                  : language === "hi"
                  ? "वर्तमान में कोई बाढ़ का खतरा नहीं है। आप सामान्य दिनचर्या जारी रख सकते हैं।"
                  : "No immediate flood hazard in this valley. Normal activities may continue."}
              </p>
            </div>
          </div>

          {/* Right Action: Request Direct Web SOS */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-2 shrink-0">
            <button
              onClick={() => setIsSOSModalOpen(true)}
              className="px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-rose-950 transition min-h-[48px]"
            >
              <LifeBuoy className="w-5 h-5 animate-spin" />
              <span>
                {language === "hi" ? "आपातकालीन मदद मांगें (SOS)" : "Request Direct Rescue (SOS)"}
              </span>
            </button>
            <span className="text-[11px] opacity-75 text-center lg:text-right">
              {language === "hi" ? "बिना ऐप के सीधा कंट्रोल रूम को संदेश" : "Direct beacon to NDRF Control Room"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs for Citizen Guidance */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("BULLETIN")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition min-h-[44px] whitespace-nowrap ${
            activeTab === "BULLETIN"
              ? "bg-cyan-600 text-white shadow-lg shadow-cyan-950"
              : "bg-slate-900 text-slate-400 hover:text-white"
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>{language === "hi" ? "📻 दैनिक आकाशवाणी बुलेटिन" : "📻 Daily Radio Bulletin"}</span>
        </button>

        <button
          onClick={() => setActiveTab("CAMPS")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition min-h-[44px] whitespace-nowrap ${
            activeTab === "CAMPS"
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950"
              : "bg-slate-900 text-slate-400 hover:text-white"
          }`}
        >
          <Tent className="w-4 h-4" />
          <span>{language === "hi" ? "⛺ राहत शिविर व भोजन केंद्र" : "⛺ Safe Shelters & Food"}</span>
        </button>

        <button
          onClick={() => setActiveTab("DOS_DONTS")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition min-h-[44px] whitespace-nowrap ${
            activeTab === "DOS_DONTS"
              ? "bg-amber-600 text-white shadow-lg shadow-amber-950"
              : "bg-slate-900 text-slate-400 hover:text-white"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>{language === "hi" ? "📋 क्या करें और क्या न करें" : "📋 Do's & Don'ts Guide"}</span>
        </button>
      </div>

      {/* 3. Tab Content Display */}
      {activeTab === "BULLETIN" && (
        <RadioWeatherBulletin activeZone={activeZone} language={language} />
      )}

      {activeTab === "CAMPS" && (
        <ReliefCampDirectory language={language} />
      )}

      {activeTab === "DOS_DONTS" && (
        <EmergencyDosDonts language={language} />
      )}

      {/* Web SOS Modal */}
      <WebSOSRequestModal
        isOpen={isSOSModalOpen}
        onClose={() => setIsSOSModalOpen(false)}
        activeZone={activeZone}
        language={language}
        onSuccessSOS={onSuccessSOS}
      />
    </div>
  );
}