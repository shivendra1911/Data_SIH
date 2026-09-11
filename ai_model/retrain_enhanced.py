import sys
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
import pickle
import os

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

def train_and_evaluate(dataset_path, model_output_path):
    print(f"[*] Loading dataset from {dataset_path}")
    df = pd.read_csv(dataset_path)

    features = [
        "rainfall_mm_hr", 
        "soil_moisture_pct", 
        "terrain_slope_deg", 
        "river_water_level_m", 
        "seismic_magnitude"
    ]
    target = "is_flood_hazard"

    X = df[features]
    y = df[target]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print(f"[*] Training RandomForestClassifier on {len(X_train)} samples...")
    # Optimized hyperparameters for 50k rows
    model = RandomForestClassifier(
        n_estimators=150, 
        max_depth=12,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1
    )

    model.fit(X_train, y_train)

    print("[*] Evaluating model...")
    y_pred = model.predict(X_test)
    
    print("\n--- Classification Report ---")
    print(classification_report(y_test, y_pred))
    
    acc = accuracy_score(y_test, y_pred)
    print(f"Accuracy: {acc:.4f}")

    # Ensure backend directory exists
    os.makedirs(os.path.dirname(model_output_path), exist_ok=True)

    print(f"[*] Saving model to {model_output_path}")
    with open(model_output_path, 'wb') as f:
        pickle.dump(model, f)
    print("[OK] Model saved successfully!")

if __name__ == "__main__":
    import shutil
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(base_dir, "neernetra_hybrid_dataset.csv")
    backend_target = os.path.join(base_dir, "..", "backend", "neernetra_model.pkl")
    local_target = os.path.join(base_dir, "neernetra_model_local.pkl")

    train_and_evaluate(dataset_path=data_path, model_output_path=backend_target)
    shutil.copy2(backend_target, local_target)
    print(f"[OK] Synced model copy to {local_target}")
