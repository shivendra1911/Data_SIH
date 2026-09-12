"use client";

import React, { useState } from "react";
import { Language } from "@/lib/i18n";
import { HazardZone } from "@/lib/types";
import {
  Radio,
  Volume2,
  VolumeX,
  Clock,
  Waves,
  Truck,
  CloudSun,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

interface RadioWeatherBulletinProps {
  activeZone: HazardZone;
  language: Language;
}

export default function RadioWeatherBulletin({
  activeZone,
  language,
}: RadioWeatherBulletinProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const isRed = activeZone.alertColor === "RED";
  const hours = Math.floor(activeZone.leadTimeMinutes / 60);
  const mins = activeZone.leadTimeMinutes % 60;

  const bulletinEn = {
    title: "Regional Flood & Mountain Weather Audio Bulletin",
    time: "Latest Bulletin: 02:30 PM IST (Updated Hourly)",
    broadcaster: "All India Radio (Akashvani) & SDMA Disaster Desk",
    summary: `Attention mountain residents of ${activeZone.name}. Upper catchment peaks have recorded continuous precipitation and localized cryo-seismic tremors. River levels at the primary gauge are currently at ${activeZone.telemetry.river_level_m.toFixed(1)} meters and rising towards the danger threshold. Peak surge is estimated to arrive in approximately ${hours} hours and ${mins} minutes. Highway movement on low-lying river bridges has been restricted as a safety precaution. Please remain calm, do not approach riverbanks, and move to designated high-ground shelters if advised by local police loudspeakers.`,
    riverStatus: `River flowing at ${activeZone.telemetry.river_level_m.toFixed(1)}m (Danger Mark: ${activeZone.dangerMarkM}m).`,
    roadStatus: "NH-7 (Badrinath Highway) traffic regulated. Pilgrims advised to halt at safe stages.",
    weatherOutlook: "Intermittent mountain cloud cover and localized cloudburst potential in upper glaciers.",
  };

  const bulletinHi = {
    title: "दैनिक आकाशवाणी बाढ़ एवं मौसम बुलेटिन",
    time: "ताज़ा बुलेटिन: दोपहर 02:30 बजे (प्रति घंटा अपडेट)",
    broadcaster: "आकाशवाणी देहरादून एवं राज्य आपदा प्रबंधन प्राधिकरण (SDMA)",
    summary: `सावधान! ${activeZone.name} के सभी निवासियों और तीर्थयात्रियों के लिए विशेष सूचना। ऊपरी चोटियों पर बर्फ पिघलने और बारिश के कारण नदी का जलस्तर तेजी से बढ़ रहा है। वर्तमान में नदी ${activeZone.telemetry.river_level_m.toFixed(1)} मीटर पर बह रही है और अगले ${hours} घंटे ${mins} मिनट में तेज बहाव आने की संभावना है। नदी के किनारों पर जाना सख्त मना है। प्रशासन ने एहतियात के तौर पर निचले पुलों पर आवाजाही रोक दी है। अफवाहों पर ध्यान न दें और सुरक्षित स्थानों पर बने रहें।`,
    riverStatus: `नदी का वर्तमान स्तर: ${activeZone.telemetry.river_level_m.toFixed(1)} मीटर (खतरे का निशान: ${activeZone.dangerMarkM} मीटर)।`,
    roadStatus: "बद्रीनाथ राष्ट्रीय राजमार्ग (NH-7) पर एहतियातन ट्रैफिक रोका गया है।",
    weatherOutlook: "ऊपरी ग्लेशियर क्षेत्रों में घने बादल और तेज बौछारों की संभावना।",
  };

  const b = language === "hi" ? bulletinHi : bulletinEn;

  const handlePlayBulletin = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Audio speech is not supported in this browser.");
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(b.summary);
    utterance.lang = language === "hi" ? "hi-IN" : "en-IN";
    utterance.rate = 0.92; // Calm, clear pacing

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="tilt-card rounded-2xl bg-[#1b2027]/90 border border-white/10 p-5 sm:p-6 shadow-xl space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 text-white border border-white/15 flex items-center justify-center">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {b.title}
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/15">
                AIR BROADCAST
              </span>
            </h2>
            <p className="text-xs text-white/60 font-medium">{b.broadcaster}</p>
          </div>
        </div>

        {/* Listen Button */}
        <button
          onClick={handlePlayBulletin}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition min-h-[38px] shadow-sm self-start sm:self-auto ${
            isPlaying
              ? "bg-white/20 text-white border border-white/30"
              : "btn-solid-primary"
          }`}
        >
          {isPlaying ? (
            <>
              <VolumeX className="w-3.5 h-3.5" />
              <span>{language === "hi" ? "बुलेटिन रोकें" : "Stop Audio"}</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-[#161a20]" />
              <span>{language === "hi" ? "पूरा बुलेटिन सुनें" : "Listen to Radio Broadcast"}</span>
            </>
          )}
        </button>
      </div>

      {/* Spoken Summary Card */}
      <div className="p-4 rounded-xl bg-[#161a20]/80 border border-white/10 text-xs sm:text-sm text-white/80 leading-relaxed font-normal">
        <div className="text-[11px] font-mono text-white/60 mb-1.5 flex items-center gap-1.5 font-bold">
          <Clock className="w-3.5 h-3.5 text-white/50" />
          <span>{b.time}</span>
        </div>
        {b.summary}
      </div>

      {/* 3 Quick Status Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-[#161a20]/60 border border-white/10 flex items-start gap-2.5">
          <Waves className="w-4 h-4 text-white/60 shrink-0 mt-0.5" />
          <div>
            <span className="text-white/50 font-bold block text-[11px] uppercase">
              {language === "hi" ? "नदी स्थिति" : "River Gauge Status"}
            </span>
            <span className="text-white/85 font-medium">{b.riverStatus}</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#161a20]/60 border border-white/10 flex items-start gap-2.5">
          <Truck className="w-4 h-4 text-white/60 shrink-0 mt-0.5" />
          <div>
            <span className="text-white/50 font-bold block text-[11px] uppercase">
              {language === "hi" ? "सड़क व पुल" : "Road & Bridge Status"}
            </span>
            <span className="text-white/85 font-medium">{b.roadStatus}</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#161a20]/60 border border-white/10 flex items-start gap-2.5">
          <CloudSun className="w-4 h-4 text-white/60 shrink-0 mt-0.5" />
          <div>
            <span className="text-white/50 font-bold block text-[11px] uppercase">
              {language === "hi" ? "मौसम अनुमान" : "Weather Outlook"}
            </span>
            <span className="text-white/85 font-medium">{b.weatherOutlook}</span>
          </div>
        </div>
      </div>
    </div>
  );
}