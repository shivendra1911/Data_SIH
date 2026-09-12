import {
  HazardZone,
  SOSCluster,
  SOSEvent,
  CitizenLocation,
  DisasterEpicenter,
  RegionalAlert,
  SafeEvacuationRoute,
  EmergencyResponder,
  EvacuationGuidelines,
} from "./types";
import { calculateDynamicSafeRoutes, calculateDynamicResponders } from "./safeSpaceAlgorithm";

// Alias for backward compat
export const HIMALAYAN_ZONES: HazardZone[] = [];

export const DEFAULT_USER_ZONE: HazardZone = {
  id: "live_user_location",
  name: "My Live Location",
  district: "Live Location",
  center: [24.7114, 83.0387],
  currentRisk: 6.5,
  alertColor: "GREEN",
  leadTimeMinutes: 480,
  dangerMarkM: 5.0,
  warningMarkM: 3.5,
  primaryTrigger: "Live Meteorological Telemetry",
  telemetry: {
    rainfall_mm: 0.0,
    soil_moisture_pct: 45.0,
    slope_deg: 10.0,
    river_level_m: 1.2,
    seismic_mag: 0.0,
  },
  hydrograph: [],
  preventiveDirectives: [],
  infrastructure: [],
};

// All-India Flood Monitoring Zones — SIH 2026 PS: SIH26192
export const INDIA_FLOOD_ZONES: HazardZone[] = [
  {
    id: "chamoli_01",
    name: "Chamoli (Rishi Ganga - Dhauliganga Valley)",
    district: "Chamoli",
    center: [30.5573, 79.5642],
    currentRisk: 14.5,
    alertColor: "GREEN",
    primaryTrigger: "Normal Hydrometric Baseline Surveillance",
    leadTimeMinutes: 360,
    dangerMarkM: 7.5,
    warningMarkM: 6.0,
    telemetry: {
      rainfall_mm: 0.0,
      soil_moisture_pct: 48.0,
      slope_deg: 44.5,
      river_level_m: 2.2,
      seismic_mag: 0.0,
    },
    hydrograph: [
      { time: "-06h", level_m: 3.2, discharge_cumecs: 180, isPredicted: false },
      { time: "-04h", level_m: 3.6, discharge_cumecs: 240, isPredicted: false },
      { time: "-02h", level_m: 4.8, discharge_cumecs: 460, isPredicted: false },
      { time: "NOW",  level_m: 6.8, discharge_cumecs: 890, isPredicted: false },
      { time: "+02h", level_m: 7.9, discharge_cumecs: 1420, isPredicted: true },
      { time: "+04h", level_m: 8.6, discharge_cumecs: 1850, isPredicted: true },
      { time: "+06h", level_m: 7.2, discharge_cumecs: 1100, isPredicted: true },
      { time: "+08h", level_m: 5.4, discharge_cumecs: 680, isPredicted: true },
    ],
    preventiveDirectives: [
      {
        id: "dir-101",
        category: "DAM",
        title: "Tapovan-Vishnugad Barrage Sluice Pre-Release",
        action: "Open Spillway Gates 1, 2, and 4 by 45% to lower reservoir baseline by 3.5m ahead of incoming 1,850 m³/s surge.",
        priority: "IMMEDIATE",
        deadline: "T - 90 mins",
        executed: false,
      },
      {
        id: "dir-102",
        category: "HIGHWAY",
        title: "NH-7 (Badrinath Highway) Traffic Halt",
        action: "Order Uttarakhand Police & BRO to halt civilian traffic at Helang and Joshimath checkpoints. Close low-lying river bridges.",
        priority: "IMMEDIATE",
        deadline: "T - 45 mins",
        executed: false,
      },
      {
        id: "dir-103",
        category: "PILGRIMAGE",
        title: "Govindghat Riverside Pilgrimage Camp Clearing",
        action: "Order SDMA SDRF personnel to evacuate 400+ pilgrims from temporary riverbank shelters to high-ground Gurdwara grounds.",
        priority: "IMMEDIATE",
        deadline: "T - 60 mins",
        executed: false,
      },
      {
        id: "dir-104",
        category: "POWER",
        title: "NTPC Hydroelectric Intake Tunnel Shutdown",
        action: "Depressurize power intake tunnels to avoid silt sedimentation and structural collapse.",
        priority: "ADVISORY",
        deadline: "T - 120 mins",
        executed: true,
      },
    ],
    infrastructure: [
      {
        id: "infra-1",
        name: "Tapovan Vishnugad Barrage",
        type: "BARRAGE",
        coords: [30.5489, 79.5785],
        riskLevel: "HIGH",
        bufferDistanceM: 30,
      },
      {
        id: "infra-2",
        name: "Rishi Ganga Hydel Intake Bridge",
        type: "BRIDGE",
        coords: [30.5542, 79.5698],
        riskLevel: "HIGH",
        bufferDistanceM: 15,
      },
      {
        id: "infra-3",
        name: "Joshimath Helipad Base (High Ground)",
        type: "SHELTER",
        coords: [30.5621, 79.5523],
        riskLevel: "SAFE",
        bufferDistanceM: 450,
      },
    ],
    epicenter: {
      id: "epi-chamoli-01",
      zone_id: "chamoli_01",
      name: "Raunthi Glacier Moraine Lake Breach (GLOF Origin)",
      type: "GLOF_MORAINE_BREACH",
      coords: [30.5724, 79.5812],
      elevation_m: 5420,
      estimated_volume_m3: "1.85M m³",
      detection_source: "Cryo-Seismic Tremor (4.6M) + INSAT-3DR Thermal Anomaly",
      surge_path: [
        [30.5724, 79.5812],
        [30.5645, 79.5742],
        [30.5582, 79.5651],
        [30.5489, 79.5785],
        [30.5420, 79.5490],
        [30.5310, 79.5380],
      ],
      checkpoints: [
        { name: "Raini Bridge Confluence", distance_km: 4.2, eta_minutes: 18, peak_surge_m: 8.6 },
        { name: "Tapovan-Vishnugad Barrage", distance_km: 7.8, eta_minutes: 42, peak_surge_m: 7.9 },
        { name: "Joshimath Helipad Lowlands", distance_km: 14.5, eta_minutes: 75, peak_surge_m: 6.4 },
        { name: "Helang NH-7 River Crossing", distance_km: 21.0, eta_minutes: 110, peak_surge_m: 5.1 },
      ],
    },
  },
  {
    id: "kedarnath_01",
    name: "Kedarnath Valley (Mandakini Catchment)",
    district: "Rudraprayag",
    center: [30.7346, 79.0669],
    currentRisk: 64.2,
    alertColor: "ORANGE",
    primaryTrigger: "High Saturated Runoff & Localized Cloudburst Warning",
    leadTimeMinutes: 85,
    dangerMarkM: 6.8,
    warningMarkM: 5.5,
    telemetry: {
      rainfall_mm: 68.2,
      soil_moisture_pct: 91.5,
      slope_deg: 38.0,
      river_level_m: 4.9,
      seismic_mag: 1.2,
    },
    hydrograph: [
      { time: "-06h", level_m: 2.8, discharge_cumecs: 120, isPredicted: false },
      { time: "-04h", level_m: 3.2, discharge_cumecs: 160, isPredicted: false },
      { time: "-02h", level_m: 4.1, discharge_cumecs: 290, isPredicted: false },
      { time: "NOW",  level_m: 4.9, discharge_cumecs: 480, isPredicted: false },
      { time: "+02h", level_m: 6.9, discharge_cumecs: 980, isPredicted: true },
      { time: "+04h", level_m: 7.4, discharge_cumecs: 1120, isPredicted: true },
      { time: "+06h", level_m: 5.8, discharge_cumecs: 620, isPredicted: true },
      { time: "+08h", level_m: 4.2, discharge_cumecs: 340, isPredicted: true },
    ],
    preventiveDirectives: [
      {
        id: "dir-201",
        category: "PILGRIMAGE",
        title: "Gaurikund-Kedarnath Trek Trail Suspension",
        action: "Halt uphill pilgrim movement at Gaurikund base. Direct downhill walkers to designated concrete shelters.",
        priority: "IMMEDIATE",
        deadline: "T - 30 mins",
        executed: false,
      },
      {
        id: "dir-202",
        category: "DAM",
        title: "Singoli-Bhatwari Hydroelectric Gate Flush",
        action: "Initiate radial gate opening to flush sediment and prevent reservoir backwater surge.",
        priority: "ADVISORY",
        deadline: "T - 75 mins",
        executed: false,
      },
    ],
    infrastructure: [
      {
        id: "infra-4",
        name: "Rambara Suspension Footbridge",
        type: "BRIDGE",
        coords: [30.7012, 79.0534],
        riskLevel: "HIGH",
        bufferDistanceM: 20,
      },
      {
        id: "infra-5",
        name: "Gaurikund Evacuation Muster Station",
        type: "SHELTER",
        coords: [30.6521, 79.0278],
        riskLevel: "SAFE",
        bufferDistanceM: 220,
      },
    ],
  },
  {
    id: "joshimath_01",
    name: "Joshimath Subsidence & Alaknanda Buffer",
    district: "Chamoli",
    center: [30.5562, 79.5663],
    currentRisk: 78.9,
    alertColor: "RED",
    primaryTrigger: "Geotechnical Slope Saturation & Toe-Erosion Breach Risk",
    leadTimeMinutes: 170,
    dangerMarkM: 7.2,
    warningMarkM: 5.8,
    telemetry: {
      rainfall_mm: 34.0,
      soil_moisture_pct: 87.2,
      slope_deg: 41.2,
      river_level_m: 5.4,
      seismic_mag: 3.1,
    },
    hydrograph: [
      { time: "-06h", level_m: 3.0, discharge_cumecs: 190, isPredicted: false },
      { time: "-04h", level_m: 3.8, discharge_cumecs: 270, isPredicted: false },
      { time: "-02h", level_m: 4.6, discharge_cumecs: 410, isPredicted: false },
      { time: "NOW",  level_m: 5.4, discharge_cumecs: 620, isPredicted: false },
      { time: "+02h", level_m: 7.3, discharge_cumecs: 1250, isPredicted: true },
      { time: "+04h", level_m: 8.1, discharge_cumecs: 1600, isPredicted: true },
      { time: "+06h", level_m: 6.5, discharge_cumecs: 910, isPredicted: true },
      { time: "+08h", level_m: 4.8, discharge_cumecs: 490, isPredicted: true },
    ],
    preventiveDirectives: [
      {
        id: "dir-301",
        category: "HIGHWAY",
        title: "Preemptive Toe-Slope Scour Warning",
        action: "Order emergency sandbagging at Marwari bridge abutments to prevent river scour undercutting the slope.",
        priority: "IMMEDIATE",
        deadline: "T - 60 mins",
        executed: false,
      },
    ],
    infrastructure: [
      {
        id: "infra-6",
        name: "Marwari Alaknanda Bridge",
        type: "BRIDGE",
        coords: [30.5591, 79.5682],
        riskLevel: "HIGH",
        bufferDistanceM: 25,
      },
    ],
  },
  {
    id: "uttarkashi_01",
    name: "Uttarkashi (Bhagirathi Gorge Basin)",
    district: "Uttarkashi",
    center: [30.7268, 78.4354],
    currentRisk: 42.0,
    alertColor: "YELLOW",
    primaryTrigger: "Moderate Runoff Advisory (Watch Status)",
    leadTimeMinutes: 375,
    dangerMarkM: 8.0,
    warningMarkM: 6.5,
    telemetry: {
      rainfall_mm: 22.0,
      soil_moisture_pct: 65.0,
      slope_deg: 29.5,
      river_level_m: 3.1,
      seismic_mag: 0.8,
    },
    hydrograph: [
      { time: "-06h", level_m: 2.1, discharge_cumecs: 110, isPredicted: false },
      { time: "-04h", level_m: 2.4, discharge_cumecs: 140, isPredicted: false },
      { time: "-02h", level_m: 2.8, discharge_cumecs: 180, isPredicted: false },
      { time: "NOW",  level_m: 3.1, discharge_cumecs: 210, isPredicted: false },
      { time: "+02h", level_m: 4.2, discharge_cumecs: 380, isPredicted: true },
      { time: "+04h", level_m: 5.6, discharge_cumecs: 610, isPredicted: true },
      { time: "+06h", level_m: 5.1, discharge_cumecs: 520, isPredicted: true },
      { time: "+08h", level_m: 4.0, discharge_cumecs: 330, isPredicted: true },
    ],
    preventiveDirectives: [
      {
        id: "dir-401",
        category: "DAM",
        title: "Maneri Bhali Barrage Gate Inspection",
        action: "Confirm readiness of automatic crest gates in case upstream tributaries experience cloudburst spikes.",
        priority: "STANDBY",
        deadline: "T - 180 mins",
        executed: true,
      },
    ],
    infrastructure: [
      {
        id: "infra-7",
        name: "Maneri Bhali Stage I Dam",
        type: "DAM",
        coords: [30.7389, 78.4621],
        riskLevel: "MODERATE",
        bufferDistanceM: 100,
      },
    ],
  },
  {
    id: "rishikesh_01",
    name: "Rishikesh Plains (Ganga Confluence)",
    district: "Dehradun",
    center: [30.0869, 78.2676],
    currentRisk: 24.5,
    alertColor: "GREEN",
    primaryTrigger: "Normal Flow (Downstream Flood Wave Buffer Zone)",
    leadTimeMinutes: 870,
    dangerMarkM: 340.5,
    warningMarkM: 339.5,
    telemetry: {
      rainfall_mm: 8.0,
      soil_moisture_pct: 45.0,
      slope_deg: 8.0,
      river_level_m: 337.8,
      seismic_mag: 0.2,
    },
    hydrograph: [
      { time: "-06h", level_m: 337.2, discharge_cumecs: 420, isPredicted: false },
      { time: "-04h", level_m: 337.4, discharge_cumecs: 450, isPredicted: false },
      { time: "-02h", level_m: 337.6, discharge_cumecs: 480, isPredicted: false },
      { time: "NOW",  level_m: 337.8, discharge_cumecs: 510, isPredicted: false },
      { time: "+02h", level_m: 338.1, discharge_cumecs: 590, isPredicted: true },
      { time: "+04h", level_m: 338.5, discharge_cumecs: 720, isPredicted: true },
      { time: "+06h", level_m: 339.1, discharge_cumecs: 880, isPredicted: true },
      { time: "+08h", level_m: 339.4, discharge_cumecs: 960, isPredicted: true },
    ],
    preventiveDirectives: [
      {
        id: "dir-501",
        category: "PILGRIMAGE",
        title: "Ganga Ghats Rafting & Bathing Advisory",
        action: "Routine advisory: Restrict river rafting operations if upstream surge passes Devprayag gauge.",
        priority: "STANDBY",
        deadline: "T - 360 mins",
        executed: true,
      },
    ],
    infrastructure: [
      {
        id: "infra-8",
        name: "Ram Jhula Suspension Bridge",
        type: "BRIDGE",
        coords: [30.1235, 78.3182],
        riskLevel: "SAFE",
        bufferDistanceM: 80,
      },
    ],
  },
  // ─── ASSAM / BRAHMAPUTRA ──────────────────────────────────────────────
  {
    id: "assam_brahmaputra_01",
    name: "Brahmaputra Floodplain (Majuli Island)",
    district: "Jorhat / Majuli, Assam",
    center: [26.9500, 94.2200],
    currentRisk: 71.3,
    alertColor: "ORANGE" as const,
    primaryTrigger: "Brahmaputra Embankment Breach — Monsoon Peak Discharge 61,000 cumecs",
    leadTimeMinutes: 120,
    dangerMarkM: 89.0,
    warningMarkM: 87.5,
    telemetry: { rainfall_mm: 92.0, soil_moisture_pct: 94.0, slope_deg: 4.5, river_level_m: 87.8, seismic_mag: 0.3 },
    hydrograph: [
      { time: "-06h", level_m: 85.2, discharge_cumecs: 42000, isPredicted: false },
      { time: "-04h", level_m: 86.1, discharge_cumecs: 48000, isPredicted: false },
      { time: "-02h", level_m: 86.9, discharge_cumecs: 53000, isPredicted: false },
      { time: "NOW",  level_m: 87.8, discharge_cumecs: 61000, isPredicted: false },
      { time: "+02h", level_m: 88.6, discharge_cumecs: 71000, isPredicted: true },
      { time: "+04h", level_m: 89.3, discharge_cumecs: 78000, isPredicted: true },
      { time: "+06h", level_m: 88.1, discharge_cumecs: 65000, isPredicted: true },
      { time: "+08h", level_m: 86.4, discharge_cumecs: 52000, isPredicted: true },
    ],
    preventiveDirectives: [
      { id: "dir-601", category: "HIGHWAY", title: "NH-27 Floodplain Bypass Activation", action: "Alert NHAI to activate Kaziranga bypass. Suspend NH-27 through Majuli floodplain.", priority: "IMMEDIATE", deadline: "T - 90 mins", executed: false },
    ],
    infrastructure: [{ id: "infra-a1", name: "Majuli Ferry Ghat Evacuation Point", type: "SHELTER", coords: [26.9488, 94.1932], riskLevel: "HIGH", bufferDistanceM: 30 }],
  },
  // ─── KERALA / WESTERN GHATS ─────────────────────────────────────────
  {
    id: "kerala_chalakudy_01",
    name: "Chalakudy River (Western Ghats Runoff)",
    district: "Thrissur, Kerala",
    center: [10.3010, 76.3316],
    currentRisk: 58.7,
    alertColor: "ORANGE" as const,
    primaryTrigger: "Orographic Rainfall 148mm — Poringalkuthu Reservoir Overflow Risk",
    leadTimeMinutes: 95,
    dangerMarkM: 12.5,
    warningMarkM: 10.0,
    telemetry: { rainfall_mm: 148.0, soil_moisture_pct: 97.0, slope_deg: 28.0, river_level_m: 9.8, seismic_mag: 0.1 },
    hydrograph: [
      { time: "-06h", level_m: 7.2, discharge_cumecs: 800, isPredicted: false },
      { time: "-04h", level_m: 8.1, discharge_cumecs: 1200, isPredicted: false },
      { time: "-02h", level_m: 9.1, discharge_cumecs: 1800, isPredicted: false },
      { time: "NOW",  level_m: 9.8, discharge_cumecs: 2400, isPredicted: false },
      { time: "+02h", level_m: 11.4, discharge_cumecs: 3600, isPredicted: true },
      { time: "+04h", level_m: 13.1, discharge_cumecs: 4800, isPredicted: true },
      { time: "+06h", level_m: 11.8, discharge_cumecs: 3900, isPredicted: true },
      { time: "+08h", level_m: 10.2, discharge_cumecs: 2800, isPredicted: true },
    ],
    preventiveDirectives: [
      { id: "dir-701", category: "DAM", title: "Poringalkuthu Dam Controlled Release", action: "Open 4 of 6 sluice gates at 60% to prevent uncontrolled overflow into Chalakudy town.", priority: "IMMEDIATE", deadline: "T - 45 mins", executed: false },
    ],
    infrastructure: [{ id: "infra-b1", name: "Chalakudy Town Riverside Shelter", type: "SHELTER", coords: [10.2998, 76.3289], riskLevel: "HIGH", bufferDistanceM: 20 }],
  },
  // ─── BIHAR / KOSI PLAINS ────────────────────────────────────────────
  {
    id: "bihar_kosi_01",
    name: "Kosi River Embankment (Supaul Zone)",
    district: "Supaul, Bihar",
    center: [25.8921, 86.5973],
    currentRisk: 47.2,
    alertColor: "YELLOW" as const,
    primaryTrigger: "Kosi Embankment Seepage — Nepal Birpur Barrage Spill Release",
    leadTimeMinutes: 300,
    dangerMarkM: 33.5,
    warningMarkM: 32.0,
    telemetry: { rainfall_mm: 55.0, soil_moisture_pct: 88.0, slope_deg: 1.8, river_level_m: 31.8, seismic_mag: 0.2 },
    hydrograph: [
      { time: "-06h", level_m: 30.1, discharge_cumecs: 18000, isPredicted: false },
      { time: "-04h", level_m: 30.8, discharge_cumecs: 21000, isPredicted: false },
      { time: "-02h", level_m: 31.4, discharge_cumecs: 24000, isPredicted: false },
      { time: "NOW",  level_m: 31.8, discharge_cumecs: 27000, isPredicted: false },
      { time: "+02h", level_m: 32.5, discharge_cumecs: 32000, isPredicted: true },
      { time: "+04h", level_m: 33.8, discharge_cumecs: 39000, isPredicted: true },
      { time: "+06h", level_m: 32.9, discharge_cumecs: 34000, isPredicted: true },
      { time: "+08h", level_m: 31.6, discharge_cumecs: 26000, isPredicted: true },
    ],
    preventiveDirectives: [
      { id: "dir-801", category: "HIGHWAY", title: "NH-107 Embankment Load Advisory", action: "Deploy Bihar Police to restrict heavy trucks on embankment roads to prevent overload failure.", priority: "ADVISORY", deadline: "T - 180 mins", executed: false },
    ],
    infrastructure: [{ id: "infra-c1", name: "Kosi Western Embankment (KWE)", type: "BARRAGE", coords: [25.9012, 86.5821], riskLevel: "MODERATE", bufferDistanceM: 200 }],
  },
  // ─── ODISHA / MAHANADI DELTA ────────────────────────────────────────
  {
    id: "odisha_mahanadi_01",
    name: "Mahanadi Delta (Cuttack Floodplain)",
    district: "Cuttack, Odisha",
    center: [20.4625, 85.8828],
    currentRisk: 34.5,
    alertColor: "YELLOW" as const,
    primaryTrigger: "Hirakud Reservoir Spillway — Coastal Inundation Watch",
    leadTimeMinutes: 480,
    dangerMarkM: 15.0,
    warningMarkM: 13.5,
    telemetry: { rainfall_mm: 38.0, soil_moisture_pct: 76.0, slope_deg: 2.2, river_level_m: 12.8, seismic_mag: 0.1 },
    hydrograph: [
      { time: "-06h", level_m: 11.2, discharge_cumecs: 12000, isPredicted: false },
      { time: "-04h", level_m: 11.8, discharge_cumecs: 14000, isPredicted: false },
      { time: "-02h", level_m: 12.4, discharge_cumecs: 17000, isPredicted: false },
      { time: "NOW",  level_m: 12.8, discharge_cumecs: 19000, isPredicted: false },
      { time: "+02h", level_m: 13.6, discharge_cumecs: 24000, isPredicted: true },
      { time: "+04h", level_m: 14.2, discharge_cumecs: 28000, isPredicted: true },
      { time: "+06h", level_m: 13.8, discharge_cumecs: 25000, isPredicted: true },
      { time: "+08h", level_m: 12.9, discharge_cumecs: 20000, isPredicted: true },
    ],
    preventiveDirectives: [
      { id: "dir-901", category: "PILGRIMAGE", title: "Puri Coastal Evacuation Advisory", action: "Issue evacuation notice for coastal villages within 5km. Coordinate with Odisha SDRF.", priority: "STANDBY", deadline: "T - 300 mins", executed: true },
    ],
    infrastructure: [{ id: "infra-d1", name: "Cuttack River Wall", type: "BARRAGE", coords: [20.4525, 85.8923], riskLevel: "SAFE", bufferDistanceM: 150 }],
  },

  // ─── HIMACHAL PRADESH / BEAS BASIN ──────────────────────────────────────
  {
    id: "himachal_kullu_01",
    name: "Parvati & Beas Valley (Kullu - Manikaran)",
    district: "Kullu, Himachal Pradesh",
    center: [31.9578, 77.1095],
    currentRisk: 88.2,
    alertColor: "RED" as const,
    primaryTrigger: "Cloudburst Inundation & Debris Torrent — Beas River Surge",
    leadTimeMinutes: 110,
    dangerMarkM: 8.0,
    warningMarkM: 6.8,
    telemetry: { rainfall_mm: 72.4, soil_moisture_pct: 94.5, slope_deg: 46.0, river_level_m: 7.7, seismic_mag: 1.8 },
    hydrograph: [
      { time: "-06h", level_m: 3.4, discharge_cumecs: 190, isPredicted: false },
      { time: "-04h", level_m: 4.1, discharge_cumecs: 310, isPredicted: false },
      { time: "-02h", level_m: 5.6, discharge_cumecs: 680, isPredicted: false },
      { time: "NOW",  level_m: 7.7, discharge_cumecs: 1240, isPredicted: false },
      { time: "+02h", level_m: 8.8, discharge_cumecs: 1920, isPredicted: true },
      { time: "+04h", level_m: 8.2, discharge_cumecs: 1550, isPredicted: true },
      { time: "+06h", level_m: 6.5, discharge_cumecs: 980, isPredicted: true },
      { time: "+08h", level_m: 5.1, discharge_cumecs: 520, isPredicted: true },
    ],
    preventiveDirectives: [
      { id: "dir-hp-01", category: "HIGHWAY", title: "Kullu-Manali NH-3 Traffic Suspension", action: "Halt all vehicle movement along vulnerable riverside road stretches. Move travelers uphill.", priority: "IMMEDIATE", deadline: "T - 30 mins", executed: false },
    ],
    infrastructure: [{ id: "infra-hp1", name: "Pandoh Dam Sluice", type: "DAM", coords: [31.6708, 77.0700], riskLevel: "HIGH", bufferDistanceM: 200 }],
  },

  // ─── JAMMU & KASHMIR / JHELUM BASIN ────────────────────────────────────
  {
    id: "jk_jhelum_01",
    name: "Jhelum Floodplain (Srinagar - Sangam)",
    district: "Srinagar / Anantnag, J&K",
    center: [34.0837, 74.7973],
    currentRisk: 64.5,
    alertColor: "ORANGE" as const,
    primaryTrigger: "Snowmelt Runoff + Continuous Downpour (Ram Munshi Bagh Stage Rising)",
    leadTimeMinutes: 280,
    dangerMarkM: 21.0,
    warningMarkM: 18.0,
    telemetry: { rainfall_mm: 44.0, soil_moisture_pct: 88.0, slope_deg: 5.5, river_level_m: 19.4, seismic_mag: 0.5 },
    hydrograph: [
      { time: "-06h", level_m: 14.5, discharge_cumecs: 1500, isPredicted: false },
      { time: "-04h", level_m: 16.2, discharge_cumecs: 2100, isPredicted: false },
      { time: "-02h", level_m: 18.1, discharge_cumecs: 2800, isPredicted: false },
      { time: "NOW",  level_m: 19.4, discharge_cumecs: 3400, isPredicted: false },
      { time: "+02h", level_m: 20.6, discharge_cumecs: 4100, isPredicted: true },
      { time: "+04h", level_m: 21.3, discharge_cumecs: 4600, isPredicted: true },
      { time: "+06h", level_m: 20.1, discharge_cumecs: 3900, isPredicted: true },
      { time: "+08h", level_m: 18.5, discharge_cumecs: 3000, isPredicted: true },
    ],
    preventiveDirectives: [
      { id: "dir-jk-01", category: "DAM", title: "Flood Spill Channel Diversion Activation", action: "Open Padshahi Bagh flood spill gates to bypass Srinagar city center.", priority: "IMMEDIATE", deadline: "T - 60 mins", executed: false },
    ],
    infrastructure: [{ id: "infra-jk1", name: "Sangam Hydrometric Gauge", type: "BRIDGE", coords: [33.8200, 75.0800], riskLevel: "MODERATE", bufferDistanceM: 100 }],
  },

  // ─── WEST BENGAL & SIKKIM / TEESTA BASIN ────────────────────────────────
  {
    id: "wb_teesta_01",
    name: "Teesta River Corridor (Jalpaiguri - Sevoke)",
    district: "Jalpaiguri, West Bengal",
    center: [26.5400, 88.7200],
    currentRisk: 91.0,
    alertColor: "RED" as const,
    primaryTrigger: "Upstream Chungthang Dam Outburst Surge Wave Transmission",
    leadTimeMinutes: 140,
    dangerMarkM: 52.5,
    warningMarkM: 50.0,
    telemetry: { rainfall_mm: 58.0, soil_moisture_pct: 91.0, slope_deg: 28.0, river_level_m: 51.8, seismic_mag: 3.8 },
    hydrograph: [
      { time: "-06h", level_m: 44.0, discharge_cumecs: 3200, isPredicted: false },
      { time: "-04h", level_m: 46.5, discharge_cumecs: 4800, isPredicted: false },
      { time: "-02h", level_m: 49.2, discharge_cumecs: 7100, isPredicted: false },
      { time: "NOW",  level_m: 51.8, discharge_cumecs: 9500, isPredicted: false },
      { time: "+02h", level_m: 53.4, discharge_cumecs: 12800, isPredicted: true },
      { time: "+04h", level_m: 52.8, discharge_cumecs: 11200, isPredicted: true },
      { time: "+06h", level_m: 49.5, discharge_cumecs: 7500, isPredicted: true },
      { time: "+08h", level_m: 46.0, discharge_cumecs: 4600, isPredicted: true },
    ],
    preventiveDirectives: [
      { id: "dir-wb-01", category: "HIGHWAY", title: "Coronation Bridge & NH-10 Closure", action: "Shut Kalimpong-Sikkim corridor. Evacuate low-lying riverbank villages downstream.", priority: "IMMEDIATE", deadline: "T - 40 mins", executed: false },
    ],
    infrastructure: [{ id: "infra-wb1", name: "Teesta Barrage (Gajoldoba)", type: "BARRAGE", coords: [26.7533, 88.5833], riskLevel: "HIGH", bufferDistanceM: 300 }],
  },
];


