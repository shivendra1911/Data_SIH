"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HazardZone } from "@/lib/types";
import { INDIA_FLOOD_ZONES } from "@/lib/constants";
import {
  ShieldAlert,
  MapPin,
  Radio,
  Smartphone,
  Satellite,
  ChevronDown,
  Compass,
  Users,
  BellRing,
  Plus,
  ExternalLink,
  Phone,
  AlertTriangle,
  Zap,
  Shield,
  Megaphone,
  Navigation,
  Volume2,
  VolumeX,
} from "lucide-react";
import AddButtonModal, {
  CustomActionButton,
  getStoredCustomButtons,
} from "./AddButtonModal";
import CommandFAB, { FabAction } from "./CommandFAB";

interface HeaderProps {
  selectedZone: HazardZone;
  onSelectZone: (zone: HazardZone) => void;
  onSimulateSOS?: () => void;
  onOpenMobileModal: () => void;
  onOpenRegionalBroadcast?: () => void;
  onOpenSafeRoutesGuidelines?: () => void;
  onDetectLiveLocation?: () => void;
  floodRiskPercent: number;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  isMobileSirenActive?: boolean;
  onToggleMobileSiren?: () => void;
  connectedMobileCount?: number;
}

function getCustomIcon(name: string) {
  switch (name) {
    case "Phone":
      return <Phone className="w-3.5 h-3.5" />;
    case "AlertTriangle":
      return <AlertTriangle className="w-3.5 h-3.5" />;
    case "Radio":
      return <Radio className="w-3.5 h-3.5" />;
    case "Megaphone":
      return <Megaphone className="w-3.5 h-3.5" />;
    case "Shield":
      return <Shield className="w-3.5 h-3.5" />;
    case "Zap":
      return <Zap className="w-3.5 h-3.5" />;
    case "ExternalLink":
    default:
      return <ExternalLink className="w-3.5 h-3.5" />;
  }
}

// Maps a custom button's saved color to a CommandFAB tone so it renders
// consistent with every other action in the expandable menu.
function customColorToTone(color: string): FabAction["tone"] {
  switch (color) {
    case "red":
      return "danger";
    case "emerald":
      return "success";
    case "blue":
      return "blue";
    case "amber":
      return "amber";
    case "slate":
    default:
      return "dark";
  }
}

