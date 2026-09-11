"""
NeerNetra AI Model - Retrain on Real-Time Data
Loads existing model + dataset, appends new real-time observations,
retrains the model, evaluates improvement, and saves the updated .pkl
"""

import sys
import io
import os
import glob
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score, classification_report

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')


FEATURE_COLS = [
    "rainfall_mm_hr",
    "soil_moisture_pct",
    "terrain_slope_deg",
    "river_water_level_m",
    "seismic_magnitude"
]
TARGET_COL = "is_flood_hazard"

MODEL_PATH = os.path.join("..", "backend", "neernetra_model.pkl")
DATASET_PATH = "neernetra_hybrid_dataset.csv"


def label_realtime_row(row):
    """Apply the same physics-informed risk logic to label real-time data"""
    rain = row["rainfall_mm_hr"]
    soil = row["soil_moisture_pct"]
    slope = row["terrain_slope_deg"]
    river = row["river_water_level_m"]
    seismic = row["seismic_magnitude"]

    # Hydrological Runoff Risk
    hydro = (rain / 100.0) * (soil / 100.0) * (np.sin(np.radians(slope)) ** 0.8)

    # River Stage Risk
    excess_river = max(0.0, (river - 6.0) / 4.0)
    river_risk = excess_river ** 1.3

    # GLOF Risk
    excess_seis = max(0.0, (seismic - 4.0) / 3.0)
    slope_factor = slope / 45.0 if slope >= 25.0 else 0.0
    glof = excess_seis * slope_factor

    raw = (0.40 * hydro) + (0.35 * river_risk) + (0.45 * glof)
    prob = 1.0 / (1.0 + np.exp(-7.0 * (raw - 0.42)))
    prob = max(0.01, min(prob, 0.99))

    is_flood = 1 if prob >= 0.50 else 0

    if prob >= 0.75:
        color = "RED"
    elif prob >= 0.55:
        color = "ORANGE"
    elif prob >= 0.35:
        color = "YELLOW"
    else:
        color = "GREEN"

    if glof > 0.35 and seismic >= 4.0:
        trigger = "Seismic GLOF Warning"
    elif rain >= 70.0:
        trigger = "Cloudburst Flash Flood"
    elif river >= 7.0:
        trigger = "River Overflow / Stage Exceeded"
    elif hydro > 0.30:
        trigger = "Saturated Soil Runoff"
    else:
        trigger = "Normal Hydrological State"

    return pd.Series({
        "flood_probability_percent": round(prob * 100, 2),
        "alert_color": color,
        "primary_trigger": trigger,
        "is_flood_hazard": is_flood
    })


def retrain_model():
    print("=" * 65)
    print("  NEERNETRA MODEL RETRAINING PIPELINE")
    print("=" * 65)

    # --- Step 1: Load existing dataset ---
    print("\n[1/5] Loading existing training dataset...")
    if not os.path.exists(DATASET_PATH):
        print(f"  [ERR] {DATASET_PATH} not found. Run generate_data.py first.")
        return
    df_existing = pd.read_csv(DATASET_PATH)
    print(f"  Existing dataset: {len(df_existing)} rows")

    # --- Step 2: Find and merge real-time CSVs ---
    print("\n[2/5] Searching for real-time data files...")
    rt_files = sorted(glob.glob("realtime_data_*.csv"))
    if not rt_files:
        print("  [WARN] No realtime_data_*.csv files found.")
        print("  Run fetch_realtime_data.py first to collect live sensor data.")
        print("  Retraining with existing dataset only...")
        df_combined = df_existing
    else:
        print(f"  Found {len(rt_files)} real-time data files:")
        rt_frames = []
        for f in rt_files:
            df_rt = pd.read_csv(f)
            print(f"    {f}: {len(df_rt)} rows")

            # Ensure required columns exist
            missing = [c for c in FEATURE_COLS if c not in df_rt.columns]
            if missing:
                print(f"    [SKIP] Missing columns: {missing}")
                continue

            # Auto-label using physics-informed rules
            labels = df_rt.apply(label_realtime_row, axis=1)
            df_rt = pd.concat([df_rt[FEATURE_COLS], labels], axis=1)
            rt_frames.append(df_rt)

        if rt_frames:
            df_realtime = pd.concat(rt_frames, ignore_index=True)
            print(f"\n  Total real-time samples to add: {len(df_realtime)}")

            # Combine: existing + real-time
            df_combined = pd.concat([
                df_existing[FEATURE_COLS + [TARGET_COL, "flood_probability_percent", "alert_color", "primary_trigger"]],
                df_realtime
            ], ignore_index=True)
            print(f"  Combined dataset: {len(df_combined)} rows")
        else:
            print("  [WARN] No valid real-time data could be processed.")
            df_combined = df_existing

    # --- Step 3: Train new model ---
    print("\n[3/5] Training updated RandomForestClassifier...")
    X = df_combined[FEATURE_COLS].values
    y = df_combined[TARGET_COL].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    new_model = RandomForestClassifier(
        n_estimators=200,
        max_depth=18,
        min_samples_split=5,
        min_samples_leaf=2,
        max_features="sqrt",
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
        oob_score=True
    )
    new_model.fit(X_train, y_train)

    # --- Step 4: Evaluate ---
    print("\n[4/5] Evaluating retrained model...")
    y_pred = new_model.predict(X_test)
    y_proba = new_model.predict_proba(X_test)[:, 1]

    new_acc = accuracy_score(y_test, y_pred)
    new_f1 = f1_score(y_test, y_pred)
    new_auc = roc_auc_score(y_test, y_proba)

    print(f"  Accuracy:  {new_acc:.4f}")
    print(f"  F1-Score:  {new_f1:.4f}")
    print(f"  ROC-AUC:   {new_auc:.4f}")
    print(f"  OOB Score: {new_model.oob_score_:.4f}")

    # Compare with old model
    if os.path.exists(MODEL_PATH):
        old_model = joblib.load(MODEL_PATH)
        old_pred = old_model.predict(X_test)
        old_proba = old_model.predict_proba(X_test)[:, 1]
        old_acc = accuracy_score(y_test, old_pred)
        old_f1 = f1_score(y_test, old_pred)
        old_auc = roc_auc_score(y_test, old_proba)

        print(f"\n  --- Comparison ---")
        print(f"  {'Metric':<12} {'Old Model':>12} {'New Model':>12} {'Delta':>10}")
        print(f"  {'Accuracy':<12} {old_acc:>12.4f} {new_acc:>12.4f} {new_acc - old_acc:>+10.4f}")
        print(f"  {'F1-Score':<12} {old_f1:>12.4f} {new_f1:>12.4f} {new_f1 - old_f1:>+10.4f}")
        print(f"  {'ROC-AUC':<12} {old_auc:>12.4f} {new_auc:>12.4f} {new_auc - old_auc:>+10.4f}")

    # --- Step 5: Save ---
    print(f"\n[5/5] Saving retrained model to {MODEL_PATH}...")
    joblib.dump(new_model, MODEL_PATH)
    joblib.dump(new_model, "neernetra_model_local.pkl")

    # Save updated combined dataset
    df_combined.to_csv(DATASET_PATH, index=False)
    print(f"  Updated dataset saved: {len(df_combined)} rows")
    print(f"  Model saved!")

    print("\n" + "=" * 65)
    print("  RETRAINING COMPLETE")
    print("=" * 65)


if __name__ == "__main__":
    retrain_model()
