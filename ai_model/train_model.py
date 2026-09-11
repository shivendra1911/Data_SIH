"""
NEERNETRA AI MODEL TRAINING SCRIPT
Trains a Multi-Class RandomForestClassifier on 5-factor hydrometric inputs
and serializes the production binary to ../backend/neernetra_model.pkl
"""

import os
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from generate_data import generate_himalayan_dataset

def train_and_export():
    dataset_file = "himalayan_flood_training_data.csv"
    if not os.path.exists(dataset_file):
        print("Dataset not found. Generating synthetic Himalayan dataset...")
        df = generate_himalayan_dataset(10000)
    else:
        df = pd.read_csv(dataset_file)
        
    features = ["rainfall_mm", "soil_moisture_pct", "slope_deg", "river_level_m", "seismic_mag"]
    X = df[features]
    y = df["alert_tier"]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    print("Training Random Forest Classifier (100 estimators)...")
    clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=12,
        min_samples_split=4,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )
    clf.fit(X_train, y_train)
    
    y_pred = clf.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Model Test Accuracy: {accuracy * 100:.2f}%")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=["GREEN", "YELLOW", "ORANGE", "RED"]))
    
    # Export model to backend folder
    os.makedirs("../backend", exist_ok=True)
    export_path = "../backend/neernetra_model.pkl"
    joblib.dump(clf, export_path)
    print(f"Model saved successfully to {export_path}")

if __name__ == "__main__":
    train_and_export()