// Backward-compat alias — points to Uttarakhand/HP zones (first 5)
HIMALAYAN_ZONES.push(...INDIA_FLOOD_ZONES.slice(0, 5));

export const INITIAL_MOCK_SOS_EVENTS: SOSEvent[] = [];

export const INITIAL_MOCK_CLUSTERS: SOSCluster[] = [];

export const INITIAL_CITIZEN_LOCATIONS: CitizenLocation[] = [];

export const INITIAL_REGIONAL_ALERTS: RegionalAlert[] = [];

// ================================================================
// VERIFIED SAFE EVACUATION ROUTES (High Ground Above Flood Contours)
// ================================================================
export const SAFE_EVACUATION_ROUTES: Record<string, SafeEvacuationRoute[]> = {
  chamoli_01: [
    {
      id: "route-chamoli-01",
      zone_id: "chamoli_01",
      route_name: "Govindghat Pilgrim Ridge to Elevated Gurdwara Haven",
      start_point_name: "Govindghat Riverside Low Basin (1,820m)",
      start_coords: [30.5582, 79.5651],
      assembly_point_name: "Govindghat Multi-Hazard High Ground Gurdwara (1,970m)",
      assembly_coords: [30.5532, 79.5615],
      elevation_gain_m: 150,
      distance_km: 1.8,
      walk_time_minutes: 26,
      risk_avoidance_status: "100% CLEAR OF FLOOD PLAIN",
      waypoints: [
        [30.5582, 79.5651],
        [30.5574, 79.5645],
        [30.5562, 79.5638],
        [30.5548, 79.5627],
        [30.5532, 79.5615],
      ],
      shelter_capacity: 1200,
      shelter_facilities: ["Drinking Water", "Emergency Food", "Medical First-Aid", "VHF Radio Base", "Diesel Generator"],
    },
    {
      id: "route-chamoli-02",
      zone_id: "chamoli_01",
      route_name: "Tapovan Lowland to ITBP High Ridge Helipad",
      start_point_name: "Tapovan Confluence Low Bank",
      start_coords: [30.5595, 79.568],
      assembly_point_name: "Joshimath ITBP Cantonment Helipad (2,050m)",
      assembly_coords: [30.555, 79.563],
      elevation_gain_m: 230,
      distance_km: 2.9,
      walk_time_minutes: 42,
      risk_avoidance_status: "ELEVATED RIDGE TRAIL",
      waypoints: [
        [30.5595, 79.568],
        [30.5585, 79.5668],
        [30.5572, 79.5652],
        [30.556, 79.564],
        [30.555, 79.563],
      ],
      shelter_capacity: 2500,
      shelter_facilities: ["Military Trauma Center", "Helipad Air Evacuation", "Satellite Comm Unit", "Emergency Rations"],
    },
  ],

  himachal_kullu_01: [
    {
      id: "route-kullu-01",
      zone_id: "himachal_kullu_01",
      route_name: "Manikaran Riverfront to Kasol Elevated Ridge Shelter",
      start_point_name: "Manikaran Low Bank Market",
      start_coords: [31.9865, 77.125],
      assembly_point_name: "Kasol High Forest Evacuation Camp",
      assembly_coords: [31.9815, 77.118],
      elevation_gain_m: 185,
      distance_km: 2.4,
      walk_time_minutes: 35,
      risk_avoidance_status: "ELEVATED RIDGE TRAIL",
      waypoints: [
        [31.9865, 77.125],
        [31.9852, 77.1235],
        [31.9838, 77.121],
        [31.9815, 77.118],
      ],
      shelter_capacity: 800,
      shelter_facilities: ["Hot Food", "Blankets", "Paramedic Tent", "Satellite Phone"],
    },
  ],

  wb_teesta_01: [
    {
      id: "route-teesta-01",
      zone_id: "wb_teesta_01",
      route_name: "Sevoke Lowland to Coronation Ridge Viewpoint Shelter",
      start_point_name: "Sevoke Railway Lowland",
      start_coords: [26.882, 88.472],
      assembly_point_name: "Coronation Viewpoint High Ground Camp",
      assembly_coords: [26.892, 88.485],
      elevation_gain_m: 210,
      distance_km: 2.1,
      walk_time_minutes: 30,
      risk_avoidance_status: "HIGHWAY ELEVATED CORRIDOR",
      waypoints: [
        [26.882, 88.472],
        [26.885, 88.476],
        [26.8885, 88.481],
        [26.892, 88.485],
      ],
      shelter_capacity: 1500,
      shelter_facilities: ["Flood Relief Kitchen", "SDRF Outpost", "Clean Water Cistern"],
    },
  ],

  assam_brahmaputra_01: [
    {
      id: "route-assam-01",
      zone_id: "assam_brahmaputra_01",
      route_name: "Kamalabari Low Ghat to Majuli Elevated Flood Mound",
      start_point_name: "Kamalabari Ferry Ghat",
      start_coords: [26.952, 94.218],
      assembly_point_name: "Majuli Multi-Purpose Raised Flood Platform",
      assembly_coords: [26.962, 94.23],
      elevation_gain_m: 22,
      distance_km: 1.9,
      walk_time_minutes: 27,
      risk_avoidance_status: "100% CLEAR OF FLOOD PLAIN",
      waypoints: [
        [26.952, 94.218],
        [26.956, 94.222],
        [26.959, 94.226],
        [26.962, 94.23],
      ],
      shelter_capacity: 2000,
      shelter_facilities: ["Livestock Pen", "Water Purification", "First-Aid Booth", "Solar Power Station"],
    },
  ],

  bihar_kosi_01: [
    {
      id: "route-bihar-01",
      zone_id: "bihar_kosi_01",
      route_name: "Supaul Inundated Spur to Ring Bund High Causeway",
      start_point_name: "Spur #14 Low Farmland",
      start_coords: [26.124, 86.598],
      assembly_point_name: "Supaul District High Concrete Embankment Haven",
      assembly_coords: [26.135, 86.61],
      elevation_gain_m: 18,
      distance_km: 2.2,
      walk_time_minutes: 31,
      risk_avoidance_status: "HIGHWAY ELEVATED CORRIDOR",
      waypoints: [
        [26.124, 86.598],
        [26.128, 86.602],
        [26.1315, 86.606],
        [26.135, 86.61],
      ],
      shelter_capacity: 3000,
      shelter_facilities: ["Dry Food Packets", "Water Tankers", "Paramedic Van"],
    },
  ],

  kerala_chalakudy_01: [
    {
      id: "route-kerala-01",
      zone_id: "kerala_chalakudy_01",
      route_name: "Chalakudy Low Valley to St. Mary's Elevated Campus",
      start_point_name: "Riverbank Low Residential Pocket",
      start_coords: [10.312, 76.335],
      assembly_point_name: "St. Mary's High Ground Relief Center",
      assembly_coords: [10.322, 76.345],
      elevation_gain_m: 65,
      distance_km: 1.5,
      walk_time_minutes: 22,
      risk_avoidance_status: "100% CLEAR OF FLOOD PLAIN",
      waypoints: [
        [10.312, 76.335],
        [10.3155, 76.3385],
        [10.3188, 76.3418],
        [10.322, 76.345],
      ],
      shelter_capacity: 1000,
      shelter_facilities: ["Community Kitchen", "Baby Care", "Doctor Team", "Generator Backup"],
    },
  ],
};

