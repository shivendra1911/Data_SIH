"""
NeerNetra Universal Model Inference Engine
Provides a robust, fail-safe prediction interface for the FastAPI backend,
mobile app services, and test harnesses. Automatically handles unit conversions,
feature alignment, and generates human-readable explanations.
"""

import os
import sys
import io
import math
import warnings
import joblib
import numpy as np
import pandas as pd

warnings.filterwarnings("ignore", category=UserWarning)

# Model path resolution
DEFAULT_MODEL_PATH = os.path.join(os.path.dirname(__file__), "neernetra_model_local.pkl")
BACKEND_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "backend", "neernetra_model.pkl")

FEATURE_NAMES = [
    "rainfall_mm_hr",
    "soil_moisture_pct",
    "terrain_slope_deg",
    "river_water_level_m",
    "seismic_magnitude"
]

_models = {}

def get_model(model_path=None):
    candidates = [model_path, BACKEND_MODEL_PATH, DEFAULT_MODEL_PATH]
    for p in candidates:
        if p and os.path.exists(p):
            abs_p = os.path.abspath(p)
            if abs_p not in _models:
                try:
                    _models[abs_p] = joblib.load(abs_p)
                except Exception as e:
                    print(f"[InferenceEngine] Warning: Could not load {p}: {e}")
                    continue
            return _models[abs_p]

    raise FileNotFoundError("Could not find a valid neernetra_model.pkl file.")


def _safe_float(val, default: float, min_val: float = None, max_val: float = None) -> float:
    if val is None:
        return default
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return default
        if min_val is not None:
            f = max(min_val, f)
        if max_val is not None:
            f = min(max_val, f)
        return f
    except (ValueError, TypeError):
        return default


def normalize_input(data):
    """
    Normalizes any format (dict, list, tuple, np.ndarray, DataFrame) into a standardized 
    5-factor pandas DataFrame with proper units and bounded physical values.
    """
    if isinstance(data, pd.DataFrame):
        df = data[FEATURE_NAMES].copy()
        df.fillna({"rainfall_mm_hr": 0.0, "soil_moisture_pct": 50.0, "terrain_slope_deg": 25.0, "river_water_level_m": 2.5, "seismic_magnitude": 0.0}, inplace=True)
        return df

    if isinstance(data, pd.Series):
        d = data.to_dict()
        return normalize_input(d)

    if isinstance(data, dict):
        # 1. Rainfall (mm/hr): bounded 0 to 500
        raw_rain = None
        for k in ["rainfall_mm_hr", "rainfall_mm", "rain"]:
            if k in data and data[k] is not None:
                raw_rain = data[k]
                break
        rain = _safe_float(raw_rain, 0.0, min_val=0.0, max_val=500.0)

        # 2. Soil Moisture (%): handle fractions (0.0 - 1.0) vs percentages (0 - 100)
        if "soil_moisture_pct" in data and data["soil_moisture_pct"] is not None:
            soil = _safe_float(data["soil_moisture_pct"], 50.0, min_val=0.0, max_val=100.0)
        elif "soil_moisture" in data and data["soil_moisture"] is not None:
            raw_soil = _safe_float(data["soil_moisture"], 0.5)
            soil = raw_soil * 100.0 if raw_soil <= 1.0 and raw_soil > 0.0 else raw_soil
            soil = max(0.0, min(100.0, soil))
        else:
            soil = _safe_float(data.get("soil"), 50.0, min_val=0.0, max_val=100.0)

        # 3. Terrain Slope (degrees): bounded 0 to 90
        raw_slope = None
        for k in ["terrain_slope_deg", "slope_angle_deg", "slope"]:
            if k in data and data[k] is not None:
                raw_slope = data[k]
                break
        slope = _safe_float(raw_slope, 25.0, min_val=0.0, max_val=90.0)

        # 4. River Water Level (meters): Calibrated Himalayan stage curve ~ 0.42 * (discharge ** 0.41)
        if "river_water_level_m" in data and data["river_water_level_m"] is not None:
            river = _safe_float(data["river_water_level_m"], 2.5, min_val=0.1, max_val=25.0)
        elif "river_discharge_m3s" in data and data["river_discharge_m3s"] is not None:
            discharge = max(10.0, _safe_float(data["river_discharge_m3s"], 150.0))
            river = round(min(15.0, 0.42 * (discharge ** 0.41)), 2)
        else:
            river = _safe_float(data.get("river_level", data.get("river")), 2.5, min_val=0.1, max_val=25.0)

        # 5. Seismic Magnitude (Richter): bounded 0 to 10.0
        raw_seismic = None
        for k in ["seismic_magnitude", "seismic_mag", "seismic"]:
            if k in data and data[k] is not None:
                raw_seismic = data[k]
                break
        seismic = _safe_float(raw_seismic, 0.0, min_val=0.0, max_val=10.0)

        row = [rain, soil, slope, river, seismic]

    elif isinstance(data, (list, tuple, np.ndarray)):
        arr = np.array(data).flatten().tolist()
        if len(arr) != 5:
            raise ValueError(f"Expected 5 features, got {len(arr)}")

        rain = _safe_float(arr[0], 0.0, 0.0, 500.0)
        soil = _safe_float(arr[1], 50.0, 0.0, 100.0)
        if 0.0 < soil <= 1.0:
            soil = soil * 100.0
        slope = _safe_float(arr[2], 25.0, 0.0, 90.0)
        river = _safe_float(arr[3], 2.5, 0.1, 25.0)
        seismic = _safe_float(arr[4], 0.0, 0.0, 10.0)
        row = [rain, soil, slope, river, seismic]
    else:
        raise TypeError(f"Unsupported data type: {type(data)}")

    df = pd.DataFrame([row], columns=FEATURE_NAMES)
    df.fillna({"rainfall_mm_hr": 0.0, "soil_moisture_pct": 50.0, "terrain_slope_deg": 25.0, "river_water_level_m": 2.5, "seismic_magnitude": 0.0}, inplace=True)
    return df


