"""
NeerNetra AI Model Engine - Hybrid Dataset Generator
Generates a 10,000-row synthetic hybrid dataset modeling Himalayan flash floods,
cloudbursts, and cryo-seismic Glacial Lake Outburst Floods (GLOFs) like Nepal 2026.
"""

import sys
import numpy as np
import pandas as pd
import os

# Ensure clean UTF-8 stdout on Windows console
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

def generate_hybrid_dataset(n_samples=10000, seed=42, output_path="neernetra_hybrid_dataset.csv"):
    np.random.seed(seed)
    print(f"[*] Generating {n_samples}-row NeerNetra Hybrid Dataset...")

    # 1. Distribution breakdown:
    # 60% Normal / Low-Risk baseline (NASA POWER simulated historical)
    # 15% Monsoon Watch / Elevated Risk
    # 13% Cryo-Seismic GLOF / Avalanche events (Nepal 2026 Langtang scenario)
    # 12% Extreme Cloudburst events
    
    n_normal = int(n_samples * 0.60)
    n_monsoon = int(n_samples * 0.15)
    n_glof = int(n_samples * 0.13)
    n_cloudburst = n_samples - n_normal - n_monsoon - n_glof

    # --- Category A: Baseline Normal Historical (6,000 samples) ---
    rain_normal = np.random.gamma(shape=1.5, scale=4.0, size=n_normal) # 0 - 25 mm/hr
    soil_normal = np.random.uniform(15.0, 55.0, size=n_normal)         # 15 - 55%
    slope_normal = np.random.uniform(5.0, 45.0, size=n_normal)          # 5 - 45 deg
    river_normal = np.random.normal(loc=2.5, scale=0.8, size=n_normal)  # 1.0 - 4.5 m
    river_normal = np.clip(river_normal, 0.8, 4.5)
    seismic_normal = np.random.exponential(scale=0.6, size=n_normal)    # 0.0 - 3.2 Richter
    seismic_normal = np.clip(seismic_normal, 0.0, 3.2)

    # --- Category B: Monsoon Watch / Elevated Runoff (1,500 samples) ---
    rain_monsoon = np.random.uniform(25.0, 60.0, size=n_monsoon)        # 25 - 60 mm/hr
    soil_monsoon = np.random.uniform(55.0, 80.0, size=n_monsoon)        # 55 - 80%
    slope_monsoon = np.random.uniform(15.0, 50.0, size=n_monsoon)       # 15 - 50 deg
    river_monsoon = np.random.uniform(4.5, 7.0, size=n_monsoon)         # 4.5 - 7.0 m
    seismic_monsoon = np.random.uniform(0.5, 3.5, size=n_monsoon)       # 0.5 - 3.5 Richter

    # --- Category C: Cryo-Seismic GLOF Events (1,300 samples - Nepal 2026 Fix) ---
    # Crucial innovation: Zero or low rainfall, but high seismic tremor on steep slopes causing glacial lake breach!
    rain_glof = np.random.exponential(scale=3.0, size=n_glof)           # 0 - 15 mm/hr (Low or zero rain!)
    soil_glof = np.random.uniform(30.0, 75.0, size=n_glof)              # 30 - 75%
    slope_glof = np.random.uniform(30.0, 60.0, size=n_glof)             # 30 - 60 deg (Steep glacial valleys)
    river_glof = np.random.uniform(7.2, 12.0, size=n_glof)              # 7.2 - 12.0 m (Catastrophic water surge)
    seismic_glof = np.random.uniform(4.3, 7.5, size=n_glof)             # 4.3 - 7.5 Richter (Trigger tremor!)

    # --- Category D: Cloudburst Disasters (1,200 samples) ---
    rain_cloudburst = np.random.uniform(65.0, 150.0, size=n_cloudburst) # 65 - 150 mm/hr
    soil_cloudburst = np.random.uniform(75.0, 100.0, size=n_cloudburst) # 75 - 100% saturation
    slope_cloudburst = np.random.uniform(25.0, 55.0, size=n_cloudburst) # 25 - 55 deg
    river_cloudburst = np.random.uniform(6.8, 11.5, size=n_cloudburst)  # 6.8 - 11.5 m
    seismic_cloudburst = np.random.uniform(0.0, 2.5, size=n_cloudburst) # Normal seismic

    # Concatenate all regimes
    rainfall = np.concatenate([rain_normal, rain_monsoon, rain_glof, rain_cloudburst])
    soil = np.concatenate([soil_normal, soil_monsoon, soil_glof, soil_cloudburst])
    slope = np.concatenate([slope_normal, slope_monsoon, slope_glof, slope_cloudburst])
    river = np.concatenate([river_normal, river_monsoon, river_glof, river_cloudburst])
    seismic = np.concatenate([seismic_normal, seismic_monsoon, seismic_glof, seismic_cloudburst])

    # Add realistic environmental noise
    rainfall = np.clip(rainfall + np.random.normal(0, 1.5, n_samples), 0, 180)
    soil = np.clip(soil + np.random.normal(0, 2.0, n_samples), 5, 100)
    slope = np.clip(slope + np.random.normal(0, 1.0, n_samples), 2, 70)
    river = np.clip(river + np.random.normal(0, 0.2, n_samples), 0.5, 14.0)
    seismic = np.clip(seismic + np.random.normal(0, 0.1, n_samples), 0.0, 8.5)

    # Physics-Informed Risk Computation:
    # 1. Hydrological Runoff Risk: Rain * (Soil Saturation / 100) * sin(slope)
    hydro_risk = (rainfall / 100.0) * (soil / 100.0) * (np.sin(np.radians(slope)) ** 0.8)
    
    # 2. River Stage Risk: Non-linear escalation past 6.0m baseline
    excess_river = np.maximum(0.0, (river - 6.0) / 4.0)
    river_risk = excess_river ** 1.3
    
    # 3. Cryo-Seismic GLOF Risk: High seismic on steep slope triggers lake rupture
    excess_seismic = np.maximum(0.0, (seismic - 4.0) / 3.0)
    slope_factor = np.where(slope >= 25.0, slope / 45.0, 0.0)
    glof_risk = excess_seismic * slope_factor
    
    # Composite Raw Score
    raw_score = (0.40 * hydro_risk) + (0.35 * river_risk) + (0.45 * glof_risk)
    
    # Calibrate probability using sigmoid
    probability = 1.0 / (1.0 + np.exp(-7.0 * (raw_score - 0.42)))
    probability = np.clip(probability, 0.01, 0.99)

    # Class label: 1 if hazard (probability >= 0.50), else 0
    is_flood = (probability >= 0.50).astype(int)

    alert_colors = []
    triggers = []
    for i in range(n_samples):
        prob = probability[i]
        if prob >= 0.75:
            alert_colors.append("RED")
        elif prob >= 0.55:
            alert_colors.append("ORANGE")
        elif prob >= 0.35:
            alert_colors.append("YELLOW")
        else:
            alert_colors.append("GREEN")

        # Determine primary trigger
        if glof_risk[i] > 0.35 and seismic[i] >= 4.0:
            triggers.append("Seismic GLOF Warning")
        elif rainfall[i] >= 70.0:
            triggers.append("Cloudburst Flash Flood")
        elif river[i] >= 7.0:
            triggers.append("River Overflow / Stage Exceeded")
        elif hydro_risk[i] > 0.30:
            triggers.append("Saturated Soil Runoff")
        else:
            triggers.append("Normal Hydrological State")

    df = pd.DataFrame({
        "rainfall_mm_hr": np.round(rainfall, 2),
        "soil_moisture_pct": np.round(soil, 2),
        "terrain_slope_deg": np.round(slope, 2),
        "river_water_level_m": np.round(river, 2),
        "seismic_magnitude": np.round(seismic, 2),
        "flood_probability_percent": np.round(probability * 100.0, 2),
        "alert_color": alert_colors,
        "primary_trigger": triggers,
        "is_flood_hazard": is_flood
    })

    # Shuffle dataset
    df = df.sample(frac=1.0, random_state=seed).reset_index(drop=True)

    df.to_csv(output_path, index=False)
    print(f"[OK] Successfully saved {len(df)} rows to {output_path}")
    print("\nDataset Summary Statistics:")
    print(df[["rainfall_mm_hr", "soil_moisture_pct", "terrain_slope_deg", "river_water_level_m", "seismic_magnitude"]].describe().round(2))
    print("\nAlert Color Distribution:")
    print(df["alert_color"].value_counts())
    print("\nPrimary Trigger Distribution:")
    print(df["primary_trigger"].value_counts())

    return df

if __name__ == "__main__":
    generate_hybrid_dataset()
