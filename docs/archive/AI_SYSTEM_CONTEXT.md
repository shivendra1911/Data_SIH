# NEERNETRA — SYSTEM ARCHITECTURE & API CONTRACT
## ⚠️ AI CONTEXT FILE 
**If you are an AI Coding Assistant (Antigravity, Cursor, Copilot) reading this file:** This is the master source of truth for the NeerNetra Monorepo. Adhere strictly to the data flows, API endpoints, and architectural boundaries defined below when generating code for any of the 4 subsystems.

---

## 1. SYSTEM TOPOLOGY & MONOREPO STRUCTURE

The NeerNetra system is decoupled into 4 distinct micro-environments:

1.  **`/ai_model` (The Brain):** Offline Python environment. Generates Hybrid Training Data (NASA POWER 10-year historical baseline + Synthetic GLOF/Cloudburst Data Augmentation), trains a `RandomForestClassifier` using `scikit-learn`, and serializes the model to `../backend/neernetra_model.pkl`.
2.  **`/backend` (The Nervous System):** Python FastAPI server running on `localhost:8000`. It is the central router. Loads the `.pkl` model, fetches external APIs, calculates predictions, and exposes REST endpoints.
3.  **`/web` (The Command Center):** Next.js 14 frontend running on `localhost:3000`. Used by NDRF/Govt. Consumes unified live dashboard telemetry and tactical geospatial radar from the backend.
4.  **`/mobile` (The Edge Node):** React Native Expo app running on `localhost:8081`. Used by citizens. Receives alerts, triggers SOS, and runs the Bluetooth offline mesh.

---

## 2. THE CORE WORKFLOW (End-to-End Data Flow)

### Phase 1: Prediction & Alerting
1.  **Fetch:** Every 15 minutes, the `backend` (via APScheduler/Celery) calls Tomorrow.io (Rain), AgroMonitoring (Soil), USGS (Seismic), and Open-Elevation (Slope).
2.  **Predict:** `backend` passes this 5-factor array into `neernetra_model.predict_proba()`.
3.  **Threshold:** If flood probability > 55% (ORANGE) or > 75% (RED), `backend` updates sector state and persists live alerts to Google Cloud Firestore.
4.  **Broadcast:** `backend` triggers a Firebase Cloud Messaging (FCM) push notification to the `mobile` app topic (e.g., `zone_chamoli_01`).

### Phase 2: Citizen Response & Offline Mesh
5.  **Alert:** `mobile` app wakes up, sounds the alarm, and displays the RED Triage Modal ([SAFE] / [SOS] / [HELPING]).
6.  **Action:** User presses **[SOS]**.
7.  **Offline Routing:** If internet is down, `mobile` initiates Google Nearby Connections (BLE/WiFi Direct) and broadcasts the SOS packet to nearby phones. The mesh relays it until it finds a phone with 2G/Internet.
8.  **Upload:** Once internet is available, `mobile` sends a `POST /api/sos/trigger` to the `backend`.

### Phase 3: Dashboard Triage & Rescue
9.  **Ingest:** `backend` receives the SOS, validates coordinates, updates the thread-safe in-memory cache, and asynchronously writes to Google Cloud Firestore (`sos_events` collection).
10. **Stream:** Fast REST overview updates stream live GPS beacons and active distress events to the `web` command dashboard.
11. **Visualize:** Next.js `web` plots pulsing markers on the Tactical Geospatial Radar.
12. **Cluster:** The `backend` runs real-time spatial proximity clustering (~5.5km grouping) via `GET /api/sos/clusters` and returns prioritized NDRF rescue targets.

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

## 4. DATABASE ARCHITECTURE (Google Cloud Firestore + Thread-Safe In-Memory Cache)

**Firestore Collection: `citizen_locations`**
*   `device_uuid` (string, document ID)
*   `lat`, `lng` (float, WGS84 coordinates)
*   `altitude` (float, meters)
*   `accuracy` (float)
*   `battery_level` (int)
*   `status` (string: "ACTIVE", "SOS", "SAFE", "HELPING")
*   `zone_id` (string: e.g. "chamoli_01")
*   `last_synced_at` (ISO timestamp)
*   `server_received_at` (ISO timestamp)

**Firestore Collection: `sos_events`**
*   `id` (string, document ID)
*   `device_uuid` (string)
*   `lat`, `lng` (float)
*   `status` (string)
*   `sos_type` (string: "TRAPPED", "MEDICAL", "EVACUATION", "FOOD_WATER")
*   `is_mesh_relayed` (boolean)
*   `received_at` (ISO timestamp)
*   `notes` (string)

**Firestore Collection: `dispatched_rescues`**
*   `dispatch_id` (string)
*   `cluster_id` (int)
*   `squad_type` (string: "HELICOPTER", "BOAT", "MEDICAL", "GROUND")
*   `zone_id` (string)
*   `assigned_unit` (string)
*   `status` (string: "EN_ROUTE", "ON_SITE", "COMPLETED")
*   `eta_minutes` (int)
*   `dispatched_at` (ISO timestamp)

---

## 5. AI GENERATION RULES FOR SPECIFIC FOLDERS

**If you are generating code in `/mobile`:**
*   Use React Native + Expo + TypeScript.
*   Assume the backend is available at `EXPO_PUBLIC_API_URL` (with active venue LAN IP fallback for physical phones).
*   Prioritize offline-first behavior (AsyncStorage for queued SOS, multi-hop BLE mesh relay).

**If you are generating code in `/web`:**
*   Use Next.js 14 App Router + Lucide Icons.
*   Use lightweight, bandwidth-efficient Tactical Himalayan Vector Radar for offline mission resilience.
*   Use adaptive visibility polling with AbortControllers.

**If you are generating code in `/backend`:**
*   Use FastAPI + Pydantic v2.
*   Use Google Cloud Firestore via `firebase-admin` for persistent cloud synchronization.
*   Maintain thread safety using `threading.RLock()` across in-memory real-time state.
*   Always include `CORS` middleware allowing `localhost:3000` and mobile clients.

**If you are generating code in `/ai_model`:**
*   Use `pandas` and `scikit-learn`.
*   Ensure the output `.pkl` is saved directly to `../backend/neernetra_model.pkl`.
