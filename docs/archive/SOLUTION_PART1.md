# NEERNETRA — COMPLETE SOLUTION DOCUMENT v3.0 (AI ENHANCED)
## SIH 2026 | PS: SIH26192 | Team NeerNetra | GLA University

---

## 1. PROBLEM — WHY PEOPLE DIE IN HILLY REGIONS

The 4 failures in EVERY Himalayan flood:
1. **The Prediction Blindspot:** Weather APIs only look at rain. They miss Rock-Ice collapses and Glacial Lake Outbursts (GLOFs) like Nepal 2026, which happen in clear weather.
2. **The Warning-to-Action Gap:** Warning reaches officials 4-6 hours early, but villages only get 40 minutes (not enough time for evacuation).
3. **The Communication Collapse:** Cell towers fail when floods hit → people are INVISIBLE to rescue.
4. **The Triage Chaos:** 5000+ people in a danger zone → no way to know who is safe and who is trapped.

**NeerNetra solves ALL 4 failures.**

---

## 2. EXISTING SYSTEMS AND GAPS

*   **SAsiaFFGS (IMD+WMO):** Watershed-level only (100s sq km). No citizen app.
*   **C-FLOOD (CWC):** Web portal only. No mobile push. No offline capabilities.
*   **SACHET (NDMA):** Govt-to-tower only. No two-way communication.

**The Last-Mile Gap:** Every system stops at the government level and uses basic weather modeling.
**NeerNetra = FIRST end-to-end AI Prediction + Citizen Offline Response System.**

---

## 3. SOLUTION OVERVIEW

Four decoupled monorepo components:
A) **AI Prediction Engine:** ML model predicting hyper-local floods using 5 real-time APIs.
B) **Backend API:** FastAPI server managing data sync and triggering alerts.
C) **Mobile App (Citizen):** Alert + SOS + Triage + Offline Bluetooth Mesh.
D) **Web Dashboard (Govt):** Command center with Live Map & Rescue Clustering.

**Flow:** AI PREDICTS (8-12hr lead) → AUTO-ALERTS (4 channels) → BLUETOOTH MESH SPREADS IT → CITIZEN TRIAGE → NDRF RESCUES.

---

## 4. THE AI PREDICTION ENGINE (Physics-Informed ML)

We abandoned simple math formulas. NeerNetra uses a **Machine Learning Model (Random Forest / PI-GNN concepts)** trained on historical Himalayan flood data.

**The 5 Multi-Source Data Inputs (Real-Time):**
1. **Rainfall Intensity (mm/hr)** — Tomorrow.io API (Primary meteorological trigger)
2. **Soil Moisture Saturation (%)** — AgroMonitoring API (Amplifier)
3. **Terrain Slope (Degrees)** — Open-Elevation API (Geospatial velocity multiplier)
4. **River Water Levels (m)** — India-WRIS (Hydrological baseline)
5. **Seismic Magnitude (Richter)** — USGS Earthquake API (Cryospheric anomaly trigger)

### 🚨 Innovation: Cryo-Seismic Signature Detection (The Nepal 2026 Fix)
In August 2026 (Langtang Lirung, Nepal), 1000+ died because traditional systems only monitored rain. It was a rock-ice collapse that triggered a seismic wave. 
Our ML model monitors **Seismic Data**. If it detects a steep slope + a >4.5 Magnitude tremor + sudden river anomalies, the AI instantly predicts a **Glacial Lake Outburst Flood (GLOF) / Avalanche** and triggers a RED alert, even if rainfall is zero.

**Alert Thresholds (Outputted by ML Probability):**
*   **>= 75%** → 🔴 RED (Evacuate NOW - Triggers Zero-Minute Protocol)
*   **>= 55%** → 🟠 ORANGE (High Alert)
*   **>= 35%** → 🟡 YELLOW (Watch)
*   **< 35%**  → 🟢 GREEN (Normal)

---

## 5. PRIVACY SYSTEM (5 Stages) — DPDP Act Compliant

1. **GREEN:** Location NEVER accessed. Zero battery. Zero tracking.
2. **YELLOW:** Not accessed. Voluntary opt-in only.
3. **ORANGE:** Popup with clear YES/NO consent (DPDP Section 6).
4. **RED:** Auto-enables with full on-screen notice AND a visible OFF button. Legal basis: DPDP Section 7(d) "Vital Interests" (same as an ambulance siren).
5. **CLEAR:** Auto-STOPS immediately. All data auto-deleted from server in 24 hours.

*(What is stored: lat/lng, timestamp, anonymous UUID. Never stored: Name, phone number).*

---

## 6. CITIZEN TRIAGE SYSTEM & RESCUE CLUSTERING

When RED fires, every user sees a full-screen modal:
*   **[✅ I AM SAFE]** → Green dot on dashboard
*   **[🚨 I NEED HELP]** → Red pulsing dot on dashboard
*   **[🤝 I AM HELPING]** → Blue dot on dashboard

**Rescue Optimization (K-Means Clustering):**
If 500 SOS events happen across 50km, human routing fails. The NeerNetra Backend runs a **K-Means Clustering Algorithm** (PostGIS `ST_ClusterKMeans`). It groups nearby stranded people into geographic clusters.
The dashboard displays: *"CLUSTER A: 47 people | Center: 30.55N 79.56E | [ASSIGN TEAM 1]"*
This allows NDRF to dispatch resources systematically, mimicking FEMA's hurricane response protocol.
