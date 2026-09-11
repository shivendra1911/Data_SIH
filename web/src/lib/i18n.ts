export type Language = "en" | "hi";

export interface TranslationDictionary {
  appTitle: string;
  appSubtitle: string;
  commandCenter: string;
  listenAlert: string;
  listening: string;
  languageToggle: string;
  emergencyHelplines: string;
  ndrfHelpline: string;
  sdmaHelpline: string;
  ambulanceHelpline: string;
  activeSector: string;
  floodRisk: string;
  evacuationTime: string;
  hours: string;
  minutes: string;
  seconds: string;
  warningNotice: string;
  dangerNotice: string;
  safeNotice: string;
  plainLanguageSummaryTitle: string;
  actionNowTitle: string;
  actions: {
    moveHighGround: string;
    avoidBridges: string;
    keepPhoneCharged: string;
  };
  sensorExplanation: {
    rain: string;
    soil: string;
    slope: string;
    river: string;
    seismic: string;
  };
  preventiveTitle: string;
  authorizeBtn: string;
  orderDispatched: string;
  hydrographTitle: string;
  currentWater: string;
  peakSurge: string;
  warningMark: string;
  dangerMark: string;
  forecastSlider: string;
  citizenLayerTitle: string;
  expandCitizen: string;
  hideCitizen: string;
}

