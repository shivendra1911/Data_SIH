# NeerNetra AI Model (The Brain)

## Overview
This folder contains the offline Python ML pipeline that generates a hybrid training dataset and trains a **RandomForestClassifier** to predict multi-hazard flood risk (Cloudbursts, GLOFs, River Overflow) in Himalayan regions.

## Files
| File | Description |
|------|-------------|
| `generate_data.py` | Creates a 10,000-row hybrid dataset simulating NASA POWER historical rain baseline + synthetic GLOF & Cloudburst events |
| `train_model.py` | Trains a Random Forest on the 5-factor input and saves `neernetra_model.pkl` to `../backend/` |
| `neernetra_hybrid_dataset.csv` | Generated training dataset (10,000 rows) |
| `neernetra_model_local.pkl` | Local backup of the trained model |

## 5 Input Features
1. **rainfall_mm_hr** - Rainfall intensity (Tomorrow.io API)
2. **soil_moisture_pct** - Soil saturation (AgroMonitoring API)
3. **terrain_slope_deg** - Terrain slope (Open-Elevation API)
4. **river_water_level_m** - River water level (India-WRIS)
5. **seismic_magnitude** - Seismic activity (USGS Earthquake API)

## Model Performance
- **Accuracy:** 98.45%
- **F1-Score:** 96.01%
- **ROC-AUC:** 99.92%
- **5-Fold CV Mean:** 98.70%

## How to Run
```bash
pip install pandas scikit-learn numpy joblib
python generate_data.py
python train_model.py
```

## Owner
**Priyanshu (TEAMMATE 4: AI Model & Data)**
