import sys
import os
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.metrics import confusion_matrix, precision_recall_curve, roc_curve, roc_auc_score
from sklearn.model_selection import cross_val_score

def analyze_model():
    model_path = "neernetra_model_local.pkl"
    dataset_path = "neernetra_hybrid_dataset.csv"
    
    if not os.path.exists(model_path):
        print(f"Error: {model_path} not found.")
        return
    
    print("Loading model and dataset...")
    model = joblib.load(model_path)
    df = pd.read_csv(dataset_path)
    
    FEATURE_COLS = ["rainfall_mm_hr", "soil_moisture_pct", "terrain_slope_deg", "river_water_level_m", "seismic_magnitude"]
    X = df[FEATURE_COLS].values
    y = df["is_flood_hazard"].values
    
    print("Computing predictions...")
    y_proba = model.predict_proba(X)[:, 1]
    y_pred = model.predict(X)
    
    analysis = {}
    
    # 1. Feature Importance
    importances = model.feature_importances_
    analysis["feature_importance"] = [
        {"feature": feat, "percentage": float(imp * 100)}
        for feat, imp in zip(FEATURE_COLS, importances)
    ]
    analysis["feature_importance"].sort(key=lambda x: x["percentage"], reverse=True)
    
    # 2. Confusion Matrix
    cm = confusion_matrix(y, y_pred)
    tn, fp, fn, tp = cm.ravel()
    analysis["confusion_matrix"] = {
        "TN": int(tn), "FP": int(fp), "FN": int(fn), "TP": int(tp),
        "TPR": float(tp / (tp + fn) if (tp + fn) > 0 else 0),
        "FPR": float(fp / (fp + tn) if (fp + tn) > 0 else 0)
    }
    
    # 3. Precision-Recall Curve (sampled to keep size manageable)
    precisions, recalls, thresholds = precision_recall_curve(y, y_proba)
    # take 20 points
    idx = np.linspace(0, len(thresholds)-1, 20).astype(int)
    analysis["precision_recall_curve"] = [
        {"threshold": float(thresholds[i]), "precision": float(precisions[i]), "recall": float(recalls[i])}
        for i in idx
    ]
    
    # 4. ROC Curve
    fpr, tpr, roc_thresh = roc_curve(y, y_proba)
    idx_roc = np.linspace(0, len(roc_thresh)-1, 20).astype(int)
    analysis["roc_curve"] = [
        {"threshold": float(roc_thresh[i]), "fpr": float(fpr[i]), "tpr": float(tpr[i])}
        for i in idx_roc
    ]
    analysis["roc_auc"] = float(roc_auc_score(y, y_proba))
    
    # 5. Per-alert-color stats (assuming cutoffs: >0.75 RED, >0.55 ORANGE, >0.30 YELLOW, else GREEN)
    colors = []
    for p in y_proba:
        if p > 0.75: colors.append("RED")
        elif p > 0.55: colors.append("ORANGE")
        elif p > 0.30: colors.append("YELLOW")
        else: colors.append("GREEN")
    
    df["predicted_color"] = colors
    color_stats = {}
    for color in ["RED", "ORANGE", "YELLOW", "GREEN"]:
        subset = df[df["predicted_color"] == color]
        if len(subset) > 0:
            actual_pos = subset["is_flood_hazard"].sum()
            precision = actual_pos / len(subset)
            color_stats[color] = {"count": len(subset), "precision": float(precision)}
        else:
            color_stats[color] = {"count": 0, "precision": 0.0}
    analysis["per_color_accuracy"] = color_stats
    
    # 6. Threshold sensitivity
    sensitivities = []
    for th in [0.3, 0.4, 0.5, 0.55, 0.6, 0.7, 0.75, 0.8]:
        y_th = (y_proba > th).astype(int)
        acc = float(np.mean(y_th == y))
        sensitivities.append({"threshold": th, "accuracy": acc})
    analysis["threshold_sensitivity"] = sensitivities
    
    # 7. Cross-validation scores
    print("Running cross-validation...")
    cv_scores = cross_val_score(model, X, y, cv=5, scoring="accuracy", n_jobs=-1)
    analysis["cross_validation"] = {
        "scores": cv_scores.tolist(),
        "mean": float(cv_scores.mean()),
        "std": float(cv_scores.std())
    }
    
    with open("model_analysis_report.json", "w") as f:
        json.dump(analysis, f, indent=2)
    print("Analysis complete. Saved to model_analysis_report.json")

if __name__ == "__main__":
    analyze_model()
