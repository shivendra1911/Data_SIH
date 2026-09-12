import sys
import numpy as np
import pandas as pd
import os

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

def generate_enhanced_dataset(n_samples=50000, seed=42, output_path="neernetra_hybrid_dataset.csv"):
    np.random.seed(seed)
    print(f"[*] Generating {n_samples}-row Enhanced NeerNetra Hybrid Dataset...")

    n_kedarnath = int(n_samples * 0.02)   # 1000
    n_chamoli = int(n_samples * 0.02)     # 1000
    n_nepal24 = int(n_samples * 0.03)     # 1500
    n_nepal26 = int(n_samples * 0.03)     # 1500
    
    n_pre_monsoon = int(n_samples * 0.16) # 8000
    n_monsoon = int(n_samples * 0.30)     # 15000
    n_post_monsoon = int(n_samples * 0.14)# 7000
    n_winter = int(n_samples * 0.10)      # 5000
    n_normal = n_samples - sum([n_kedarnath, n_chamoli, n_nepal24, n_nepal26, n_pre_monsoon, n_monsoon, n_post_monsoon, n_winter]) # 10000

    # HISTORICAL PATTERNS
    # Kedarnath 2013 (Extreme rain, saturated, high river)
    rain_ked = np.random.uniform(100.0, 160.0, n_kedarnath)
    soil_ked = np.random.uniform(90.0, 100.0, n_kedarnath)
    slope_ked = np.random.uniform(35.0, 55.0, n_kedarnath)
    river_ked = np.random.uniform(10.0, 14.0, n_kedarnath)
    seismic_ked = np.random.uniform(0.0, 2.0, n_kedarnath)

    # Chamoli 2021 (Glacier burst, minimal rain, high river surge, moderate seismic)
    rain_cha = np.random.uniform(0.0, 5.0, n_chamoli)
    soil_cha = np.random.uniform(30.0, 60.0, n_chamoli)
    slope_cha = np.random.uniform(40.0, 65.0, n_chamoli)
    river_cha = np.random.uniform(13.0, 18.0, n_chamoli)
    seismic_cha = np.random.uniform(4.5, 6.0, n_chamoli)

    # Nepal 2024 (Widespread extreme rain, very high river)
    rain_n24 = np.random.uniform(80.0, 180.0, n_nepal24)
    soil_n24 = np.random.uniform(85.0, 100.0, n_nepal24)
    slope_n24 = np.random.uniform(15.0, 45.0, n_nepal24)
    river_n24 = np.random.uniform(8.0, 14.5, n_nepal24)
    seismic_n24 = np.random.uniform(0.0, 3.0, n_nepal24)

    # Nepal 2026 Langtang (Rock-ice collapse, zero rain, seismic trigger, extreme GLOF)
    rain_n26 = np.random.uniform(0.0, 2.0, n_nepal26)
    soil_n26 = np.random.uniform(20.0, 50.0, n_nepal26)
    slope_n26 = np.random.uniform(45.0, 75.0, n_nepal26)
    river_n26 = np.random.uniform(10.0, 16.0, n_nepal26)
    seismic_n26 = np.random.uniform(4.8, 6.5, n_nepal26)

    # SEASONAL PATTERNS
    # Pre-monsoon
    rain_pre = np.random.uniform(5.0, 20.0, n_pre_monsoon)
    soil_pre = np.random.uniform(15.0, 30.0, n_pre_monsoon)
    slope_pre = np.random.uniform(5.0, 60.0, n_pre_monsoon)
    river_pre = np.random.uniform(1.0, 3.5, n_pre_monsoon)
    seismic_pre = np.random.exponential(scale=1.0, size=n_pre_monsoon)

    # Monsoon Peak
    rain_mon = np.random.uniform(30.0, 150.0, n_monsoon)
    soil_mon = np.random.uniform(60.0, 95.0, n_monsoon)
    slope_mon = np.random.uniform(5.0, 60.0, n_monsoon)
    river_mon = np.random.uniform(5.0, 12.0, n_monsoon)
    seismic_mon = np.random.exponential(scale=1.0, size=n_monsoon)

    # Post-monsoon
    rain_post = np.random.uniform(5.0, 40.0, n_post_monsoon)
    soil_post = np.random.uniform(50.0, 85.0, n_post_monsoon)
    slope_post = np.random.uniform(5.0, 60.0, n_post_monsoon)
    river_post = np.random.uniform(3.0, 7.0, n_post_monsoon)
    seismic_post = np.random.exponential(scale=1.0, size=n_post_monsoon)

    # Winter
    rain_win = np.random.uniform(0.0, 10.0, n_winter)
    soil_win = np.random.uniform(10.0, 40.0, n_winter)
    slope_win = np.random.uniform(5.0, 60.0, n_winter)
    river_win = np.random.uniform(0.8, 2.5, n_winter)
    seismic_win = np.random.exponential(scale=1.5, size=n_winter)

    # Normal Baseline
    rain_norm = np.random.gamma(shape=1.5, scale=4.0, size=n_normal)
    soil_norm = np.random.uniform(15.0, 50.0, n_normal)
    slope_norm = np.random.uniform(5.0, 50.0, n_normal)
    river_norm = np.random.normal(loc=2.5, scale=0.8, size=n_normal)
    seismic_norm = np.random.exponential(scale=0.6, size=n_normal)

    # CONCATENATE
    rainfall = np.concatenate([rain_ked, rain_cha, rain_n24, rain_n26, rain_pre, rain_mon, rain_post, rain_win, rain_norm])
    soil = np.concatenate([soil_ked, soil_cha, soil_n24, soil_n26, soil_pre, soil_mon, soil_post, soil_win, soil_norm])
    slope = np.concatenate([slope_ked, slope_cha, slope_n24, slope_n26, slope_pre, slope_mon, slope_post, slope_win, slope_norm])
    river = np.concatenate([river_ked, river_cha, river_n24, river_n26, river_pre, river_mon, river_post, river_win, river_norm])
    seismic = np.concatenate([seismic_ked, seismic_cha, seismic_n24, seismic_n26, seismic_pre, seismic_mon, seismic_post, seismic_win, seismic_norm])

    # Add noise & bounds
    rainfall = np.clip(rainfall + np.random.normal(0, 1.5, n_samples), 0, 300)
    soil = np.clip(soil + np.random.normal(0, 2.0, n_samples), 0, 100)
    slope = np.clip(slope + np.random.normal(0, 1.0, n_samples), 0, 90)
    river = np.clip(river + np.random.normal(0, 0.2, n_samples), 0.1, 20.0)
    seismic = np.clip(seismic + np.random.normal(0, 0.1, n_samples), 0.0, 9.0)

    # Physics-Informed Risk Computation
    # Edge Case: False Positive handling (high seismic but flat terrain = no GLOF risk)
    slope_factor = np.where(slope >= 25.0, slope / 45.0, 0.0)
    
    # Physics-Informed Hydrological Risk: Base infiltration limit + slope velocity multiplier
    slope_velocity = np.sin(np.radians(np.clip(slope, 2.0, 75.0))) ** 0.6
    runoff_potential = 0.30 + 0.70 * slope_velocity
    hydro_risk = (rainfall / 75.0) * (soil / 100.0) * runoff_potential
    
    excess_river = np.maximum(0.0, (river - 6.0) / 4.0)
    river_risk = excess_river ** 1.3
    
    excess_seismic = np.maximum(0.0, (seismic - 4.0) / 3.0)
    glof_risk = excess_seismic * slope_factor

    # Feature interactions: high rain + high soil escalates quickly
    saturation_multiplier = np.where((rainfall > 50) & (soil > 80), 1.4, 1.0)
    hydro_risk *= saturation_multiplier

    # Compound Multi-Hazard Risk Formulation (FEMA / NDMA Standard)
    # Catastrophic single hazard dominates (e.g. cloudburst, GLOF, or dam breach), while compound factors amplify
    compound_max = np.maximum(np.maximum(hydro_risk, river_risk), glof_risk)
    compound_mean = (hydro_risk + river_risk + glof_risk) / 3.0
    raw_score = 0.70 * compound_max + 0.30 * compound_mean
    
    # Calibrate probability using sigmoid
    probability = 1.0 / (1.0 + np.exp(-7.5 * (raw_score - 0.40)))
    probability = np.clip(probability, 0.01, 0.99)

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
        if glof_risk[i] > 0.35 and seismic[i] >= 4.0 and slope[i] >= 25.0:
            triggers.append("Seismic GLOF Warning")
        elif rainfall[i] >= 70.0 and soil[i] >= 80.0:
            triggers.append("Cloudburst Flash Flood")
        elif river[i] >= 8.0:
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
    base_dir = os.path.dirname(os.path.abspath(__file__))
    out_file = os.path.join(base_dir, "neernetra_hybrid_dataset.csv")
    generate_enhanced_dataset(output_path=out_file)
