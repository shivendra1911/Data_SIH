---
## 7. OFFLINE MESH COMMUNICATION (The "Last-Mile" Survival Net)

A prediction is useless if the village has no internet to receive it. We use a 4-layer hybrid system:

**LAYER 0 - Cell Broadcast System (CBS):** Bypasses internet congestion. Government sends directly to cell towers.
**LAYER 1 - BLE Beacon (Discovery):** App broadcasts a 31-byte Bluetooth Low Energy packet (Status + GPS). Any NeerNetra phone within 50m receives it. No pairing required. Ultra-low battery.
**LAYER 2 - WiFi Direct (Data Transfer):** Switches to WiFi Direct (100m range) to transfer full SOS packets and offline map tiles if SOS is detected.
**LAYER 3 - Multi-Hop Mesh Relay:** Phone A (stranded) → Phone B (50m, BLE) → Phone C (on a hill, 2G) → Server. Messages hop automatically.
**LAYER 4 - SMS Fallback:** Uses Android `SmsManager` to send SOS via the 2G voice channel if mobile data is dead.

---

## 8. AUTOMATED "ZERO-MINUTE" PROTOCOL

In extreme events (like 190 km/h flash floods), waiting for a human official to click "Send Alert" kills people. 
If the AI Model outputs a **>90% Flood Probability** with a Seismic/Avalanche trigger, the backend bypasses the human dashboard and triggers the **Zero-Minute Protocol**. It fires a Firebase Cloud Messaging (FCM) alert directly to all mobile apps in the affected GeoJSON zone instantly.

---

## 9. MONOREPO ARCHITECTURE & SYSTEM CONNECTION

NeerNetra is built as a highly scalable **Microservices Monorepo** with 4 decoupled environments:

1. **AI Model (`/ai_model`):** Python scripts that generate synthetic historical data, train the Random Forest model using `scikit-learn`, and output a trained `.pkl` binary "brain".
2. **Backend API (`/backend`):** FastAPI Python server. Loads the `.pkl` AI model. Fetches live multi-source data (Tomorrow.io, USGS) every 15 minutes, feeds it to the AI, and saves results to Supabase (PostgreSQL).
3. **Web Dashboard (`/web`):** Next.js 14 frontend. Connects to Supabase Realtime to stream live SOS dots onto a Leaflet map. Visualizes AI predictions.
4. **Mobile App (`/mobile`):** React Native (Expo) app. Receives FCM pushes from Backend. Runs the Bluetooth Nearby Connections API for offline mesh.

---

## 10. COMPLETE TECH STACK

**AI & Prediction (Data Science):**
*   Python, Pandas, Scikit-Learn (Random Forest)
*   APIs: Tomorrow.io (Rain), AgroMonitoring (Soil), Open-Elevation (Slope), USGS (Seismic)

**Backend (API & WebSockets):**
*   FastAPI, Uvicorn, Joblib (Model loading)
*   Database: Supabase (PostgreSQL + PostGIS for spatial queries)
*   Messaging: Firebase Admin SDK (FCM)

**Mobile App (Citizen):**
*   React Native 0.74, Expo SDK 51, Zustand
*   Offline Maps: `@maplibre/maplibre-react-native` + Protomaps (PMTiles)
*   Mesh: `react-native-google-nearby-connections`

**Web Dashboard (Govt):**
*   Next.js 14 (App Router), Tailwind CSS
*   Maps: `react-leaflet`, `leaflet.heat`, `leaflet-markercluster`

---

## 11. JUDGE Q&A (How to win the room)

**Q: "The PS asks for a Prediction System. This looks like a response app. Where is the AI?"**
A: "Our backend runs a Random Forest ML model analyzing 5 live data streams. But as we saw in the Nepal 2024 floods, a 100% accurate prediction is useless if cell towers fall and the warning doesn't reach the village. We built the AI to *trigger* the alert, and the Bluetooth mesh app to *guarantee* delivery. It is a true End-to-End system."

**Q: "Why did you include Seismic data? Floods are caused by rain."**
A: "Not in the Himalayas. The August 2026 Langtang Lirung disaster was a rock-ice collapse. Weather APIs predicted clear skies, while 1000 people died. Our AI monitors Cryo-Seismic signatures to detect Glacial Lake Outbursts (GLOFs) before the water even hits."

**Q: "How do you handle 5000 SOS requests at once?"**
A: "We don't expect NDRF to read a list of 5000 names. Our backend uses a K-Means Clustering algorithm (via PostGIS) to group SOS events geographically. The dashboard tells the commander: 'Cluster A has 47 people, send Team 1 here.' It is the same triage system FEMA uses."

---

## 12. TEAM TASKS & INDEPENDENT WORKFLOW

*   **PRIYANSHU (Mobile App):** Inside `mobile/`. Build the Home Screen (showing the AI's RED/ORANGE alert), the SOS button, and the Triage Modal.
*   **SHIVENDRA (Web Dashboard):** Inside `web/`. Build the Next.js map showing the Live Dots (SOS/Safe) and the "AI Prediction Analytics" charts.
*   **TEAMMATE 3 (Backend API):** Inside `backend/`. Run the FastAPI server. Ensure it loads the `.pkl` model and serves the `/predict` endpoint.
*   **TEAMMATE 4 (AI Model & Data):** Inside `ai_model/`. Tweak the `generate_data.py` logic to make the historical dataset perfectly realistic, run `train_model.py`, and ensure the `.pkl` updates for the backend.

---
**Document:** NEERNETRA_COMPLETE_SOLUTION_V3.md
**Version:** 3.0 (AI + Monorepo Update) | September 11, 2026
**Team NeerNetra | GLA University | Mathura, UP**
