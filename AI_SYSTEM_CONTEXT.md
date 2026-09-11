# NEERNETRA — SYSTEM ARCHITECTURE & API CONTRACT
## ⚠️ AI CONTEXT FILE 
**If you are an AI Coding Assistant (Antigravity, Cursor, Copilot) reading this file:** This is the master source of truth for the NeerNetra Monorepo. Adhere strictly to the data flows, API endpoints, and architectural boundaries defined below when generating code for any of the 4 subsystems.

---

## 1. SYSTEM TOPOLOGY & MONOREPO STRUCTURE

The NeerNetra system is decoupled into 4 distinct micro-environments:

1.  **`/ai_model` (The Brain):** Offline Python environment. Generates Hybrid Training Data (NASA POWER 10-year historical baseline + Synthetic GLOF/Cloudburst Data Augmentation), trains a `RandomForestClassifier` using `scikit-learn`, and serializes the model to `../backend/neernetra_model.pkl`.
2.  **`/backend` (The Nervous System):** Python FastAPI server running on `localhost:8000`. It is the central router. Loads the `.pkl` model, fetches external APIs, calculates predictions, and exposes REST endpoints.
3.  **`/web` (The Command Center):** Next.js 14 frontend running on `localhost:3000`. Used by NDRF/Govt. Fetches data from Backend and streams live Supabase updates.
4.  **`/mobile` (The Edge Node):** React Native Expo app running on `localhost:8081`. Used by citizens. Receives alerts, triggers SOS, and runs the Bluetooth offline mesh.

---

## 2. THE CORE WORKFLOW (End-to-End Data Flow)

### Phase 1: Prediction & Alerting
1.  **Fetch:** Every 15 minutes, the `backend` (via APScheduler/Celery) calls Tomorrow.io (Rain), AgroMonitoring (Soil), USGS (Seismic), and Open-Elevation (Slope).
2.  **Predict:** `backend` passes this 5-factor array into `neernetra_model.predict_proba()`.
3.  **Threshold:** If flood probability > 55% (ORANGE) or > 75% (RED), `backend` updates the `zones` table in Supabase.
4.  **Broadcast:** `backend` triggers a Firebase Cloud Messaging (FCM) push notification to the `mobile` app topic (e.g., `zone_chamoli_01`).

### Phase 2: Citizen Response & Offline Mesh
5.  **Alert:** `mobile` app wakes up, sounds the alarm, and displays the RED Triage Modal ([SAFE] / [SOS] / [HELPING]).
6.  **Action:** User presses **[SOS]**.
7.  **Offline Routing:** If internet is down, `mobile` initiates Google Nearby Connections (BLE/WiFi Direct) and broadcasts the SOS packet to nearby phones. The mesh relays it until it finds a phone with 2G/Internet.
8.  **Upload:** Once internet is available, `mobile` sends a `POST /api/sos/trigger` to the `backend`.

### Phase 3: Dashboard Triage & Rescue
9.  **Ingest:** `backend` receives the SOS, validates the JWT, and inserts it into the Supabase `sos_events` table with PostGIS geospatial coordinates.
10. **Stream:** Supabase Realtime pushes the new row instantly to the `web` dashboard.
11. **Visualize:** Next.js `web` plots a pulsing Red Marker on the Leaflet map.
12. **Cluster:** If >50 SOS events occur, `web` calls `GET /api/sos/clusters`. The `backend` runs PostGIS `ST_ClusterKMeans` and returns grouped rescue zones.

---

## 3. API CONTRACTS (REST Endpoints)

The `backend` must expose these exact routes. The `mobile` and `web` must consume these exact formats.

### A. Get Current Zone Prediction
*   **Route:** `GET /api/prediction/current?zone_id={id}`
*   **Caller:** Mobile App (on load) & Web Dashboard
*   **Response:**
    ```json
    {
      "zone_id": "chamoli_01",
      "flood_probability_percent": 85.5,
      "alert_color": "RED",
      "primary_trigger": "Seismic GLOF Warning",
      "last_updated": "2026-09-11T14:30:00Z"
    }
    ```

### B. Trigger SOS / Triage Status
*   **Route:** `POST /api/sos/trigger`
*   **Caller:** Mobile App (when user clicks SOS or Safe)
*   **Payload:**
    ```json
    {
      "device_uuid": "550e8400-e29b-41d4-a716-446655440000",
      "lat": 30.5573,
      "lng": 79.5642,
      "status": "SOS",       // Enums: "SOS", "SAFE", "HELPING"
      "sos_type": "TRAPPED", // Optional
      "is_mesh_relayed": false 
    }
    ```
*   **Response:** `200 OK` `{"success": true, "message_id": "req_123"}`

### C. Get Active SOS Clusters (For NDRF Triage)
*   **Route:** `GET /api/sos/clusters?zone_id={id}`
*   **Caller:** Web Dashboard
*   **Response:**
    ```json
    {
      "clusters": [
        {
          "cluster_id": 1,
          "center_lat": 30.55,
          "center_lng": 79.56,
          "total_people": 47,
          "priority": "P1"
        }
      ]
    }
    ```

---

## 4. DATABASE SCHEMA (Supabase PostgreSQL)

**Table: `sensor_readings`**
*   `id` (uuid)
*   `zone_id` (text)
*   `rainfall_mm` (float)
*   `seismic_mag` (float)
*   `flood_prob` (float)
*   `created_at` (timestamp)

**Table: `sos_events`**
*   `id` (uuid)
*   `device_uuid` (text)
*   `location` (geometry Point 4326)
*   `status` (text)
*   `created_at` (timestamp)
*   *(Note: Requires PostGIS extension enabled in Supabase)*

---

## 5. AI GENERATION RULES FOR SPECIFIC FOLDERS

**If you are generating code in `/mobile`:**
*   Use React Native + Expo + TypeScript.
*   Assume the backend is available at `EXPO_PUBLIC_API_URL` (usually localhost:8000).
*   Prioritize offline-first behavior (AsyncStorage / SQLite for queued SOS).

**If you are generating code in `/web`:**
*   Use Next.js 14 App Router + Tailwind + Shadcn UI.
*   Use `react-leaflet` for maps. Do NOT use Google Maps (costs money, Leaflet is free).
*   Disable SSR for the map component (`next/dynamic` with `ssr: false`).

**If you are generating code in `/backend`:**
*   Use FastAPI + Pydantic v2.
*   Use `@supabase/supabase-js` or `httpx` to write to the DB.
*   Always include `CORS` middleware allowing `localhost:3000` and `localhost:8081`.

**If you are generating code in `/ai_model`:**
*   Use `pandas` and `scikit-learn`.
*   Ensure the output `.pkl` is saved directly to `../backend/neernetra_model.pkl`.
