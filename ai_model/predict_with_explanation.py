import sys
import os
import joblib
import numpy as np

def explain_prediction(features, proba, feature_names, importances):
    # Determine Color
    if proba > 0.75: color = "RED"
    elif proba > 0.55: color = "ORANGE"
    elif proba > 0.30: color = "YELLOW"
    else: color = "GREEN"
    
    # Simple logic for primary trigger based on features
    feature_contributions = []
    for i, name in enumerate(feature_names):
        # We roughly estimate contribution based on feature value and importance
        # This is a naive explanation model for demo purposes
        feature_contributions.append((name, features[i], importances[i]))
    
    # Sort by a heuristic (e.g., standard thresholds for danger)
    # Rainfall > 50, soil > 70, slope > 30, river > 8, seismic > 4
    danger_factors = []
    if features[0] > 50: danger_factors.append(("Extreme Rainfall", features[0]))
    if features[1] > 70: danger_factors.append(("Saturated Soil", features[1]))
    if features[2] > 40: danger_factors.append(("Steep Terrain", features[2]))
    if features[3] > 8: danger_factors.append(("High River Level", features[3]))
    if features[4] > 4.5: danger_factors.append(("Seismic Activity", features[4]))
    
    if danger_factors:
        primary_trigger = danger_factors[0][0]
        explanation = f"Model predicted {color} due to " + " and ".join([f"{f[0]} ({f[1]})" for f in danger_factors[:2]]) + "."
    else:
        primary_trigger = "Stable Conditions"
        explanation = f"Model predicted {color} as all indicators are within normal ranges."
        
    # Find most important feature
    top_feature = max(feature_contributions, key=lambda x: x[2])
    
    return proba, color, primary_trigger, explanation, top_feature[0]

if __name__ == "__main__":
    if len(sys.argv) != 6:
        print("Usage: py predict_with_explanation.py <rain> <soil> <slope> <river> <seismic>")
        sys.exit(1)
        
    try:
        rain = float(sys.argv[1])
        soil = float(sys.argv[2])
        slope = float(sys.argv[3])
        river = float(sys.argv[4])
        seismic = float(sys.argv[5])
    except ValueError:
        print("Error: All inputs must be numeric.")
        sys.exit(1)
        
    model_path = "neernetra_model_local.pkl"
    if not os.path.exists(model_path):
        print(f"Error: {model_path} not found.")
        sys.exit(1)
        
    model = joblib.load(model_path)
    X_input = np.array([[rain, soil, slope, river, seismic]])
    proba = model.predict_proba(X_input)[0][1]
    
    feature_names = ["rainfall_mm_hr", "soil_moisture_pct", "terrain_slope_deg", "river_water_level_m", "seismic_magnitude"]
    importances = model.feature_importances_
    
    prob, color, trigger, explanation, top_feat = explain_prediction(
        [rain, soil, slope, river, seismic], proba, feature_names, importances
    )
    
    print("--- Prediction Result ---")
    print(f"Inputs: Rain={rain}, Soil={soil}, Slope={slope}, River={river}, Seismic={seismic}")
    print(f"Flood Probability: {prob*100:.1f}%")
    print(f"Alert Color:       {color}")
    print(f"Primary Trigger:   {trigger}")
    print(f"Explanation:       {explanation}")
    print(f"Most Influential Feature (Global): {top_feat}")
