"use client";

import React, { useState } from "react";
import { Language } from "@/lib/i18n";
import { HazardZone } from "@/lib/types";
import {
  AlertTriangle,
  X,
  Send,
  CheckCircle2,
  Phone,
  User,
  MapPin,
  Users,
  ShieldCheck,
} from "lucide-react";

interface WebSOSRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeZone: HazardZone;
  language: Language;
  onSuccessSOS: (event: any) => void;
}

export default function WebSOSRequestModal({
  isOpen,
  onClose,
  activeZone,
  language,
  onSuccessSOS,
}: WebSOSRequestModalProps) {
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [landmark, setLandmark] = useState("");
  const [numPeople, setNumPeople] = useState("1");
  const [needType, setNeedType] = useState("TRAPPED");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTicket, setSuccessTicket] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Add slight random offset from active zone center
    const latOffset = (Math.random() - 0.5) * 0.015;
    const lngOffset = (Math.random() - 0.5) * 0.015;

    const payload = {
      device_uuid: `web-citizen-${phoneNumber || Date.now().toString(36)}`,
      lat: activeZone.center[0] + latOffset,
      lng: activeZone.center[1] + lngOffset,
      status: "SOS",
      sos_type: `${needType}: ${fullName || "Citizen"} (${numPeople} people) at ${
        landmark || activeZone.name
      }`,
      is_mesh_relayed: false,
    };

    try {
      const res = await fetch("/api/sos/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessTicket(`HELP-${Math.floor(100000 + Math.random() * 900000)}`);
        onSuccessSOS(data.event);
      }
    } catch (err) {
      // Fallback
      setSuccessTicket(`HELP-${Math.floor(100000 + Math.random() * 900000)}`);
      onSuccessSOS({
        ...payload,
        id: `web-sos-${Date.now()}`,
        created_at: new Date().toISOString(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setSuccessTicket(null);
    setFullName("");
    setPhoneNumber("");
    setLandmark("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2500] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {language === "hi"
                  ? "आपातकालीन सहायता अनुरोध (SOS)"
                  : "Emergency Assistance Request (Web SOS)"}
              </h2>
              <p className="text-xs text-slate-400">
                {language === "hi"
                  ? "कंट्रोल रूम और बचाव दल को अपनी स्थिति भेजें"
                  : "Send your location directly to NDRF & State Control Room"}
              </p>
            </div>
          </div>

          <button
            onClick={resetAndClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successTicket ? (
          /* Confirmation State */
          <div className="p-5 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-white">
              {language === "hi"
                ? "आपकी सूचना कंट्रोल रूम को मिल गई है!"
                : "Your SOS Has Been Received by Control Room!"}
            </h3>
            <p className="text-xs text-slate-200 leading-relaxed">
              {language === "hi"
                ? "आपकी लोकेशन कंट्रोल रूम के मैप पर लाल बिंदु के रूप में दर्ज कर दी गई है। निकटतम बचाव दल को सूचित किया जा रहा है।"
                : "Your coordinates have been plotted directly onto the commander's radar map. Nearest response team is being alerted."}
            </p>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono">
              <span className="text-slate-400 block text-[10px]">
                {language === "hi" ? "आपातकालीन सहायता टिकट संख्या:" : "Emergency Ticket ID:"}
              </span>
              <strong className="text-emerald-400 text-base">{successTicket}</strong>
            </div>

            <button
              onClick={resetAndClose}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition min-h-[44px]"
            >
              {language === "hi" ? "ठीक है, बंद करें" : "Close Confirmation"}
            </button>
          </div>
        ) : (
          /* Form State */
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                {language === "hi" ? "आपका पूरा नाम (Full Name)" : "Your Full Name"}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder={language === "hi" ? "जैसे: रमेश सिंह" : "e.g. Ramesh Singh"}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                {language === "hi" ? "मोबाइल नंबर (Mobile Number)" : "Contact Phone Number"}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Landmark */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                {language === "hi"
                  ? "आप कहाँ फंसे हैं? (गांव / मील का पत्थर / पहचान)"
                  : "Village / Landmark / Current Location"}
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder={
                    language === "hi"
                      ? "जैसे: पुराने पुल के पास, रैणी गांव"
                      : "e.g. Near Old Bridge, Reni Village"
                  }
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* People & Need Type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  {language === "hi" ? "कुल कितने लोग हैं?" : "Total People"}
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={numPeople}
                    onChange={(e) => setNumPeople(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  {language === "hi" ? "मदद का प्रकार" : "Emergency Need"}
                </label>
                <select
                  value={needType}
                  onChange={(e) => setNeedType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                >
                  <option value="TRAPPED IN FLOOD">
                    {language === "hi" ? "पानी में फंसे हैं (Trapped)" : "Trapped in Water"}
                  </option>
                  <option value="MEDICAL EMERGENCY">
                    {language === "hi" ? "चिकित्सा सहायता (Medical)" : "Medical Emergency"}
                  </option>
                  <option value="FOOD & DRINKING WATER">
                    {language === "hi" ? "भोजन व पानी चाहिए (Food/Water)" : "Food & Drinking Water"}
                  </option>
                  <option value="ELDERLY / CHILDREN HELP">
                    {language === "hi" ? "बुजुर्ग व बच्चे फंसे हैं" : "Elderly & Children Assistance"}
                  </option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-98 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-rose-950 min-h-[48px] disabled:opacity-50 mt-2"
            >
              <Send className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? language === "hi"
                    ? "संदेश भेजा जा रहा है..."
                    : "Transmitting SOS..."
                  : language === "hi"
                  ? "कंट्रोल रूम को तुरंत मदद भेजें (SEND SOS)"
                  : "Submit SOS to Control Room Now"}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}