def predict_flood_risk(sensor_data, model_path=None):
    """
    Main entry point for predictions. Returns complete API-ready dictionary.
    """
    model = get_model(model_path)
    df_features = normalize_input(sensor_data)

    # Predict probabilities
    probs = model.predict_proba(df_features)[0]
    
    # Class 1 is flood hazard
    prob_percent = float(probs[1] * 100.0)

    # Extract individual normalized factors
    rain = float(df_features["rainfall_mm_hr"].iloc[0])
    soil = float(df_features["soil_moisture_pct"].iloc[0])
    slope = float(df_features["terrain_slope_deg"].iloc[0])
    river = float(df_features["river_water_level_m"].iloc[0])
    seismic = float(df_features["seismic_magnitude"].iloc[0])

    # Determine alert color
    if prob_percent >= 75.0:
        alert_color = "RED"
    elif prob_percent >= 55.0:
        alert_color = "ORANGE"
    elif prob_percent >= 35.0:
        alert_color = "YELLOW"
    else:
        alert_color = "GREEN"

    # Physics-based primary trigger classification & explanation
    is_glof = (seismic >= 4.0 and slope >= 25.0) or (seismic >= 4.5 and river >= 7.0)
    is_cloudburst = rain >= 70.0 or (rain >= 50.0 and soil >= 80.0)
    is_river_overflow = river >= 7.5
    is_saturation_runoff = soil >= 85.0 and rain >= 30.0

    if alert_color in ["RED", "ORANGE"]:
        if is_glof:
            primary_trigger = "Seismic GLOF & Cryospheric Avalanche Warning"
            explanation = f"Detected significant seismic tremor ({seismic:.1f} Richter) on steep terrain ({slope:.1f}°). High probability of glacial lake breach or rock-ice avalanche."
        elif is_cloudburst:
            primary_trigger = "Cloudburst & Torrential Flash Flood"
            explanation = f"Extreme rainfall rate ({rain:.1f} mm/hr) over saturated ground ({soil:.1f}%). Rapid surface runoff expected."
        elif is_river_overflow:
            primary_trigger = "River Stage Surge Above Danger Mark"
            explanation = f"River level reached {river:.2f}m, exceeding critical hydrological danger threshold."
        elif is_saturation_runoff:
            primary_trigger = "Saturated Soil Runoff Multiplier"
            explanation = f"Soil capacity saturated at {soil:.1f}% under persistent rainfall ({rain:.1f} mm/hr)."
        else:
            primary_trigger = "Composite Hydrological Hazard"
            explanation = f"Compound interaction of rainfall ({rain:.1f} mm/hr) and river stage ({river:.2f}m)."
    elif alert_color == "YELLOW":
        primary_trigger = "Elevated Runoff Watch"
        explanation = f"Moderate environmental factors detected. System in active watch state."
    else:
        primary_trigger = "Normal Hydrological Baseline"
        explanation = "All sensor telemetry remains within safe historical operating limits."

    return {
        "flood_probability_percent": round(prob_percent, 1),
        "alert_color": alert_color,
        "primary_trigger": primary_trigger,
        "explanation": explanation,
        "factors": {
            "rainfall_mm_hr": round(rain, 2),
            "soil_moisture_pct": round(soil, 2),
            "terrain_slope_deg": round(slope, 2),
            "river_water_level_m": round(river, 2),
            "seismic_magnitude": round(seismic, 2)
        },
        "is_flood_hazard": bool(prob_percent >= 50.0)
    }


if __name__ == "__main__":
    # Test cases
    print("=" * 65)
    print("  NEERNETRA UNIVERSAL INFERENCE ENGINE SELF-TEST")
    print("=" * 65)

    test_samples = [
        ("Normal Sunny Day", {"rainfall_mm": 2.0, "soil_moisture": 0.25, "slope": 20.0, "river": 2.1, "seismic": 0.0}),
        ("Kedarnath 2013 Cloudburst", {"rainfall_mm": 165.0, "soil_moisture": 95.0, "slope": 48.0, "river": 12.0, "seismic": 0.8}),
        ("Nepal 2026 GLOF (Zero Rain)", {"rainfall_mm": 0.0, "soil_moisture": 35.0, "slope": 55.0, "river": 11.0, "seismic": 5.2}),
        ("Backend Discharge Format", {"rainfall_mm": 185.4, "seismic_mag": 4.8, "soil_moisture": 0.88, "river_discharge_m3s": 1420.0, "slope_angle_deg": 38.5})
    ]

    for name, sample in test_samples:
        res = predict_flood_risk(sample)
        print(f"\nScenario: {name}")
        print(f"  Probability: {res['flood_probability_percent']}% | Alert: {res['alert_color']}")
        print(f"  Trigger:     {res['primary_trigger']}")
        print(f"  Explanation: {res['explanation']}")