export const translations: Record<Language, TranslationDictionary> = {
  en: {
    appTitle: "NEERNETRA",
    appSubtitle: "Himalayan Flash Flood & Landslide Early Warning System",
    commandCenter: "Field & Commander Dashboard",
    listenAlert: "Listen to Alert (Audio)",
    listening: "Playing Audio Alert...",
    languageToggle: "हिंदी में देखें",
    emergencyHelplines: "Emergency Hotlines",
    ndrfHelpline: "NDRF: 1078",
    sdmaHelpline: "Uttarakhand Disaster: 1070",
    ambulanceHelpline: "Ambulance: 108",
    activeSector: "Selected Area",
    floodRisk: "Flood Risk Level",
    evacuationTime: "Time Left to Evacuate (Safe Window)",
    hours: "hours",
    minutes: "mins",
    seconds: "sec",
    warningNotice: "Water levels are rising fast. Prepare to move to high ground.",
    dangerNotice: "DANGER: Move away from riverbanks immediately to designated high-ground shelters!",
    safeNotice: "River level is normal. No immediate danger.",
    plainLanguageSummaryTitle: "What Does This Mean For You?",
    actionNowTitle: "Simple 3-Step Safety Actions (What to do right now):",
    actions: {
      moveHighGround: "1. Move to Higher Ground: Head towards village helipads or shelters above the river.",
      avoidBridges: "2. Stay Off Bridges: Do not walk across footbridges or drive near riverbanks.",
      keepPhoneCharged: "3. Keep Phone & Torch Ready: Stay tuned to emergency radio announcements.",
    },
    sensorExplanation: {
      rain: "Rain Gauge: Measures how heavy the rainfall is right now.",
      soil: "Soil Moisture: Wet soil cannot absorb more water, causing instant runoff.",
      slope: "Mountain Slope: Steeper mountains make flood water rush down much faster.",
      river: "River Level: Current water height measured at the gauging station.",
      seismic: "Ground Tremor: Detects underground tremors that trigger glacial collapses.",
    },
    preventiveTitle: "Government Preventive Orders",
    authorizeBtn: "Issue Emergency Order",
    orderDispatched: "Order Sent to Local Police & Field Teams",
    hydrographTitle: "Water Level Trend & Inundation Curve",
    currentWater: "Current River Height",
    peakSurge: "Expected Peak Flood",
    warningMark: "Warning Level",
    dangerMark: "Danger Mark",
    forecastSlider: "See Future Flood Forecast (Scrub Time)",
    citizenLayerTitle: "Citizen Distress Reports & Rescue Units",
    expandCitizen: "View Citizen SOS Signals",
    hideCitizen: "Hide Citizen Signals",
  },
  hi: {
    appTitle: "नीरनेत्र (NEERNETRA)",
    appSubtitle: "हिमालयी आकस्मिक बाढ़ एवं भूस्खलन पूर्व चेतावनी प्रणाली",
    commandCenter: "फील्ड एवं कमांडर केंद्र",
    listenAlert: "चेतावनी बोलकर सुनें (Audio)",
    listening: "चेतावनी सुनाई जा रही है...",
    languageToggle: "English View",
    emergencyHelplines: "आपातकालीन नंबर",
    ndrfHelpline: "एनडीआरएफ: 1078",
    sdmaHelpline: "उत्तराखंड आपदा: 1070",
    ambulanceHelpline: "एम्बुलेंस: 108",
    activeSector: "चुना हुआ क्षेत्र",
    floodRisk: "बाढ़ का खतरा",
    evacuationTime: "सुरक्षित निकलने का बचा हुआ समय",
    hours: "घंटे",
    minutes: "मिनट",
    seconds: "सेकंड",
    warningNotice: "नदी का जलस्तर तेजी से बढ़ रहा है। सुरक्षित स्थानों की ओर जाने की तैयारी करें।",
    dangerNotice: "अत्यंत खतरा: नदी के किनारों से तुरंत दूर हटें और ऊंचे स्थानों/राहत शिविरों में पहुंचे!",
    safeNotice: "नदी का जलस्तर सामान्य है। वर्तमान में कोई खतरा नहीं है।",
    plainLanguageSummaryTitle: "सरल शब्दों में इसका क्या मतलब है?",
    actionNowTitle: "अभी तुरंत करने योग्य 3 जरूरी काम:",
    actions: {
      moveHighGround: "1. ऊंचे स्थानों पर जाएं: नदी किनारे से हटकर गांव के ऊंचे मैदान या हेलीपैड शिविर पर जाएं।",
      avoidBridges: "2. पुलों और रपटों से दूर रहें: किसी भी नदी पुल या कच्चे रास्ते को पार न करें।",
      keepPhoneCharged: "3. फोन और टॉर्च तैयार रखें: स्थानीय प्रशासन की घोषणाओं पर ध्यान दें।",
    },
    sensorExplanation: {
      rain: "बारिश मापक: बताता है कि इलाके में कितनी तेज बारिश हो रही है।",
      soil: "मिट्टी की नमी: अत्यधिक गीली मिट्टी पानी सोख नहीं पाती, जिससे पानी तेजी से बहता है।",
      slope: "पहाड़ का ढलान: जितना तीखा ढलान, उतनी तेजी से बाढ़ का पानी नीचे आता है।",
      river: "नदी का स्तर: स्टेशन पर मापी गई वर्तमान नदी की ऊंचाई।",
      seismic: "भूगर्भीय कंपन: यह ग्लेशियर टूटने या पहाड़ दरकने की तुरंत सूचना देता है।",
    },
    preventiveTitle: "प्रशासनिक बचाव निर्देश (डैम व सड़कें)",
    authorizeBtn: "आपातकालीन आदेश जारी करें",
    orderDispatched: "आदेश स्थानीय पुलिस व प्रशासन को भेजा गया",
    hydrographTitle: "नदी का जलस्तर और बाढ़ का पूर्वानुमान",
    currentWater: "वर्तमान नदी स्तर",
    peakSurge: "अनुमानित अधिकतम स्तर",
    warningMark: "चेतावनी स्तर",
    dangerMark: "खतरे का निशान",
    forecastSlider: "भविष्य का बाढ़ अनुमान देखें (समय बदलें)",
    citizenLayerTitle: "नागरिकों की मदद की पुकार व बचाव दल",
    expandCitizen: "नागरिक संदेश देखें",
    hideCitizen: "नागरिक संदेश छिपाएं",
  },
};