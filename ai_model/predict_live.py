"""Quick script to run live predictions using the trained model on real-time data"""
import sys, io, os, joblib, pandas as pd, numpy as np
if sys.platform == "win32":
    if hasattr(sys.stdout, 'buffer'):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

FEATURES = ["rainfall_mm_hr","soil_moisture_pct","terrain_slope_deg","river_water_level_m","seismic_magnitude"]
model = joblib.load(os.path.join("..","backend","neernetra_model.pkl"))

import glob
rt_files = sorted(glob.glob("realtime_data_*.csv"))
if not rt_files:
    print("No realtime data found"); exit()

df = pd.read_csv(rt_files[-1])
X = df[FEATURES].values
probs = model.predict_proba(X)[:,1] * 100
preds = model.predict(X)

print("="*75)
print("  NEERNETRA LIVE PREDICTION RESULTS")
print("="*75)
print(f"{'Zone':<16} {'Rain':>6} {'Soil':>6} {'Slope':>6} {'River':>6} {'Seis':>5} {'Prob%':>7} {'Alert':>8}")
print("-"*75)
for i, row in df.iterrows():
    p = probs[i]
    if p >= 75: color = "RED"
    elif p >= 55: color = "ORANGE"
    elif p >= 35: color = "YELLOW"
    else: color = "GREEN"
    print(f"{row['zone_name']:<16} {row['rainfall_mm_hr']:>6.1f} {row['soil_moisture_pct']:>6.1f} {row['terrain_slope_deg']:>6.1f} {row['river_water_level_m']:>6.2f} {row['seismic_magnitude']:>5.1f} {p:>6.1f}% {color:>8}")
print("-"*75)
reds = sum(1 for p in probs if p >= 75)
oranges = sum(1 for p in probs if 55 <= p < 75)
print(f"\nREDs: {reds} | ORANGEs: {oranges} | Total zones monitored: {len(df)}")