/**
 * Universal safe evacuation route resolver.
 * Never defaults to Chamoli when viewing a custom location, live user location, or unmapped basin.
 * Calculates dynamic geodesic high-ground refuges with accurate Tobler walking time and elevation gain.
 */
export function getSafeRoutesForZone(zone: HazardZone | null | undefined): SafeEvacuationRoute[] {
  if (!zone) return [];
  if (
    zone.id &&
    zone.id !== "live_user_location" &&
    !zone.id.startsWith("custom_") &&
    SAFE_EVACUATION_ROUTES[zone.id]?.length
  ) {
    return SAFE_EVACUATION_ROUTES[zone.id];
  }
  return calculateDynamicSafeRoutes(zone);
}

// ================================================================
// EMERGENCY RESPONDER GRID (108 Ambulances, Police Thanas, NDRF/SDRF)
// ================================================================
export const EMERGENCY_RESPONDERS_GRID: Record<string, EmergencyResponder[]> = {
  chamoli_01: [
    {
      id: "resp-amb-101",
      zone_id: "chamoli_01",
      type: "AMBULANCE",
      unit_name: "108 ALS Emergency Life Support #UK-07-A-1082",
      station_location: "Community Health Centre (CHC) Joshimath",
      coords: [30.554, 79.562],
      contact_number: "108 / +91-1372-252108",
      personnel_count: 4,
      vehicle_fleet: "2x Advance Life Support (ALS) 4x4 Ambulance with Ventilator",
      distance_km: 1.2,
      eta_minutes: 8,
      status: "STANDBY",
      equipment: ["Oxygen Cylinders", "Portable Defibrillator", "Spine Boards", "Hypothermia Blankets"],
    },
    {
      id: "resp-pol-102",
      zone_id: "chamoli_01",
      type: "POLICE",
      unit_name: "Joshimath Thana & Highway Police Quick Response",
      station_location: "Kotwali Police Station, NH-58 Upper Bazaar",
      coords: [30.556, 79.565],
      contact_number: "112 / +91-1372-252220",
      personnel_count: 14,
      vehicle_fleet: "3x 4WD Police Gypsies + 1x PA Speaker Vehicle",
      distance_km: 0.8,
      eta_minutes: 5,
      status: "STANDBY",
      equipment: ["High-Decibel PA Sirens", "Roadblock Barricades", "VHF Tactical Handhelds", "Searchlights"],
    },
    {
      id: "resp-ndrf-103",
      zone_id: "chamoli_01",
      type: "NDRF",
      unit_name: "8th Battalion NDRF Quick Response Deep Rescue Post",
      station_location: "NDRF Forward Operating Base, Joshimath Bypass",
      coords: [30.552, 79.56],
      contact_number: "1078 / +91-11-23438091",
      personnel_count: 32,
      vehicle_fleet: "4x Rescue Trucks, 4x Inflatable Gemini Motorboats, 2x Drone Teams",
      distance_km: 2.1,
      eta_minutes: 12,
      status: "STANDBY",
      equipment: ["Inflatable Motorboats", "High-Angle Rope Rescue Sets", "Thermal Imaging Drones", "Underwater Sonar"],
    },
  ],

  himachal_kullu_01: [
    {
      id: "resp-amb-201",
      zone_id: "himachal_kullu_01",
      type: "AMBULANCE",
      unit_name: "108 Himachal Emergency Response #HP-34-A-108",
      station_location: "Regional Hospital Kullu Emergency Wing",
      coords: [31.982, 77.12],
      contact_number: "108 / +91-1902-222350",
      personnel_count: 3,
      vehicle_fleet: "2x 4x4 Mountain Ambulance Vans",
      distance_km: 3.5,
      eta_minutes: 14,
      status: "STANDBY",
      equipment: ["Portable Oxygen", "Trauma Kits", "Stretcher Gear"],
    },
    {
      id: "resp-pol-202",
      zone_id: "himachal_kullu_01",
      type: "POLICE",
      unit_name: "Kullu Kotwali Police & Tourist Safety Patrol",
      station_location: "Manikaran Police Checkpost",
      coords: [31.985, 77.124],
      contact_number: "112 / +91-1902-222222",
      personnel_count: 10,
      vehicle_fleet: "2x Police Patrol 4WDs",
      distance_km: 1.1,
      eta_minutes: 6,
      status: "STANDBY",
      equipment: ["Megaphones", "Barricades", "Rescue Ropes"],
    },
    {
      id: "resp-ndrf-203",
      zone_id: "himachal_kullu_01",
      type: "NDRF",
      unit_name: "14th Battalion NDRF Regional Response Centre",
      station_location: "NDRF Post Bhuntar",
      coords: [31.98, 77.115],
      contact_number: "1078 / +91-1902-265100",
      personnel_count: 24,
      vehicle_fleet: "3x Disaster Trucks + 2x Rafts",
      distance_km: 4.8,
      eta_minutes: 18,
      status: "STANDBY",
      equipment: ["River Rescue Ropes", "Life Jackets", "Cutting Tools"],
    },
  ],

  wb_teesta_01: [
    {
      id: "resp-amb-301",
      zone_id: "wb_teesta_01",
      type: "AMBULANCE",
      unit_name: "108 Bengal EMTS #WB-74-A-108",
      station_location: "Sevoke Primary Health Center",
      coords: [26.885, 88.475],
      contact_number: "108 / +91-353-2540108",
      personnel_count: 3,
      vehicle_fleet: "2x Emergency Ambulances",
      distance_km: 1.8,
      eta_minutes: 10,
      status: "STANDBY",
      equipment: ["Oxygen", "First-Aid Kits"],
    },
    {
      id: "resp-pol-302",
      zone_id: "wb_teesta_01",
      type: "POLICE",
      unit_name: "Sevoke Outpost & Highway Traffic Police",
      station_location: "NH-10 Sevoke Police Outpost",
      coords: [26.884, 88.473],
      contact_number: "112 / +91-353-2541100",
      personnel_count: 12,
      vehicle_fleet: "2x Highway Interceptors",
      distance_km: 0.9,
      eta_minutes: 4,
      status: "STANDBY",
      equipment: ["Traffic Diverters", "Loudspeakers", "Floodlights"],
    },
    {
      id: "resp-ndrf-303",
      zone_id: "wb_teesta_01",
      type: "NDRF",
      unit_name: "2nd Battalion NDRF Siliguri Base Team",
      station_location: "NDRF Base, Salugara",
      coords: [26.88, 88.465],
      contact_number: "1078 / +91-353-2590001",
      personnel_count: 28,
      vehicle_fleet: "3x Rescue Carriers + 4x Gemini Boats",
      distance_km: 5.2,
      eta_minutes: 16,
      status: "STANDBY",
      equipment: ["Motorised Boats", "Lifebuoys", "Underwater Cameras"],
    },
  ],

  assam_brahmaputra_01: [
    {
      id: "resp-amb-401",
      zone_id: "assam_brahmaputra_01",
      type: "AMBULANCE",
      unit_name: "Boat Ambulance 108 Riverine Unit #AS-01-BOAT",
      station_location: "Kamalabari River Port Health Post",
      coords: [26.955, 94.22],
      contact_number: "108 / +91-3775-274108",
      personnel_count: 4,
      vehicle_fleet: "1x High-Speed Medical Rescue Boat + 1x Land Ambulance",
      distance_km: 1.5,
      eta_minutes: 11,
      status: "STANDBY",
      equipment: ["Waterproof Oxygen Units", "Foldable Stretchers"],
    },
    {
      id: "resp-pol-402",
      zone_id: "assam_brahmaputra_01",
      type: "POLICE",
      unit_name: "Majuli River Police Station & SDRF Camp",
      station_location: "Garamur Police Station",
      coords: [26.958, 94.225],
      contact_number: "112 / +91-3775-274422",
      personnel_count: 16,
      vehicle_fleet: "2x River Patrol Speedboats",
      distance_km: 2.0,
      eta_minutes: 9,
      status: "STANDBY",
      equipment: ["Megaphones", "Lifejackets", "Flares"],
    },
    {
      id: "resp-ndrf-403",
      zone_id: "assam_brahmaputra_01",
      type: "NDRF",
      unit_name: "1st Battalion NDRF Aquatic Rescue Team",
      station_location: "Jorhat-Majuli Aquatic Base",
      coords: [26.95, 94.215],
      contact_number: "1078 / +91-376-2340078",
      personnel_count: 36,
      vehicle_fleet: "6x Deep Water Rescue Motorboats",
      distance_km: 3.2,
      eta_minutes: 15,
      status: "STANDBY",
      equipment: ["Gemini Boats", "High-Flow Pumps", "Drones"],
    },
  ],

  bihar_kosi_01: [
    {
      id: "resp-amb-501",
      zone_id: "bihar_kosi_01",
      type: "AMBULANCE",
      unit_name: "102/108 Bihar Health Dispatch #BR-50-A-108",
      station_location: "Supaul Sadar Hospital Emergency",
      coords: [26.126, 86.602],
      contact_number: "108 / +91-6473-224108",
      personnel_count: 3,
      vehicle_fleet: "2x Rural Ambulances",
      distance_km: 2.4,
      eta_minutes: 12,
      status: "STANDBY",
      equipment: ["Emergency Meds", "Stretcher"],
    },
    {
      id: "resp-pol-502",
      zone_id: "bihar_kosi_01",
      type: "POLICE",
      unit_name: "Supaul Thana & Bund Patrol Unit",
      station_location: "Supaul Town Thana",
      coords: [26.128, 86.605],
      contact_number: "112 / +91-6473-224212",
      personnel_count: 15,
      vehicle_fleet: "3x Police Gypsies",
      distance_km: 1.9,
      eta_minutes: 7,
      status: "STANDBY",
      equipment: ["Barricades", "Sirens", "Searchlights"],
    },
    {
      id: "resp-ndrf-503",
      zone_id: "bihar_kosi_01",
      type: "NDRF",
      unit_name: "9th Battalion NDRF Flood Taskforce",
      station_location: "NDRF Permanent Outpost Supaul",
      coords: [26.122, 86.595],
      contact_number: "1078 / +91-612-2541078",
      personnel_count: 30,
      vehicle_fleet: "5x Heavy Duty Inflatable Boats",
      distance_km: 2.8,
      eta_minutes: 13,
      status: "STANDBY",
      equipment: ["Motor Boats", "Tree Cutters", "Ropes"],
    },
  ],

  kerala_chalakudy_01: [
    {
      id: "resp-amb-601",
      zone_id: "kerala_chalakudy_01",
      type: "AMBULANCE",
      unit_name: "108 Kerala Kaniv Emergency Ambulance #KL-45-A-108",
      station_location: "Chalakudy Taluk Hospital",
      coords: [10.315, 76.338],
      contact_number: "108 / +91-480-2701108",
      personnel_count: 4,
      vehicle_fleet: "2x ALS Ambulances with Cardiac Monitors",
      distance_km: 1.6,
      eta_minutes: 8,
      status: "STANDBY",
      equipment: ["Defibrillators", "Oxygen Concentrators"],
    },
    {
      id: "resp-pol-602",
      zone_id: "kerala_chalakudy_01",
      type: "POLICE",
      unit_name: "Chalakudy Police Station & Coastal Guard Team",
      station_location: "Chalakudy Town Police Station",
      coords: [10.318, 76.34],
      contact_number: "112 / +91-480-2701233",
      personnel_count: 18,
      vehicle_fleet: "3x Highway Patrol Vehicles",
      distance_km: 1.2,
      eta_minutes: 6,
      status: "STANDBY",
      equipment: ["Siren Systems", "Bridge Closure Cones", "Wireless Sets"],
    },
    {
      id: "resp-ndrf-603",
      zone_id: "kerala_chalakudy_01",
      type: "NDRF",
      unit_name: "4th Battalion NDRF Arakkonam Detachment Thrissur",
      station_location: "Thrissur Disaster Relief Camp",
      coords: [10.31, 76.33],
      contact_number: "1078 / +91-487-2361078",
      personnel_count: 26,
      vehicle_fleet: "4x Gemini Inflatables + 1x Amphibious Vehicle",
      distance_km: 4.0,
      eta_minutes: 15,
      status: "STANDBY",
      equipment: ["Scuba Diving Kits", "Flood Ropes", "Night Vision Equipment"],
    },
  ],
};

