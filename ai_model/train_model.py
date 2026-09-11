"""
NeerNetra AI Model Engine - Random Forest Training Pipeline
Trains a RandomForestClassifier on the 10,000-row hybrid dataset
and saves the serialized model to ../backend/neernetra_model.pkl
"""

import sys
import os
import io
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    classification_report, confusion_matrix, accuracy_score,
    f1_score, roc_auc_score
)

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')


def train_neernetra_model(
    dataset_path="neernetra_hybrid_dataset.csv",
    output_model_path=os.path.join("..", "backend", "neernetra_model.pkl"),
    test_size=0.2,
    seed=42
):
    print("=" * 60)
    print("  NEERNETRA AI MODEL TRAINING PIPELINE")
    print("=" * 60)

    # --- 1. Load Dataset ---
    print("\n[1/6] Loading dataset...")
    df = pd.read_csv(dataset_path)
    print(f"  Loaded {len(df)} rows, {len(df.columns)} columns")

    # --- 2. Feature Engineering ---
    print("\n[2/6] Preparing features...")
    FEATURE_COLS = [
        "rainfall_mm_hr",
        "soil_moisture_pct",
        "terrain_slope_deg",
        "river_water_level_m",
        "seismic_magnitude"
    ]
    TARGET_COL = "is_flood_hazard"

    X = df[FEATURE_COLS].values
    y = df[TARGET_COL].values

    print(f"  Features: {FEATURE_COLS}")
    print(f"  Target: {TARGET_COL}")
    print(f"  Class distribution: 0 (Safe)={np.sum(y == 0)}, 1 (Flood Hazard)={np.sum(y == 1)}")

    # --- 3. Train-Test Split ---
    print(f"\n[3/6] Splitting dataset ({int((1 - test_size) * 100)}% train / {int(test_size * 100)}% test)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=seed, stratify=y
    )
    print(f"  Train: {len(X_train)} samples")
    print(f"  Test:  {len(X_test)} samples")

    # --- 4. Train Random Forest ---
    print("\n[4/6] Training RandomForestClassifier...")
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=18,
        min_samples_split=5,
        min_samples_leaf=2,
        max_features="sqrt",
        class_weight="balanced",
        random_state=seed,
        n_jobs=-1,
        oob_score=True
    )
    model.fit(X_train, y_train)
    print(f"  OOB Score: {model.oob_score_:.4f}")

    # --- 5. Evaluate Model ---
    print("\n[5/6] Evaluating on test set...")
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    accuracy = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    roc_auc = roc_auc_score(y_test, y_proba)

    print(f"\n  Accuracy:  {accuracy:.4f}")
    print(f"  F1-Score:  {f1:.4f}")
    print(f"  ROC-AUC:   {roc_auc:.4f}")

    print("\n  Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"    TN={cm[0][0]}  FP={cm[0][1]}")
    print(f"    FN={cm[1][0]}  TP={cm[1][1]}")

    print("\n  Classification Report:")
    print(classification_report(y_test, y_pred, target_names=["Safe (0)", "Flood Hazard (1)"]))

    # Cross-Validation
    print("  5-Fold Cross-Validation (Accuracy):")
    cv_scores = cross_val_score(model, X, y, cv=5, scoring="accuracy")
    print(f"    Scores: {[round(s, 4) for s in cv_scores]}")
    print(f"    Mean:   {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")

    # Feature Importance
    print("\n  Feature Importances:")
    importances = model.feature_importances_
    for feat, imp in sorted(zip(FEATURE_COLS, importances), key=lambda x: -x[1]):
        bar = "#" * int(imp * 50)
        print(f"    {feat:25s} {imp:.4f} {bar}")

    # --- 6. Save Model ---
    print(f"\n[6/6] Saving model to {output_model_path}...")
    os.makedirs(os.path.dirname(output_model_path), exist_ok=True)
    joblib.dump(model, output_model_path)
    model_size_mb = os.path.getsize(output_model_path) / (1024 * 1024)
    print(f"  Model saved! Size: {model_size_mb:.2f} MB")

    # Also save a local copy in ai_model/ for reference
    local_copy = "neernetra_model_local.pkl"
    joblib.dump(model, local_copy)
    print(f"  Local copy saved as {local_copy}")

    print("\n" + "=" * 60)
    print("  TRAINING COMPLETE - MODEL READY FOR DEPLOYMENT")
    print("=" * 60)

    return model


if __name__ == "__main__":
    train_neernetra_model()
