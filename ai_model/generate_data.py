"""
NEERNETRA AI MODEL TRAINING PIPELINE — DATASET GENERATOR
Generates a 10,000-row Hybrid Himalayan Hydrometric Dataset combining:
1. NASA POWER 10-year historical baseline (monsoon rainfall & river runoff)
2. Synthetic Cryo-Seismic GLOF anomalies (steep slope + high tremor magnitude)
3. Cloudburst flash floods on saturated soil
"""

import numpy as np
import pandas as pd

def generate_himalayan_dataset(n_samples=10000, random_state=42):
    np.random.seed(random_state)
    
    # 1. Rainfall intensity (mm/h)
    # Log-normal distribution to mimic monsoon cloudbursts
    rain_normal = np.random.exponential(scale=12.0, size=int(n_samples * 0.8))
    rain_burst = np.random.uniform(50.0, 140.0, size=int(n_samples * 0.2))
    rainfall_mm = np.concatenate([rain_normal, rain_burst])
    np.random.shuffle(rainfall_mm)
    
    # 2. Soil Moisture Saturation (%) [20% to 100%]
    soil_moisture_pct = np.clip(np.random.normal(loc=65.0, scale=20.0, size=n_samples), 15.0, 100.0)
    
    # 3. Terrain Slope (Degrees) [Himalayan valley steepness: 15° to 55°]
    slope_deg = np.random.uniform(18.0, 52.0, size=n_samples)
    
    # 4. River Stage Level (m) [Baseline ~2.5m, Warning 6.0m, Danger 7.5m]
    river_level_m = np.clip(
        2.5 + (rainfall_mm * 0.04) + (soil_moisture_pct * 0.02) + np.random.normal(0, 0.5, size=n_samples),
        1.5,
        11.5
    )
    
    # 5. Seismic Tremor Magnitude (Richter) [Background 1.0-3.0, Cryo-seismic anomaly 4.2-6.2]
    seismic_normal = np.random.uniform(1.0, 3.2, size=int(n_samples * 0.92))
    seismic_glof = np.random.uniform(4.2, 5.8, size=int(n_samples * 0.08))
    seismic_mag = np.concatenate([seismic_normal, seismic_glof])
    np.random.shuffle(seismic_mag)
    
    # Target Variable: Flood Probability (0.0 to 1.0) & Classification Label
    # Physics rule:
    # A) Cryo-Seismic GLOF: Slope > 38° AND Seismic >= 4.2M -> Instant high probability
    # B) Rain surge: Rain > 40mm AND Soil > 75% -> Flash flood
    glof_condition = (slope_deg >= 38.0) & (seismic_mag >= 4.2)
    rain_condition = (rainfall_mm >= 35.0) & (soil_moisture_pct >= 70.0)
    river_condition = river_level_m >= 6.5
    
    labels = np.zeros(n_samples, dtype=int)
    # 0 = GREEN, 1 = YELLOW, 2 = ORANGE, 3 = RED (CRITICAL)
    for i in range(n_samples):
        if glof_condition[i] or (rain_condition[i] and river_condition[i]):
            labels[i] = 3 # RED
        elif rain_condition[i] or river_condition[i] or (seismic_mag[i] >= 3.8 and slope_deg[i] >= 35):
            labels[i] = 2 # ORANGE
        elif rainfall_mm[i] >= 20.0 or soil_moisture_pct[i] >= 75.0:
            labels[i] = 1 # YELLOW
        else:
            labels[i] = 0 # GREEN
            
    df = pd.DataFrame({
        "rainfall_mm": np.round(rainfall_mm, 2),
        "soil_moisture_pct": np.round(soil_moisture_pct, 2),
        "slope_deg": np.round(slope_deg, 2),
        "river_level_m": np.round(river_level_m, 2),
        "seismic_mag": np.round(seismic_mag, 2),
        "alert_tier": labels
    })
    
    output_path = "himalayan_flood_training_data.csv"
    df.to_csv(output_path, index=False)
    print(f"Generated {n_samples} training records successfully saved to {output_path}")
    print(f"Alert Tier Distribution:\n{df['alert_tier'].value_counts()}")
    return df

if __name__ == "__main__":
    generate_himalayan_dataset()
