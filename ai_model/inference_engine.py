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

_cached_model = None

def get_model(model_path=None):
    global _cached_model
    if _cached_model is not None:
        return _cached_model

    candidates = [model_path, BACKEND_MODEL_PATH, DEFAULT_MODEL_PATH]
    for p in candidates:
        if p and os.path.exists(p):
            try:
                _cached_model = joblib.load(p)
                return _cached_model
            except Exception as e:
                print(f"[InferenceEngine] Warning: Could not load {p}: {e}")

    raise FileNotFoundError("Could not find a valid neernetra_model.pkl file.")


def normalize_input(data):
    """
    Normalizes any format (dict, list, tuple, np.ndarray) into a standardized 
    5-factor pandas DataFrame with proper units.
    """
    if isinstance(data, dict):
        # 1. Rainfall (mm/hr)
        rain = data.get("rainfall_mm_hr", data.get("rainfall_mm", data.get("rain", 0.0)))
        
        # 2. Soil Moisture (%) - Handle fractions (0.0 - 1.0) vs percentages (0 - 100)
        soil = data.get("soil_moisture_pct", data.get("soil_moisture", data.get("soil", 50.0)))
        if soil <= 1.0 and soil > 0.0:
            soil = soil * 100.0

        # 3. Terrain Slope (degrees)
        slope = data.get("terrain_slope_deg", data.get("slope_angle_deg", data.get("slope", 25.0)))

        # 4. River Water Level (meters) - Handle river discharge (m3/s) conversion if given
        if "river_water_level_m" in data:
            river = data["river_water_level_m"]
        elif "river_discharge_m3s" in data:
            # Empirical Himalayan river stage rating curve: Level ~ (Discharge / 150)^0.45
            discharge = max(10.0, data["river_discharge_m3s"])
            river = min(15.0, (discharge / 120.0) ** 0.48)
        else:
            river = data.get("river_level", data.get("river", 2.5))

        # 5. Seismic Magnitude (Richter)
        seismic = data.get("seismic_magnitude", data.get("seismic_mag", data.get("seismic", 0.0)))

        row = [float(rain), float(soil), float(slope), float(river), float(seismic)]

    elif isinstance(data, (list, tuple, np.ndarray)):
        arr = list(data)
        if len(arr) != 5:
            raise ValueError(f"Expected 5 features, got {len(arr)}")
        
        rain, soil, slope, river, seismic = [float(x) for x in arr]
        if soil <= 1.0 and soil > 0.0:
            soil = soil * 100.0
        row = [rain, soil, slope, river, seismic]
    else:
        raise TypeError(f"Unsupported data type: {type(data)}")

    return pd.DataFrame([row], columns=FEATURE_NAMES)


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