export default function Header({
  selectedZone,
  onSelectZone,
  onSimulateSOS,
  onOpenMobileModal,
  onOpenRegionalBroadcast,
  onOpenSafeRoutesGuidelines,
  onDetectLiveLocation,
  floodRiskPercent,
  soundEnabled,
  onToggleSound,
  isMobileSirenActive = false,
  onToggleMobileSiren,
  connectedMobileCount,
}: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAddButtonModalOpen, setIsAddButtonModalOpen] = useState(false);
  const [customButtons, setCustomButtons] = useState<CustomActionButton[]>([]);
  const [activeScreenAlert, setActiveScreenAlert] = useState<string | null>(null);

  // Load and listen for custom buttons
  useEffect(() => {
    setCustomButtons(getStoredCustomButtons());
    const handleUpdate = () => {
      setCustomButtons(getStoredCustomButtons());
    };
    window.addEventListener("custom_action_buttons_changed", handleUpdate);
    return () => window.removeEventListener("custom_action_buttons_changed", handleUpdate);
  }, []);

  const handleExecuteCustomButton = (btn: CustomActionButton) => {
    if (btn.actionType === "LINK") {
      let url = btn.value.trim();
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } else if (btn.actionType === "CALL") {
      window.location.href = `tel:${btn.value.replace(/[^0-9+]/g, "")}`;
    } else if (btn.actionType === "ALERT") {
      setActiveScreenAlert(btn.value);
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
      } catch {}
      setTimeout(() => setActiveScreenAlert(null), 8000);
    }
  };

  const isDanger = floodRiskPercent >= 70;
  const isWarning = floodRiskPercent >= 35 && floodRiskPercent < 70;

  // Build the single consolidated action list for the floating command menu.
  // Every button that used to compete for space in the header row now lives
  // here, reachable from one always-visible floating trigger.
  const fabActions: FabAction[] = [];

  if (onOpenRegionalBroadcast) {
    fabActions.push({
      id: "zone-broadcast",
      label: "Zone Broadcast",
      icon: <Radio className="w-3.5 h-3.5" />,
      onClick: onOpenRegionalBroadcast,
      tone: "default",
    });
  }

  if (onOpenSafeRoutesGuidelines) {
    fabActions.push({
      id: "safe-shelters",
      label: "Safe Shelters",
      icon: <Compass className="w-3.5 h-3.5" />,
      onClick: onOpenSafeRoutesGuidelines,
      tone: "default",
    });
  }

  fabActions.push({
    id: "mobile-apks",
    label: "Mobile APKs",
    icon: <Smartphone className="w-3.5 h-3.5" />,
    onClick: onOpenMobileModal,
    tone: "default",
    badge: connectedMobileCount !== undefined ? connectedMobileCount : undefined,
  });

  if (onDetectLiveLocation) {
    fabActions.push({
      id: "use-my-location",
      label: "Use My Location",
      icon: <Navigation className="w-3.5 h-3.5" />,
      onClick: onDetectLiveLocation,
      tone: "default",
    });
  }

  if (onToggleSound) {
    fabActions.push({
      id: "toggle-sound",
      label: soundEnabled === false ? "Alert Sound: Off" : "Alert Sound: On",
      icon:
        soundEnabled === false ? (
          <VolumeX className="w-3.5 h-3.5" />
        ) : (
          <Volume2 className="w-3.5 h-3.5" />
        ),
      onClick: onToggleSound,
      tone: "default",
    });
  }

  if (onToggleMobileSiren) {
    fabActions.push({
      id: "mobile-siren",
      label: isMobileSirenActive ? "Mobile Siren Active" : "Mobile Siren Standby",
      icon: <BellRing className="w-3.5 h-3.5" />,
      onClick: onToggleMobileSiren,
      tone: isMobileSirenActive ? "danger" : "dark",
      title: isMobileSirenActive ? "Siren Active on Citizen APKs" : "Arm Mobile Siren Dispatch",
    });
  }

  if (onSimulateSOS) {
    fabActions.push({
      id: "simulate-sos",
      label: "Test Alert Sound",
      icon: <Zap className="w-3.5 h-3.5" />,
      onClick: onSimulateSOS,
      tone: "default",
    });
  }

  customButtons.forEach((btn) => {
    fabActions.push({
      id: btn.id,
      label: btn.label,
      icon: getCustomIcon(btn.iconName),
      onClick: () => handleExecuteCustomButton(btn),
      tone: customColorToTone(btn.color),
      title: `${btn.actionType}: ${btn.value}`,
    });
  });

  fabActions.push({
    id: "add-button",
    label: "Add Button",
    icon: <Plus className="w-3.5 h-3.5" />,
    onClick: () => setIsAddButtonModalOpen(true),
    tone: "default",
    title: "Add any custom action button to the command menu",
  });

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08)]">
      {/* Active Screen Alert Notification */}
      {activeScreenAlert && (
        <div className="bg-red-600 text-white px-4 py-2 text-xs font-extrabold flex items-center justify-between border-b border-red-700 animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-300" />
            <span>{activeScreenAlert}</span>
          </div>
          <button
            onClick={() => setActiveScreenAlert(null)}
            className="px-2 py-0.5 rounded bg-red-800 hover:bg-red-900 text-white text-[10px] uppercase font-mono"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Command Bar */}
      <div className="px-3 sm:px-6 py-2.5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-transparent">
        {/* LEFT: Branding + Basin Selector */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Logo & National Command Title */}
          <Link
            href="/"
            className="flex items-center gap-2 sm:gap-2.5 group"
            aria-label="NeerNetra Home - Early Flood Warning"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm tracking-tight border border-slate-900 shadow-sm transition group-hover:bg-black">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-sm sm:text-base tracking-tight text-slate-950 leading-tight">
                NEERNETRA
              </span>
              <span className="text-[10px] font-extrabold text-slate-600 tracking-wider uppercase leading-none mt-0.5">
                Govt of India
              </span>
            </div>
          </Link>

          {/* Basin & Location Selector Dropdown */}
          <div className="relative flex items-center ml-1 sm:ml-3">
            <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" aria-hidden />
            <select
              id="header-zone-select"
              value={selectedZone.id}
              onChange={(e) => {
                const zone = INDIA_FLOOD_ZONES.find((z) => z.id === e.target.value);
                if (zone) onSelectZone(zone);
              }}
              aria-label="Select river basin"
              className="bg-[#faf9f5] text-slate-900 text-xs font-bold pl-8 pr-8 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs cursor-pointer appearance-none hover:border-slate-400 transition"
            >
              <optgroup label="All-India River Basins">
                {INDIA_FLOOD_ZONES.map((zone) => (
                  <option key={zone.id} value={zone.id} className="bg-white text-slate-900">
                    {zone.name.split("(")[0].trim()} ({zone.district})
                  </option>
                ))}
              </optgroup>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-3 pointer-events-none" aria-hidden />
          </div>

          {/* Color-Coded Risk Badge: Red >= 70%, Yellow 35-69%, Green < 35% */}
          <span
            className={`text-[11px] font-black px-3 py-1 rounded-xl uppercase tracking-wider ${
              isDanger
                ? "bg-red-50 text-red-700 border border-red-300 animate-pulse"
                : isWarning
                ? "bg-amber-50 text-amber-800 border border-amber-300"
                : "bg-emerald-50 text-emerald-800 border border-emerald-300"
            }`}
          >
            {isDanger ? "🚨 High Alert" : isWarning ? "⚠️ Warning" : "✅ Safe"} {floodRiskPercent.toFixed(0)}%
          </span>
        </div>

        {/* CENTER: Screen Navigation Dropdown Box */}
        <div className="relative flex items-center self-center">
          <div className="relative flex items-center bg-[#faf9f5] hover:bg-slate-100 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 transition shadow-2xs group focus-within:ring-2 focus-within:ring-slate-900 min-h-[44px]">
            {pathname === "/radar" ? (
              <Compass className="w-4 h-4 text-slate-800 shrink-0 mr-2" aria-hidden />
            ) : pathname === "/rescue" ? (
              <Users className="w-4 h-4 text-slate-800 shrink-0 mr-2" aria-hidden />
            ) : (
              <Satellite className="w-4 h-4 text-slate-800 shrink-0 mr-2" aria-hidden />
            )}
            <select
              aria-label="Select screen"
              value={pathname === "/radar" ? "/radar" : pathname === "/rescue" ? "/rescue" : "/"}
              onChange={(e) => {
                router.push(e.target.value);
              }}
              className="bg-transparent text-slate-950 text-xs font-extrabold uppercase tracking-[1.2px] focus:outline-none cursor-pointer pr-7 appearance-none"
            >
              <option value="/" className="bg-white text-slate-950 font-bold py-1.5">
                Basin Monitor
              </option>
              <option value="/radar" className="bg-white text-slate-950 font-bold py-1.5">
                Live Map
              </option>
              <option value="/rescue" className="bg-white text-slate-950 font-bold py-1.5">
                Citizen SOS
              </option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-600 absolute right-2.5 pointer-events-none transition group-hover:text-slate-900" aria-hidden />
          </div>
        </div>

        {/* RIGHT: National emergency helpline */}
        <div className="flex items-center gap-2 self-end lg:self-center">
          <a
            href="tel:1078"
            aria-label="Call National Disaster Helpline 1078"
            className="h-[38px] px-3.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition"
            title="NDRF Emergency Helpline: 1078"
          >
            <span>📞 Helpline 1078</span>
          </a>
        </div>
      </div>

      {/* Floating Command Menu — replaces the old row of 6-7 separate buttons */}
      <CommandFAB actions={fabActions} menuLabel="Command Actions" />

      {/* Add Custom Button Modal */}
      <AddButtonModal
        isOpen={isAddButtonModalOpen}
        onClose={() => setIsAddButtonModalOpen(false)}
        onButtonAdded={() => {
          setCustomButtons(getStoredCustomButtons());
        }}
      />
    </header>
  );
}
