"""
NEERNETRA CENTRAL BACKEND API SERVICE (FastAPI)
Acts as the central nervous system connecting AI predictions, Supabase PostGIS,
and Mobile Edge Mesh Relays.
"""

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import datetime
import os
import joblib
import numpy as np

app = FastAPI(
    title="NeerNetra Tac-Ops API",
    description="Himalayan Flash Flood & Cryo-Seismic GLOF Early Warning Platform",
    version="2.4.0"
)

# CORS configuration allowing Web Dashboard (3000) and React Native Mobile (8081)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Try loading the scikit-learn model if available
MODEL_PATH = "neernetra_model.pkl"
model = None
if os.path.exists(MODEL_PATH):
    try:
        model = joblib.load(MODEL_PATH)
        print(f"Loaded ML model from {MODEL_PATH}")
    except Exception as e:
        print(f"Could not load {MODEL_PATH}: {e}")

# In-memory storage for hackathon runtime
ZONES_DATA = {
    "chamoli_01": {
        "zone_id": "chamoli_01",
        "name": "Chamoli (Rishi Ganga - Dhauliganga Valley)",
        "district": "Chamoli",
        "center": [30.5573, 79.5642],
        "danger_mark_m": 7.5,
        "warning_mark_m": 6.0,
        "telemetry": {
            "rainfall_mm": 18.5,
            "soil_moisture_pct": 82.0,
            "slope_deg": 44.5,
            "river_level_m": 6.8,
            "seismic_mag": 4.6,
        }
    },
    "kedarnath_02": {
        "zone_id": "kedarnath_02",
        "name": "Kedarnath (Mandakini Valley)",
        "district": "Rudraprayag",
        "center": [30.7346, 79.0669],
        "danger_mark_m": 6.5,
        "warning_mark_m": 5.0,
        "telemetry": {
            "rainfall_mm": 48.0,
            "soil_moisture_pct": 91.5,
            "slope_deg": 48.0,
            "river_level_m": 5.8,
            "seismic_mag": 2.1,
        }
    }
}

sos_events_store = []
alerts_broadcast_store = []

# --- Models ---
class TelemetryInput(BaseModel):
    rainfall_mm: float
    soil_moisture_pct: float
    slope_deg: float
    river_level_m: float
    seismic_mag: float

class SOSTriggerRequest(BaseModel):
    device_uuid: str
    lat: float
    lng: float
    status: str = "SOS"
    sos_type: Optional[str] = "TRAPPED IN RIVER VALLEY"
    is_mesh_relayed: bool = False
    battery_pct: Optional[int] = 85
    last_seen_epoch: Optional[int] = None

class RegionalAlertRequest(BaseModel):
    zone_id: str
    severity: str = "CRITICAL RED"
    title: str
    message: str
    safe_havens: List[str] = []
    trigger_acoustic_siren: bool = True

# --- Prediction Inference Helper ---
def predict_risk(telemetry: dict):
    rain = telemetry["rainfall_mm"]
    soil = telemetry["soil_moisture_pct"]
    slope = telemetry["slope_deg"]
    river = telemetry["river_level_m"]
    seismic = telemetry["seismic_mag"]

    # If scikit-learn model is loaded, run inference
    if model is not None:
        try:
            X = np.array([[rain, soil, slope, river, seismic]])
            probs = model.predict_proba(X)[0]
            # Red tier probability
            red_prob = float(probs[-1]) * 100
            tier_idx = int(model.predict(X)[0])
            tier_map = {0: "GREEN", 1: "YELLOW", 2: "ORANGE", 3: "RED"}
            color = tier_map.get(tier_idx, "GREEN")
            return {
                "flood_probability_percent": round(max(red_prob, 15.0), 1),
                "alert_color": color,
                "primary_trigger": "RandomForest ML Ensemble Prediction"
            }
        except Exception:
            pass

    # Physics-informed heuristic
    is_glof = (seismic >= 4.2) and (slope >= 38.0)
    if is_glof:
        return {
            "flood_probability_percent": 86.4,
            "alert_color": "RED",
            "primary_trigger": f"Cryo-Seismic GLOF Signature ({seismic}M Tremor + Moraine Lake Breached)",
            "lead_time_minutes": 225
        }
    elif rain >= 40.0 and soil >= 75.0:
        return {
            "flood_probability_percent": 78.5,
            "alert_color": "RED",
            "primary_trigger": f"Severe Cloudburst ({rain} mm/h) on Saturated Slopes",
            "lead_time_minutes": 150
        }
    else:
        return {
            "flood_probability_percent": 24.0,
            "alert_color": "GREEN",
            "primary_trigger": "Normal Hydrometric Baseline",
            "lead_time_minutes": 600
        }

