import os
import sys
import numpy as np
import pandas as pd
import joblib
from generate_data import generate_hybrid_dataset

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOCAL_MODEL_PATH = os.path.join(BASE_DIR, "neernetra_model_local.pkl")
BACKEND_MODEL_PATH = os.path.join(BASE_DIR, "..", "backend", "neernetra_model.pkl")

def test_generate_data_produces_10000_rows():
    test_csv = os.path.join(BASE_DIR, "test_dataset.csv")
    df = generate_hybrid_dataset(n_samples=10000, output_path=test_csv)
    assert len(df) == 10000
    expected_cols = [
        "rainfall_mm_hr", "soil_moisture_pct", "terrain_slope_deg",
        "river_water_level_m", "seismic_magnitude", "flood_probability_percent",
        "alert_color", "primary_trigger", "is_flood_hazard"
    ]
    for col in expected_cols:
        assert col in df.columns
    if os.path.exists(test_csv):
        os.remove(test_csv)

def test_model_loads_and_has_methods():
    model = joblib.load(LOCAL_MODEL_PATH)
    assert hasattr(model, "predict")
    assert hasattr(model, "predict_proba")

def test_input_validation():
    model = joblib.load(LOCAL_MODEL_PATH)
    X = np.array([[-10.0, -5.0, -1.0, -2.0, 15.0]])
    pred = model.predict(X)
    assert len(pred) == 1
    
    X_nan = np.array([[np.nan, 50.0, 20.0, 5.0, 2.0]])
    try:
        model.predict(X_nan)
    except Exception as e:
        assert isinstance(e, ValueError)

def test_predictions_deterministic():
    model = joblib.load(LOCAL_MODEL_PATH)
    X = np.array([[50.0, 60.0, 30.0, 6.5, 3.0]])
    pred1 = model.predict_proba(X)
    pred2 = model.predict_proba(X)
    np.testing.assert_array_equal(pred1, pred2)

def test_red_scenario():
    model = joblib.load(LOCAL_MODEL_PATH)
    X = np.array([[150.0, 95.0, 55.0, 11.0, 7.0]])
    prob = model.predict_proba(X)[0, 1]
    assert prob >= 0.75

def test_green_scenario():
    model = joblib.load(LOCAL_MODEL_PATH)
    X = np.array([[0.0, 10.0, 5.0, 1.0, 0.0]])
    prob = model.predict_proba(X)[0, 1]
    assert prob < 0.35

def test_model_output_range():
    model = joblib.load(LOCAL_MODEL_PATH)
    X = np.random.rand(100, 5) * 100
    probs = model.predict_proba(X)[:, 1]
    assert np.all(probs >= 0.0)
    assert np.all(probs <= 1.0)

def test_model_copies_match():
    local_size = os.path.getsize(LOCAL_MODEL_PATH)
    backend_size = os.path.getsize(BACKEND_MODEL_PATH)
    assert local_size == backend_size

def test_edge_cases():
    model = joblib.load(LOCAL_MODEL_PATH)
    X_zero = np.zeros((1, 5))
    prob_zero = model.predict_proba(X_zero)[0, 1]
    assert 0.0 <= prob_zero <= 1.0
    
    X_max = np.ones((1, 5)) * 9999.0
    prob_max = model.predict_proba(X_max)[0, 1]
    assert 0.0 <= prob_max <= 1.0
    
    X_seismic = np.array([[0.0, 10.0, 5.0, 1.0, 9.5]])
    prob_seis = model.predict_proba(X_seismic)[0, 1]
    assert 0.0 <= prob_seis <= 1.0

if __name__ == "__main__":
    tests = [
        ("test_generate_data_produces_10000_rows", test_generate_data_produces_10000_rows),
        ("test_model_loads_and_has_methods", test_model_loads_and_has_methods),
        ("test_input_validation", test_input_validation),
        ("test_predictions_deterministic", test_predictions_deterministic),
        ("test_red_scenario", test_red_scenario),
        ("test_green_scenario", test_green_scenario),
        ("test_model_output_range", test_model_output_range),
        ("test_model_copies_match", test_model_copies_match),
        ("test_edge_cases", test_edge_cases),
    ]
    passed = 0
    print("=" * 60)
    print("  RUNNING NEERNETRA AI MODEL UNIT TESTS")
    print("=" * 60)
    for name, fn in tests:
        try:
            fn()
            print(f"  [PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {name}: {e}")
    print("=" * 60)
    print(f"  RESULTS: {passed}/{len(tests)} TESTS PASSED")
    print("=" * 60)
    sys.exit(0 if passed == len(tests) else 1)
