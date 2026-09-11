"use client";

import React, { useState } from "react";
import { Language } from "@/lib/i18n";
import {
  Tent,
  PhoneCall,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Users,
  Utensils,
  Stethoscope,
  Zap,
  ExternalLink,
} from "lucide-react";

interface ReliefCampDirectoryProps {
  language: Language;
}

interface ReliefCamp {
  id: string;
  nameEn: string;
  nameHi: string;
  locationEn: string;
  locationHi: string;
  elevation: string;
  totalCapacity: number;
  availableBeds: number;
  foodAvailable: boolean;
  medicalDoctor: boolean;
  generatorPower: boolean;
  inchargeName: string;
  phone: string;
}

const CAMPS: ReliefCamp[] = [
  {
    id: "camp-1",
    nameEn: "Joshimath Helipad High-Ground Shelter",
    nameHi: "जोशीमठ हेलीपैड उच्च-भूमि राहत शिविर",
    locationEn: "Upper Joshimath Ridge (Above Alaknanda River)",
    locationHi: "ऊपरी जोशीमठ पहाड़ी (अलकनंदा नदी से 350 मीटर ऊपर)",
    elevation: "1,890m",
    totalCapacity: 600,
    availableBeds: 240,
    foodAvailable: true,
    medicalDoctor: true,
    generatorPower: true,
    inchargeName: "Capt. R. S. Rawat (SDRF)",
    phone: "+919876543210",
  },
  {
    id: "camp-2",
    nameEn: "Govindghat Gurdwara Emergency Relief Hall",
    nameHi: "गोविंदघाट गुरुद्वारा आपातकालीन लंगर व राहत भवन",
    locationEn: "Govindghat High Concrete Complex",
    locationHi: "गोविंदघाट पक्का गुरुद्वारा परिसर",
    elevation: "1,820m",
    totalCapacity: 1000,
    availableBeds: 520,
    foodAvailable: true,
    medicalDoctor: true,
    generatorPower: true,
    inchargeName: "S. Baljit Singh (Volunteer Incharge)",
    phone: "+919876543211",
  },
  {
    id: "camp-3",
    nameEn: "Gaurikund Government Inter College Shelter",
    nameHi: "गौरीकुंड राजकीय इंटर कॉलेज सुरक्षित शिविर",
    locationEn: "Gaurikund Village Plateau",
    locationHi: "गौरीकुंड पठार, मंदाकिनी घाटी",
    elevation: "1,980m",
    totalCapacity: 450,
    availableBeds: 180,
    foodAvailable: true,
    medicalDoctor: true,
    generatorPower: true,
    inchargeName: "Dr. Deepa Joshi (CMO Team)",
    phone: "+919876543212",
  },
  {
    id: "camp-4",
    nameEn: "Tapovan High School Shelter",
    nameHi: "तपोवन राजकीय उच्च प्राथमिक विद्यालय",
    locationEn: "Dhauliganga Valley Upper Terrace",
    locationHi: "धौलीगंगा घाटी ऊपरी छोर",
    elevation: "1,950m",
    totalCapacity: 350,
    availableBeds: 110,
    foodAvailable: true,
    medicalDoctor: false,
    generatorPower: true,
    inchargeName: "Naib Tehsildar V. Negi",
    phone: "+919876543213",
  },
];

export default function ReliefCampDirectory({ language }: ReliefCampDirectoryProps) {
  const [selectedFilter, setSelectedFilter] = useState<"ALL" | "DOCTOR" | "BEDS">("ALL");

  const filteredCamps = CAMPS.filter((c) => {
    if (selectedFilter === "DOCTOR") return c.medicalDoctor;
    if (selectedFilter === "BEDS") return c.availableBeds > 150;
    return true;
  });

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
            <Tent className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              {language === "hi"
                ? "निकटतम राहत शिविर एवं सुरक्षित स्थान"
                : "Safe Relief Shelters & Muster Centers"}
            </h2>
            <p className="text-xs text-slate-400">
              {language === "hi"
                ? "निशुल्क भोजन, पीने का पानी, बिस्तर व प्राथमिक चिकित्सा सहायता केंद्र"
                : "Free food, clean water, beds, and medical aid provided by District Administration"}
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setSelectedFilter("ALL")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition min-h-[36px] ${
              selectedFilter === "ALL" ? "bg-slate-800 text-white" : "text-slate-400"
            }`}
          >
            {language === "hi" ? "सभी शिविर" : "All Camps"}
          </button>
          <button
            onClick={() => setSelectedFilter("DOCTOR")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition min-h-[36px] ${
              selectedFilter === "DOCTOR" ? "bg-emerald-600 text-white" : "text-emerald-400"
            }`}
          >
            {language === "hi" ? "🩺 डॉक्टर उपलब्ध" : "🩺 Doctor Available"}
          </button>
          <button
            onClick={() => setSelectedFilter("BEDS")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition min-h-[36px] ${
              selectedFilter === "BEDS" ? "bg-sky-600 text-white" : "text-sky-400"
            }`}
          >
            {language === "hi" ? "🛏️ अधिक बिस्तर खाली" : "🛏️ Beds > 150"}
          </button>
        </div>
      </div>

      {/* Camps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCamps.map((camp) => (
          <div
            key={camp.id}
            className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white">
                  {language === "hi" ? camp.nameHi : camp.nameEn}
                </h3>
                <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{language === "hi" ? camp.locationHi : camp.locationEn}</span>
                </div>
                <div className="text-[11px] font-mono text-cyan-400 mt-0.5">
                  {language === "hi" ? "ऊंचाई:" : "Elevation:"} {camp.elevation} (
                  {language === "hi" ? "सुरक्षित उच्च भूमि" : "Safe High Ground"})
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-base font-black font-mono text-emerald-400">
                  {camp.availableBeds}
                </span>
                <span className="text-[10px] text-slate-400 block uppercase">
                  {language === "hi" ? "बिस्तर खाली" : "Beds Free"}
                </span>
              </div>
            </div>

            {/* Facilities Badges */}
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-medium">
                <Utensils className="w-3 h-3 text-emerald-400" />
                <span>{language === "hi" ? "गर्म भोजन व पानी" : "Free Food & Water"}</span>
              </span>

              {camp.medicalDoctor && (
                <span className="px-2 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-500/30 flex items-center gap-1 font-medium">
                  <Stethoscope className="w-3 h-3 text-sky-400" />
                  <span>{language === "hi" ? "चिकित्सक मौजूद" : "Medical Doctor"}</span>
                </span>
              )}

              {camp.generatorPower && (
                <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-medium">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>{language === "hi" ? "बिजली जनरेटर" : "Power Generator"}</span>
                </span>
              )}
            </div>

            {/* Incharge & Direct Call Button */}
            <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
              <div className="text-xs text-slate-300">
                <span className="text-slate-500 text-[11px] block">
                  {language === "hi" ? "शिविर प्रभारी:" : "Camp Incharge:"}
                </span>
                <strong className="text-white font-medium">{camp.inchargeName}</strong>
              </div>

              <a
                href={`tel:${camp.phone}`}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition min-h-[44px]"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>{language === "hi" ? "कॉल करें" : "Call Incharge"}</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}