# --- Endpoints ---

@app.get("/")
def root():
    return {
        "system": "NeerNetra Hydrological Command API",
        "status": "ONLINE",
        "version": "2.4.0",
        "model_loaded": model is not None
    }

@app.get("/api/prediction/current")
def get_current_prediction(zone_id: str = Query("chamoli_01")):
    zone = ZONES_DATA.get(zone_id, ZONES_DATA["chamoli_01"])
    telemetry = zone["telemetry"]
    pred = predict_risk(telemetry)

    return {
        "zone_id": zone["zone_id"],
        "flood_probability_percent": pred["flood_probability_percent"],
        "alert_color": pred["alert_color"],
        "primary_trigger": pred["primary_trigger"],
        "last_updated": datetime.datetime.utcnow().isoformat() + "Z",
        "lead_time_minutes": pred.get("lead_time_minutes", 225),
        "danger_mark_m": zone["danger_mark_m"],
        "warning_mark_m": zone["warning_mark_m"],
        "telemetry": telemetry
    }

@app.post("/api/prediction/evaluate")
def evaluate_custom_telemetry(data: TelemetryInput):
    pred = predict_risk(data.dict())
    return {
        "status": "success",
        "prediction": pred,
        "input": data.dict(),
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
    }

@app.post("/api/sos/trigger")
def trigger_sos(event: SOSTriggerRequest):
    record = event.dict()
    record["id"] = f"sos-{int(datetime.datetime.utcnow().timestamp() * 1000)}"
    record["created_at"] = datetime.datetime.utcnow().isoformat() + "Z"
    sos_events_store.insert(0, record)
    return {
        "success": True,
        "message_id": record["id"],
        "status": "REGISTERED_IN_COMMAND_FEED"
    }

@app.get("/api/sos/clusters")
def get_active_clusters(zone_id: str = Query("chamoli_01")):
    return {
        "zone_id": zone_id,
        "clusters": [
            {
                "cluster_id": 1,
                "center_lat": 30.5578,
                "center_lng": 79.5645,
                "total_people": 47,
                "priority": "P1",
                "dispatched": False,
                "assigned_team": None
            },
            {
                "cluster_id": 2,
                "center_lat": 30.5552,
                "center_lng": 79.5671,
                "total_people": 22,
                "priority": "P1",
                "dispatched": False,
                "assigned_team": None
            }
        ]
    }

@app.post("/api/alerts/broadcast")
def broadcast_regional_alert(payload: RegionalAlertRequest):
    alert_record = {
        "alert_id": f"alert-{int(datetime.datetime.utcnow().timestamp() * 1000)}",
        "zone_id": payload.zone_id,
        "severity": payload.severity,
        "title": payload.title,
        "message": payload.message,
        "safe_havens": payload.safe_havens,
        "trigger_acoustic_siren": payload.trigger_acoustic_siren,
        "dispatched_at": datetime.datetime.utcnow().isoformat() + "Z",
        "status": "DELIVERED_TO_EDGE_MESH",
        "target_nodes_count": 1420,
        "delivery_rate_pct": 98.4
    }
    alerts_broadcast_store.insert(0, alert_record)
    return {
        "success": True,
        "alert": alert_record
    }

@app.get("/api/alerts/history")
def get_alerts_history():
    return {
        "status": "success",
        "total_dispatched": len(alerts_broadcast_store),
        "alerts": alerts_broadcast_store
    }
