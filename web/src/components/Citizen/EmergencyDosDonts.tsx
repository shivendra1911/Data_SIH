"use client";

import React, { useState } from "react";
import { Language } from "@/lib/i18n";
import {
  CheckCircle2,
  XCircle,
  AlertOctagon,
  ShieldCheck,
  Footprints,
  Ban,
  Radio,
  BatteryCharging,
  Car,
  Camera,
  Zap,
  Droplets,
  PackageCheck,
  HelpCircle,
} from "lucide-react";

interface EmergencyDosDontsProps {
  language: Language;
}

export default function EmergencyDosDonts({ language }: EmergencyDosDontsProps) {
  const [activeTab, setActiveTab] = useState<"ALL" | "DOS" | "DONTS">("ALL");

  const dos = [
    {
      id: "do-1",
      icon: <Footprints className="w-5 h-5 text-emerald-400" />,
      titleEn: "Move to Higher Ground Immediately",
      titleHi: "तुरंत ऊंचे स्थानों और पहाड़ियों की ओर जाएं",
      descEn: "If you hear a roaring sound or see river water turning muddy, do not wait for official announcements. Walk uphill towards village helipads or designated schools above 100m from the river.",
      descHi: "यदि नदी में गड़गड़ाहट की आवाज आए या पानी अचानक मटमैला होने लगे, तो किसी घोषणा का इंतजार न करें। तुरंत नदी किनारे से 100 मीटर ऊपर गांव के हेलीपैड या पक्के स्कूल की ओर जाएं।",
      urgency: "HIGH",
    },
    {
      id: "do-2",
      icon: <PackageCheck className="w-5 h-5 text-emerald-400" />,
      titleEn: "Pack a Waterproof Emergency Survival Bag",
      titleHi: "वॉटरप्रूफ थैले में जरूरी सामान पैक रखें",
      descEn: "Keep Aadhaar/voter ID, dry food (chana/biscuits), clean water bottle, emergency medicines, torch, and power bank in a sealed plastic bag.",
      descHi: "पहचान पत्र (आधार कार्ड), सूखा राशन (चना, बिस्कुट), पीने का पानी, जरूरी दवाएं, टॉर्च और पावर बैंक को एक वाटरप्रूफ प्लास्टिक थैली में तैयार रखें।",
      urgency: "ESSENTIAL",
    },
    {
      id: "do-3",
      icon: <Radio className="w-5 h-5 text-emerald-400" />,
      titleEn: "Tune to Radio & Official Loudspeakers",
      titleHi: "रेडियो व पुलिस लाउडस्पीकर की सूचना सुनें",
      descEn: "Listen to All India Radio (Akashvani) or village loudspeaker announcements. Do not spread unverified WhatsApp rumors.",
      descHi: "आकाशवाणी रेडियो या स्थानीय पुलिस/प्रशासन के लाउडस्पीकर से मिलने वाले निर्देशों को ही सही मानें। व्हाट्सएप की अफवाहों पर भरोसा न करें।",
      urgency: "IMPORTANT",
    },
    {
      id: "do-4",
      icon: <Droplets className="w-5 h-5 text-emerald-400" />,
      titleEn: "Boil Drinking Water Before Consuming",
      titleHi: "पीने का पानी हमेशा उबाल कर पिएं",
      descEn: "Flood water contaminates mountain natural springs (Dhara/Naula). Drink only boiled water or water distributed by relief camps to prevent cholera and fever.",
      descHi: "बाढ़ के दौरान प्राकृतिक धारे और नौलों का पानी दूषित हो जाता है। हैजा और बुखार से बचने के लिए पानी उबाल कर ही पिएं।",
      urgency: "HEALTH",
    },
  ];

  const donts = [
    {
      id: "dont-1",
      icon: <Car className="w-5 h-5 text-rose-400" />,
      titleEn: "NEVER Drive Across Flooded Bridges or Roads",
      titleHi: "बाढ़ वाले पुलों और रपटों पर वाहन कभी न ले जाएं",
      descEn: "Just 6 inches of fast-flowing water can sweep a car or motorcycle off mountain roads. If water is flowing over a causeway or bridge, stop and turn around.",
      descHi: "पहाड़ी सड़कों पर सिर्फ 6 इंच तेज बहता पानी भी गाड़ी या बाइक को खाई में बहा सकता है। यदि पुलिया के ऊपर से पानी बह रहा हो तो पार करने की गलती कतई न करें।",
      danger: "FATAL",
    },
    {
      id: "dont-2",
      icon: <Camera className="w-5 h-5 text-rose-400" />,
      titleEn: "Do NOT Stand on Riverbanks for Photos/Videos",
      titleHi: "नदी किनारे रील, फोटो या वीडियो बनाने न जाएं",
      descEn: "Riverbanks erode from underneath (toe erosion) and can collapse into the raging river without a second of warning. Keep children strictly away.",
      descHi: "नदी के किनारे नीचे से कट जाते हैं और बिना किसी चेतावनी के अचानक ढह जाते हैं। रील या फोटो खींचने के लिए नदी किनारे जाना जानलेवा है।",
      danger: "EXTREME",
    },
    {
      id: "dont-3",
      icon: <Zap className="w-5 h-5 text-rose-400" />,
      titleEn: "Do NOT Touch Fallen Electric Poles or Wires",
      titleHi: "टूटे हुए बिजली के खंभों व तारों को हाथ न लगाएं",
      descEn: "Floods and landslides snap high-voltage wires into wet mud, creating deadly ground currents. Stay at least 15 meters away.",
      descHi: "बाढ़ में टूटे हुए बिजली के तार गीली जमीन में करंट फैला सकते हैं। किसी भी टूटे तार या पोल से कम से कम 15 मीटर की दूरी बनाए रखें।",
      danger: "ELECTROCUTION",
    },
    {
      id: "dont-4",
      icon: <Ban className="w-5 h-5 text-rose-400" />,
      titleEn: "Do NOT Take Shelter in Basements or Tin Sheds",
      titleHi: "तहखानों या कमजोर टीन शेड में शरण न लें",
      descEn: "Basements flood within 90 seconds in a flash flood. Always evacuate to RCC concrete multi-story buildings or open hill ridges.",
      descHi: "अचानक आई बाढ़ में बेसमेंट/तहखाने 2 मिनट में पानी से भर जाते हैं। हमेशा पक्के कंक्रीट भवनों या खुली ऊंची पहाड़ी पर शरण लें।",
      danger: "TRAPPED",
    },
  ];

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              {language === "hi"
                ? "बाढ़ से बचाव: क्या करें और क्या न करें"
                : "Flood Safety Guide: Visual Do's & Don'ts"}
            </h2>
            <p className="text-xs text-slate-400">
              {language === "hi"
                ? "पहाड़ी क्षेत्रों में रहने वाले परिवारों और यात्रियों के लिए जीवन रक्षक नियम"
                : "Life-saving practical rules for mountain residents, pilgrims, and families"}
            </p>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition min-h-[36px] ${
              activeTab === "ALL"
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {language === "hi" ? "सभी नियम" : "All Rules"}
          </button>
          <button
            onClick={() => setActiveTab("DOS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition min-h-[36px] flex items-center gap-1 ${
              activeTab === "DOS"
                ? "bg-emerald-600 text-white"
                : "text-emerald-400 hover:text-emerald-300"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{language === "hi" ? "क्या करें (Do's)" : "Do's"}</span>
          </button>
          <button
            onClick={() => setActiveTab("DONTS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition min-h-[36px] flex items-center gap-1 ${
              activeTab === "DONTS"
                ? "bg-rose-600 text-white"
                : "text-rose-400 hover:text-rose-300"
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>{language === "hi" ? "क्या न करें (Don'ts)" : "Don'ts"}</span>
          </button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* DOs Section */}
        {(activeTab === "ALL" || activeTab === "DOS") && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" />
              <span>{language === "hi" ? "ये अवश्य करें (Safe Actions)" : "Safe Actions You Must Take"}</span>
            </div>

            <div className="space-y-2.5">
              {dos.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 hover:border-emerald-500/50 transition-all space-y-1.5"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-emerald-900/40 border border-emerald-500/40 shrink-0">
                      {item.icon}
                    </div>
                    <h3 className="text-sm font-bold text-emerald-200">
                      {language === "hi" ? item.titleHi : item.titleEn}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300 pl-10 leading-relaxed font-normal">
                    {language === "hi" ? item.descHi : item.descEn}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DONTs Section */}
        {(activeTab === "ALL" || activeTab === "DONTS") && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm uppercase tracking-wider">
              <XCircle className="w-4 h-4" />
              <span>{language === "hi" ? "ये भूलकर भी न करें (Dangerous Actions)" : "Dangerous Actions To Avoid"}</span>
            </div>

            <div className="space-y-2.5">
              {donts.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 hover:border-rose-500/50 transition-all space-y-1.5"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-rose-900/40 border border-rose-500/40 shrink-0">
                      {item.icon}
                    </div>
                    <h3 className="text-sm font-bold text-rose-200">
                      {language === "hi" ? item.titleHi : item.titleEn}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300 pl-10 leading-relaxed font-normal">
                    {language === "hi" ? item.descHi : item.descEn}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}