# 🌊 NeerNetra (नीर्नेत्र)
### Autonomous Multi-Modal Himalayan Flash Flood & GLOF Early Warning Platform
**Smart India Hackathon (SIH26192)** • **Team Leader:** Priyanshu • **Branch:** `main`

---

## 📌 Executive Summary
**NeerNetra** is a mission-critical disaster management platform designed for rugged Himalayan terrains (such as Chamoli, Joshimath, Kedarnath, and Uttarkashi). It bridges physical meteorological-seismic intelligence, dual-cloud persistence, and zero-connectivity citizen survival networks.

When conventional cellular towers fail or fiber optic backbones are severed by landslides, NeerNetra seamlessly pivots into a **peer-to-peer Bluetooth Low Energy (BLE) multi-hop mesh network**, guaranteeing that distress signals (SOS) and life-saving evacuation routes reach NDRF rescue coordinators.

---

## 🌟 Key Architecture & Technical Highlights

### 1. 🧠 Physics-Informed Multi-Modal AI Engine
- **Input Features (5-Dimensional Telemetry):**
  1. `rainfall_mm_hr` (Rainfall precipitation rate)
  2. `soil_moisture_pct` (Hydrological soil saturation level)
  3. `terrain_slope_deg` (Geographic mountain slope grade)
  4. `river_water_level_m` (Hydraulic river sensor level)
  5. `seismic_magnitude` (USGS seismic tremor activity)
- **Zero-Rain GLOF Trigger:** In glacial breach events (such as the 2021 Chamoli disaster), cloud bursts are not the culprit; glacial lake moraine collapse is triggered by seismic or permafrost failures. NeerNetra executes an immediate **100% Critical RED Alert** if seismic magnitude >= 4.0 occurs on steep glaciated terrain (>= 25 deg), regardless of rainfall.

### 2. ⚡ High-Availability & Resilient Meteorological Pipeline
- **10-Minute Spatial Coordinate TTL Caching:** Prevents quota exhaustion on upstream meteorological APIs.
- **Automated Open-Meteo Zero-Key Failover:** Seamlessly fails over from Tomorrow.io to Open-Meteo on HTTP 429 rate-limiting.
- **Local High-Ground Shelter Registry:** Contains pre-indexed Uttarakhand relief camps and high-ground shelters (`REGIONAL_SHELTERS_DB`) with 0ms response time when external OpenStreetMap Overpass servers throttle or timeout.

### 3. 🔥 Google Firebase Cloud Dual-Persistence
- **Project ID:** `neernetra-e2706`
- **FastAPI `BackgroundTasks`:** All citizen GPS pings, SOS triggers, and rescue dispatches update the sub-20ms in-memory cache instantly and queue non-blocking cloud persistence to Google Cloud Firestore collections:
  - `citizen_locations`
  - `sos_events`
  - `dispatched_rescues`
  - `system_health`
- **Firebase Cloud Messaging (FCM):** Live emergency broadcast topics for sector-wide evacuation notices.

### 4. 📱 Citizen Edge Node (Expo / React Native)
- **NetInfo Auto-Failover:** Automatically switches between `ONLINE` and `BLE_MESH` modes; immediately flushes queued offline SOS beacons upon internet restoration.
- **Multi-Hop BLE Mesh Protocol:** Custom broadcast/relay mechanism with hop counters (`TTL=7`), packet sequence IDs, and duplicate suppression.
- **5-Minute Red Zone Danger Timer:** Escalates automatically if a citizen trapped in a RED zone does not confirm safety.
- **Good Samaritan / Volunteer Mode:** Citizens can tap `"I AM HELPING"` to register as local field volunteers, assisting NDRF squads with victim triaging.
- **Offline Vector Evacuation Map:** Visualizes high-ground evacuation assembly zones without requiring mobile tile downloads.

### 5. 🖥️ Tactical Web Command Portal (Next.js 14)
- **Unified Command Overview:** Bundles zone predictions, live citizen radar, rescue clusters, and dispatches in a single call (`/api/dashboard/overview`).
- **Adaptive Tab Visibility:** Slows background polling from 4s to 12s when browser tab is inactive.
- **NDRF Squad Dispatcher:** Instant assignment of Air Wing Helicopters, NDRF River Boats, or Quick Response Teams (QRT).

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+ (tested on Python 3.14)
- Node.js v18+ (tested on v20.18.0)
- npm or yarn

---

### 1. Start the FastAPI Backend Server
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
- **Interactive Swagger Docs:** `http://localhost:8000/docs`
- **Health Check:** `http://localhost:8000/`

---

### 2. Start the Web Command Dashboard
```bash
cd web
npm install
npm run dev
```
- **Dashboard URL:** `http://localhost:3000`

---

### 3. Start the Citizen Mobile App
```bash
cd mobile
npm install
npx expo start
```

---

## 🧪 Automated Verification Suite

Run the pre-flight verification scripts from the project root:

```bash
# 1. Run the 10/10 End-to-End Integration Test Suite
py backend/test_integration.py

# 2. Run the Full 6-Subsystem Operational Health Audit
py backend/full_system_status.py

# 3. Type-check Mobile Application
cd mobile && npx tsc --noEmit

# 4. Build Next.js Web Dashboard
cd web && npm run build
```

---

## 🛡️ License & Acknowledgments
Built for **Smart India Hackathon (SIH26192)**.
