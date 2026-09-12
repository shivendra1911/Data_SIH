# NeerNetra AI Model Engine (The Brain)

## 🧠 System Architecture Overview
The `ai_model` subsystem is the predictive intelligence core of NeerNetra. It ingests 5 multi-source geospatial & hydrological signals, runs physics-informed data synthesis, trains an ensemble **RandomForestClassifier**, and exports the serialized model directly to `../backend/neernetra_model.pkl` for real-time inference by the FastAPI backend.

---

## 📁 Repository & Script Index

| Script / File | Role & Purpose | Agent Origin |
|:---|:---|:---|
| **`generate_data.py`** | Baseline 10K-row hybrid dataset generator | Core Pipeline |
| **`generate_enhanced_data.py`** | 50K-row dataset generator with disaster archetypes & seasonal cycles | Agent 2 (Data Gen) |
| **`train_model.py`** | Baseline model training pipeline with cross-validation | Core Pipeline |
| **`retrain_enhanced.py`** | High-performance retrainer on 50K dataset (99.28% Accuracy) | Agent 2 (Data Gen) |
| **`retrain_model.py`** | Incremental retrainer that absorbs live incoming sensor batches | Core Pipeline |
| **`fetch_realtime_data.py`** | Live sensor collector (Tomorrow.io, USGS, Open-Elevation) | Core Pipeline |
| **`predict_live.py`** | Instant batch predictor for live monitored Himalayan zones | Core Pipeline |
| **`predict_with_explanation.py`** | CLI explainability tool showing why the model triggered an alert | Agent 3 (Model Ops) |
| **`batch_scenario_test.py`** | Validation against historical disasters (Kedarnath, Chamoli, Nepal) | Agent 3 (Model Ops) |
| **`model_analysis.py`** | Computes ROC-AUC, PR curves, and saves `model_analysis_report.json` | Agent 3 (Model Ops) |
| **`test_model.py`** | 9-point unit test suite covering input validation & determinism | Agent 4 (QA/Tester) |
| **`data_sources_research.md`** | Comprehensive research on NASA POWER, IMD, India-WRIS, CWC | Agent 1 (Researcher) |
| **`validation_report.md`** | Full bug fix report & system validation audit | Agent 4 (QA/Tester) |
| **`neernetra_model_local.pkl`** | Local serialized model backup | Export |
| **`../backend/neernetra_model.pkl`** | Production model loaded by FastAPI server | Backend Target |

---

## 📡 The 5 Real-Time Input Factors
1. **`rainfall_mm_hr`**: Precipitation rate (Tomorrow.io API / NASA POWER)
2. **`soil_moisture_pct`**: Soil saturation % (AgroMonitoring API / Copernicus)
3. **`terrain_slope_deg`**: Slope angle in degrees (Open-Elevation / ISRO CartoDEM)
4. **`river_water_level_m`**: Water height above gauge baseline (India-WRIS / CWC)
5. **`seismic_magnitude`**: Richter magnitude (USGS Earthquake API)

---

## 📊 Model Performance Metrics
- **Accuracy**: 99.28%
- **F1-Score**: 0.984
- **True Positive Rate (Recall)**: 97.0%
- **False Positive Rate**: 5.4%
- **5-Fold Cross-Validation**: 98.70% (±0.36%)
- **Trained Samples**: 50,000 hybrid events

### Global Feature Importance:
1. `river_water_level_m`: **55.4%**
2. `seismic_magnitude`: **17.2%** (Enables zero-rain GLOF detection!)
3. `rainfall_mm_hr`: **13.1%**
4. `terrain_slope_deg`: **8.8%**
5. `soil_moisture_pct`: **5.4%**

---

## 🚨 Alert Thresholds
- **`RED`** (`>= 75%`): Immediate evacuation protocol.
- **`ORANGE`** (`55% - 74%`): High alert, prepare response teams.
- **`YELLOW`** (`35% - 54%`): Watch status.
- **`GREEN`** (`< 35%`): Normal hydrological status.

---

## 🚀 Quick Commands

```bash
# 1. Fetch live sensor readings from Uttarakhand:
py fetch_realtime_data.py

# 2. Predict on live readings:
py predict_live.py

# 3. Test a specific scenario with explainability:
py predict_with_explanation.py 85.0 78.0 35.0 8.5 5.1

# 4. Run the 9-point unit test suite:
py test_model.py

# 5. Run historical disaster batch scenarios:
py batch_scenario_test.py
```