// Default fallback for any other zone
export const DEFAULT_EMERGENCY_RESPONDERS: EmergencyResponder[] = [
  {
    id: "resp-def-amb",
    zone_id: "chamoli_01",
    type: "AMBULANCE",
    unit_name: "108 National Health Emergency Ambulance",
    station_location: "Nearest District Hospital",
    coords: [30.554, 79.562],
    contact_number: "108",
    personnel_count: 3,
    vehicle_fleet: "1x ALS Emergency Ambulance",
    distance_km: 2.5,
    eta_minutes: 12,
    status: "STANDBY",
    equipment: ["Oxygen", "Trauma Kit"],
  },
  {
    id: "resp-def-pol",
    zone_id: "chamoli_01",
    type: "POLICE",
    unit_name: "State Police Control Room & QRT",
    station_location: "Local Thana Jurisdiction",
    coords: [30.556, 79.565],
    contact_number: "112",
    personnel_count: 10,
    vehicle_fleet: "2x Police Patrol Vehicles",
    distance_km: 1.5,
    eta_minutes: 7,
    status: "STANDBY",
    equipment: ["Megaphones", "Barricades"],
  },
  {
    id: "resp-def-ndrf",
    zone_id: "chamoli_01",
    type: "NDRF",
    unit_name: "National Disaster Response Force (NDRF) Taskforce",
    station_location: "Regional Response Centre",
    coords: [30.552, 79.56],
    contact_number: "1078",
    personnel_count: 25,
    vehicle_fleet: "2x Rescue Trucks + 2x Boats",
    distance_km: 4.5,
    eta_minutes: 15,
    status: "STANDBY",
    equipment: ["Inflatable Boats", "Ropes", "Search Drones"],
  },
];

