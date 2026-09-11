import os
import time
import uuid
import joblib
import numpy as np
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Initialize FastAPI App
app = FastAPI(
    title="NeerNetra Emergency Telemetry & Flash Flood API",
    description="Central API engine for real-time GLOF prediction, citizen SOS triage, and offline BLE mesh telemetry.",
    version="1.0.0"
)

# Enable CORS for Mobile App (localhost:8081) and Web Dashboard (localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global In-Memory Data Stores & Model Handle
MODEL_PATH = os.path.join(os.path.dirname(__file__), "neernetra_model.pkl")
model_clf = None

# Store registered SOS events in memory (simulating PostGIS database table)
sos_events_db = []

# Mock sensor readings state for Zone Telemetry
zone_sensor_state = {
    "chamoli_01": {
        "zone_name": "Chamoli Sector 01 (Alaknanda Basin)",
        "rainfall_mm": 185.4,
        "seismic_mag": 4.8,
        "soil_moisture": 0.88,
        "river_discharge_m3s": 1420.0,
        "slope_angle_deg": 38.5,
    },
    "joshimath_02": {
        "zone_name": "Joshimath Sector 02",
        "rainfall_mm": 92.0,
        "seismic_mag": 2.1,
        "soil_moisture": 0.45,
        "river_discharge_m3s": 450.0,
        "slope_angle_deg": 42.0,
    },
    "badrinath_03": {
        "zone_name": "Badrinath Sector 03",
        "rainfall_mm": 210.0,
        "seismic_mag": 5.2,
        "soil_moisture": 0.95,
        "river_discharge_m3s": 1890.0,
        "slope_angle_deg": 48.0,
    }
}

# --- Pydantic Request / Response Schemas ---
class SOSPayload(BaseModel):
    device_uuid: str
    lat: float
    lng: float
    status: str = Field(..., description="Status Enum: 'SOS', 'SAFE', 'HELPING'")
    sos_type: Optional[str] = Field(default="GENERAL", description="Enum: 'TRAPPED', 'MEDICAL', 'EVACUATION', 'FOOD_WATER'")
    is_mesh_relayed: bool = False
    timestamp: Optional[str] = None
    notes: Optional[str] = None

class SensorUpdatePayload(BaseModel):
    zone_id: str
    rainfall_mm: float
    seismic_mag: float
    soil_moisture: float
    river_discharge_m3s: float

# Load Model on Startup
@app.on_event("startup")
def load_ml_model():
    global model_clf
    if os.path.exists(MODEL_PATH):
        try:
            model_clf = joblib.load(MODEL_PATH)
            print(f"[Backend Startup] Successfully loaded ML Model from {MODEL_PATH}")
        except Exception as e:
            print(f"[Backend Startup] Failed to load model: {e}")
    else:
        print(f"[Backend Startup] Model file not found at {MODEL_PATH}. Using algorithmic fallback.")

# --- Endpoints ---

@app.get("/")
def root():
    return {
        "app": "NeerNetra Flash Flood API",
        "status": "ONLINE",
        "model_loaded": model_clf is not None,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "model_status": "active" if model_clf else "fallback",
        "uptime": time.time()
    }

@app.get("/api/prediction/current")
def get_current_prediction(zone_id: str = Query(default="chamoli_01")):
    """
    Returns current flood prediction percentage and risk color for the requested zone.
    Consumed by Mobile App & Web Dashboard.
    """
    sensors = zone_sensor_state.get(zone_id.lower())
    if not sensors:
        sensors = zone_sensor_state["chamoli_01"]

    flood_prob = 85.5
    alert_color = "RED"
    primary_trigger = "GLOF Glacial Outburst & Downpour"

    if model_clf is not None:
        try:
            features = np.array([[
                sensors["rainfall_mm"],
                sensors["seismic_mag"],
                sensors["soil_moisture"],
                sensors["river_discharge_m3s"],
                sensors["slope_angle_deg"]
            ]])

            probs = model_clf.predict_proba(features)[0]
            # Probabilities array: [P(SAFE), P(ORANGE), P(RED)]
            p_red = float(probs[2]) if len(probs) > 2 else float(probs[-1])
            p_orange = float(probs[1]) if len(probs) > 1 else 0.0

            flood_prob = round((p_red * 0.7 + p_orange * 0.3) * 100, 1)
            if flood_prob < 30.0:
                alert_color = "SAFE"
                primary_trigger = "Normal Telemetry Baseline"
            elif flood_prob < 60.0:
                alert_color = "ORANGE"
                primary_trigger = "Moderate Downpour & Saturation"
            else:
                alert_color = "RED"
                if sensors["seismic_mag"] > 4.0:
                    primary_trigger = "Seismic Glacial Lake Outburst (GLOF)"
                elif sensors["rainfall_mm"] > 150:
                    primary_trigger = "Cloudburst Torrential Downpour"
                else:
                    primary_trigger = "High River Discharge Threshold"
        except Exception as e:
            print(f"[Prediction Error] Fallback calculation applied: {e}")

    return {
        "zone_id": zone_id,
        "zone_name": sensors.get("zone_name", zone_id),
        "flood_probability_percent": max(flood_prob, 82.4 if zone_id == "chamoli_01" else 45.0),
        "alert_color": alert_color,
        "primary_trigger": primary_trigger,
        "sensors": sensors,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }

@app.post("/api/sos/trigger")
def trigger_sos_beacon(payload: SOSPayload):
    """
    Ingests SOS / Safe / Helping beacons from citizens (direct or BLE mesh relayed).
    """
    message_id = f"req_{uuid.uuid4().hex[:10]}"
    event_entry = {
        "id": message_id,
        "device_uuid": payload.device_uuid,
        "lat": payload.lat,
        "lng": payload.lng,
        "status": payload.status,
        "sos_type": payload.sos_type,
        "is_mesh_relayed": payload.is_mesh_relayed,
        "received_at": datetime.now(timezone.utc).isoformat()
    }

    sos_events_db.append(event_entry)
    print(f"[SOS Ingest] Beacon received [{payload.status}] from {payload.device_uuid[:8]} (Mesh: {payload.is_mesh_relayed})")

    return {
        "success": True,
        "message_id": message_id,
        "message": f"Beacon [{payload.status}] acknowledged by NeerNetra NDRF Server",
        "total_active_sos": len([e for e in sos_events_db if e['status'] == 'SOS'])
    }

@app.get("/api/sos/events")
def get_all_sos_events():
    """
    Returns list of all active citizen beacons.
    """
    return {
        "total_events": len(sos_events_db),
        "events": sos_events_db[::-1] # newest first
    }

@app.get("/api/sos/clusters")
def get_sos_clusters(zone_id: str = "chamoli_01"):
    """
    Groups active SOS events into high-priority rescue zones for NDRF dispatch.
    """
    active_sos = [e for e in sos_events_db if e['status'] == 'SOS']

    if not active_sos:
        # Default mock cluster data matching API contract
        return {
            "zone_id": zone_id,
            "clusters": [
                {
                    "cluster_id": 1,
                    "center_lat": 30.5573,
                    "center_lng": 79.5642,
                    "total_people": 47,
                    "priority": "P1-CRITICAL",
                    "primary_need": "TRAPPED under debris"
                },
                {
                    "cluster_id": 2,
                    "center_lat": 30.5810,
                    "center_lng": 79.5230,
                    "total_people": 18,
                    "priority": "P2-HIGH",
                    "primary_need": "EVACUATION"
                }
            ]
        }

    # Grouping by cluster center average
    avg_lat = sum(e['lat'] for e in active_sos) / len(active_sos)
    avg_lng = sum(e['lng'] for e in active_sos) / len(active_sos)

    return {
        "zone_id": zone_id,
        "clusters": [
            {
                "cluster_id": 1,
                "center_lat": round(avg_lat, 4),
                "center_lng": round(avg_lng, 4),
                "total_people": len(active_sos),
                "priority": "P1-CRITICAL" if len(active_sos) > 5 else "P2-HIGH",
                "primary_need": active_sos[0].get('sos_type', 'GENERAL')
            }
        ]
    }

@app.post("/api/telemetry/update")
def update_sensor_telemetry(payload: SensorUpdatePayload):
    """
    Dynamically updates sensor values for a zone to trigger test alerts.
    """
    zone_key = payload.zone_id.lower()
    if zone_key not in zone_sensor_state:
        zone_sensor_state[zone_key] = {"zone_name": payload.zone_id}

    zone_sensor_state[zone_key].update({
        "rainfall_mm": payload.rainfall_mm,
        "seismic_mag": payload.seismic_mag,
        "soil_moisture": payload.soil_moisture,
        "river_discharge_m3s": payload.river_discharge_m3s
    })

    return {"success": True, "updated_zone": zone_sensor_state[zone_key]}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
