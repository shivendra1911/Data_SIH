import os
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib

def generate_synthetic_telemetry(num_samples=5000):
    np.random.seed(42)
    
    # 1. Rainfall (mm / 24h) - Log-normal distribution to simulate intense downpours
    rainfall = np.random.lognormal(mean=3.2, sigma=0.8, size=num_samples)
    rainfall = np.clip(rainfall, 0, 350)
    
    # 2. Seismic magnitude (Richter) - Low baseline with occasional GLOF triggering quakes
    seismic = np.random.exponential(scale=0.8, size=num_samples)
    seismic = np.clip(seismic, 0, 7.2)
    
    # 3. Soil moisture saturation (0.0 to 1.0 m3/m3)
    soil_moisture = np.random.uniform(0.1, 1.0, size=num_samples)
    
    # 4. River discharge rate (m3/s)
    river_discharge = np.random.gamma(shape=3.0, scale=120.0, size=num_samples)
    river_discharge = np.clip(river_discharge, 10, 3000)
    
    # 5. Basin slope angle (degrees)
    slope = np.random.normal(loc=32.0, scale=8.0, size=num_samples)
    slope = np.clip(slope, 5, 65)

    # Risk Score calculation logic based on physical hydrological thresholds
    risk_score = (
        (rainfall / 350.0) * 0.35 +
        (river_discharge / 3000.0) * 0.30 +
        (soil_moisture) * 0.15 +
        (seismic / 7.2) * 0.10 +
        (slope / 65.0) * 0.10
    )

    # Convert continuous risk score into categorical alert labels:
    # 0 = SAFE, 1 = ORANGE (Moderate Warning), 2 = RED (Critical Alert)
    target = np.zeros(num_samples, dtype=int)
    target[risk_score >= 0.25] = 1
    target[risk_score >= 0.45] = 2

    df = pd.DataFrame({
        'rainfall_mm': rainfall,
        'seismic_mag': seismic,
        'soil_moisture': soil_moisture,
        'river_discharge_m3s': river_discharge,
        'slope_angle_deg': slope,
        'target_risk': target
    })

    return df

def train_and_save_model():
    print("=" * 60)
    print("NEERNETRA AI MODEL TRAINING PIPELINE")
    print("=" * 60)

    print("[1/4] Generating synthetic GLOF & Flash Flood telemetry dataset...")
    df = generate_synthetic_telemetry(num_samples=5000)
    
    X = df[['rainfall_mm', 'seismic_mag', 'soil_moisture', 'river_discharge_m3s', 'slope_angle_deg']]
    y = df['target_risk']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    print("[2/4] Fitting RandomForestClassifier with 100 decision trees...")
    clf = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42)
    clf.fit(X_train, y_train)

    print("[3/4] Evaluating Model Performance...")
    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"-> Validation Accuracy: {acc * 100:.2f}%")
    print("\nClassification Report:\n", classification_report(y_test, y_pred, labels=[0, 1, 2], target_names=['SAFE', 'ORANGE', 'RED'], zero_division=0))

    # Output path directly into ../backend/neernetra_model.pkl
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'backend')
    os.makedirs(output_dir, exist_ok=True)
    model_path = os.path.abspath(os.path.join(output_dir, 'neernetra_model.pkl'))

    print(f"[4/4] Serializing model artifact to:\n {model_path}")
    joblib.dump(clf, model_path)
    print("[SUCCESS] Model training & serialization completed successfully!")

if __name__ == '__main__':
    train_and_save_model()