/**
 * Universal emergency responders resolver.
 * Never defaults to Chamoli units when viewing another location.
 * Calculates localized 108 Ambulance, Police QRT, and NDRF/SDRF units around the zone center.
 */
export function getRespondersForZone(zone: HazardZone | null | undefined): EmergencyResponder[] {
  if (!zone) return [];
  if (
    zone.id &&
    zone.id !== "live_user_location" &&
    !zone.id.startsWith("custom_") &&
    EMERGENCY_RESPONDERS_GRID[zone.id]?.length
  ) {
    return EMERGENCY_RESPONDERS_GRID[zone.id];
  }
  return calculateDynamicResponders(zone);
}

// ================================================================
// OFFICIAL EVACUATION GUIDELINES (SIH 2026 Emergency Directives)
// ================================================================
export const ZONE_EVACUATION_GUIDELINES: Record<string, EvacuationGuidelines> = {
  chamoli_01: {
    zone_id: "chamoli_01",
    zone_name: "Chamoli (Rishi Ganga - Dhauliganga Valley)",
    alert_level: "RED",
    alarm_tone: "CIVIL_DEFENSE_SIREN_105DB",
    immediate_actions: [
      "EVACUATE IMMEDIATELY: Move away from Alaknanda & Rishi Ganga riverbanks uphill without delay.",
      "DO NOT cross low bridges, causeways, or culverts under any circumstances.",
      "Shut off domestic gas regulator valves and main electrical circuit breakers before departing.",
      "Take your pre-packed 72-hour Emergency Go-Bag (Medicines, Identity Docs, Water Bottle, Torch).",
    ],
    high_ground_directives: [
      "Follow the Green Verified Safe Route on your NeerNetra app toward Joshimath Helipad / Gurdwara.",
      "Maintain a vertical safety buffer of at least 80–100 meters above normal river level.",
      "Avoid steep landslide-prone slopes; keep to established ridge footpaths.",
    ],
    offline_mesh_protocol:
      "KEEP BLUETOOTH AND GPS SWITCHED ON: If mobile towers fail, your phone automatically joins the NeerNetra P2P BLE mesh relay chain to forward your SOS and last known GPS coordinates to rescue aircraft and patrol vehicles.",
    disaster_radio_mhz: "All India Radio (AIR) Disaster Frequency: 102.8 MHz FM",
    emergency_helplines: [
      { agency: "National Disaster Response Force (NDRF)", phone: "1078" },
      { agency: "Uttarakhand State Disaster Control (SDMA)", phone: "1070" },
      { agency: "Ambulance Emergency", phone: "108" },
      { agency: "Police Emergency", phone: "112" },
    ],
  },
};

