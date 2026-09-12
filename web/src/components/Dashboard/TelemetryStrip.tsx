"use client";

import React from "react";
import Link from "next/link";
import { HazardZone } from "@/lib/types";
import { Mountain, Compass, Users, ArrowRight } from "lucide-react";

import { EnvironmentalTelemetry } from "@/lib/aiEngine";

interface TelemetryStripProps {
  activeZone: HazardZone;
  riskPercent: number;
  liveTelemetry?: EnvironmentalTelemetry | null;
  isLiveInternet?: boolean;
}

export default function TelemetryStrip({ activeZone, riskPercent, liveTelemetry, isLiveInternet = true }: TelemetryStripProps) {
  const telemetry = liveTelemetry || activeZone.telemetry || {
    rainfall_mm: 0.0,
    soil_moisture_pct: 45.0,
    slope_deg: 15.0,
    river_level_m: 1.5,
    seismic_mag: 0.0,
  };

  const isSeismicActive = telemetry.seismic_mag >= 3.0;

  return (
    <div className="w-full bg-transparent px-4 sm:px-6 lg:px-8 py-3 text-slate-900 font-sans">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[1800px] mx-auto">

        {/* 1. Live Flood Radar Map Navigation Card */}
        <Link
          href="/radar"
          className="p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-white/80 hover:border-slate-300 transition flex items-center justify-between group shadow-xl text-slate-900 min-h-[96px]"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#faf9f5] text-slate-950 border border-slate-200 flex items-center justify-center group-hover:scale-105 transition shadow-2xs shrink-0">
              <Compass className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-950 flex items-center gap-2 font-display">
                <span>Live Flood Radar Map</span>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 uppercase tracking-wider">
                  LIVE GIS
                </span>
              </h2>
              <p className="text-xs text-slate-600 mt-0.5 font-medium line-clamp-1">
                View satellite imagery, real river heights, and verified safe evacuation shelters
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-500 group-hover:translate-x-1 transition shrink-0 ml-2" />
        </Link>

        {/* 2. Citizen Rescue & SOS Hub Navigation Card */}
        <Link
          href="/rescue"
          className="p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-white/80 hover:border-slate-300 transition flex items-center justify-between group shadow-xl text-slate-900 min-h-[96px]"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#faf9f5] text-slate-950 border border-slate-200 flex items-center justify-center group-hover:scale-105 transition shadow-2xs shrink-0">
              <Users className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-950 flex items-center gap-2 font-display">
                <span>Citizen Rescue &amp; SOS Hub</span>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-300 uppercase tracking-wider">
                  LIVE SOS
                </span>
              </h2>
              <p className="text-xs text-slate-600 mt-0.5 font-medium line-clamp-1">
                Live mobile distress beacons, medical emergencies, and local rescue team dispatch
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-500 group-hover:translate-x-1 transition shrink-0 ml-2" />
        </Link>

        {/* 3. Mountain Slope & Ground Stability */}
        <div className="p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-white/80 hover:border-white transition flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                🏔️ Hill Slope & Ground
              </span>
              <span
                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  isSeismicActive
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : telemetry.soil_moisture_pct >= 75
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                }`}
              >
                {isSeismicActive
                  ? "Seismic Shock"
                  : telemetry.soil_moisture_pct >= 75
                  ? "Saturated Soil"
                  : "Stable Ground"}
              </span>
            </div>
            <div className="text-2xl font-black text-slate-950 flex items-baseline gap-1.5 font-display">
              {telemetry.slope_deg.toFixed(1)}°
              <span className="text-xs font-normal text-slate-500">
                Incline • {telemetry.soil_moisture_pct.toFixed(0)}% Moisture
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              {isSeismicActive
                ? `Tremor detected: Mag ${telemetry.seismic_mag.toFixed(1)} recorded via USGS`
                : telemetry.soil_moisture_pct >= 75
                ? "High water saturation increases mudslide risk"
                : "Geological stability normal • Zero active tremors detected"}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#faf9f5] border border-slate-200 flex items-center justify-center shrink-0">
            <Mountain className={`w-6 h-6 ${isSeismicActive ? "text-red-600 animate-pulse" : "text-slate-700"}`} />
          </div>
        </div>

      </div>
    </div>
  );
}