/**
 * Universal evacuation guidelines resolver for any location or live GPS.
 */
export function getGuidelinesForZone(zone: HazardZone | null | undefined): EvacuationGuidelines {
  const rawName = zone?.district || zone?.name || "Local River Basin";
  const cleanName = rawName.split("(")[0].replace(/district|valley|basin/gi, "").trim() || "Local";
  const zoneId = zone?.id || "local_sector";

  if (
    zone?.id &&
    zone.id !== "live_user_location" &&
    !zone.id.startsWith("custom_") &&
    ZONE_EVACUATION_GUIDELINES[zone.id]
  ) {
    return ZONE_EVACUATION_GUIDELINES[zone.id];
  }

  return {
    zone_id: zoneId,
    zone_name: `${cleanName} Disaster Management Sector`,
    alert_level: zone?.alertColor === "RED" ? "RED" : "ORANGE",
    alarm_tone: "CIVIL_DEFENSE_SIREN_105DB",
    immediate_actions: [
      `EVACUATE IMMEDIATELY: Move away from ${cleanName} drainage lowlands and riverbanks uphill without delay.`,
      "DO NOT cross flooded causeways, subway underpasses, or submerged bridges.",
      "Turn off domestic gas cylinders and main power breakers before vacating buildings.",
      "Carry emergency survival kits (Drinking water, prescribed medications, identification papers, emergency light).",
    ],
    high_ground_directives: [
      `Follow the verified evacuation corridors displayed on your NeerNetra live radar towards designated elevated refuges.`,
      "Ascend to multi-hazard high-ground sanctuaries maintaining safe clearance above flood stages.",
      "Keep clear of unstable soil banks and stormwater drainage outflow culverts.",
    ],
    offline_mesh_protocol:
      "KEEP BLUETOOTH AND GPS SWITCHED ON: In event of cellular tower failure, your device connects with peer mobile APK nodes via NeerNetra P2P BLE mesh to transmit distress beacons and GPS fixes to NDRF/SDRF emergency search teams.",
    disaster_radio_mhz: "All India Radio (AIR) Disaster Broadcast: 102.8 MHz FM / National Disaster Channel",
    emergency_helplines: [
      { agency: "National Disaster Response Force (NDRF)", phone: "1078" },
      { agency: "State Disaster Management Authority (SDMA)", phone: "1070" },
      { agency: "Ambulance Emergency Medical Service", phone: "108" },
      { agency: "Police Emergency & Quick Response", phone: "112" },
    ],
  };
}