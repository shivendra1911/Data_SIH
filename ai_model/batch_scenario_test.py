"""
NeerNetra Historical Disaster Benchmark Suite
Validates the AI Model against known historical disaster signatures and edge cases.
"""

import sys
import os
from inference_engine import predict_flood_risk

scenarios = [
    {
        "name": "Kedarnath 2013 Cloudburst Disaster",
        "inputs": {"rainfall_mm_hr": 162.0, "soil_moisture_pct": 95.0, "terrain_slope_deg": 45.0, "river_water_level_m": 12.0, "seismic_magnitude": 0.5},
        "expected_alert": "RED",
        "expected_prob_min": 75.0
    },
    {
        "name": "Chamoli 2021 Glacial Burst (GLOF)",
        "inputs": {"rainfall_mm_hr": 2.0, "soil_moisture_pct": 40.0, "terrain_slope_deg": 50.0, "river_water_level_m": 10.0, "seismic_magnitude": 5.1},
        "expected_alert": "RED",
        "expected_prob_min": 75.0
    },
    {
        "name": "Nepal 2026 Langtang Cryospheric GLOF (Zero Rain)",
        "inputs": {"rainfall_mm_hr": 0.0, "soil_moisture_pct": 35.0, "terrain_slope_deg": 55.0, "river_water_level_m": 11.0, "seismic_magnitude": 5.2},
        "expected_alert": "RED",
        "expected_prob_min": 75.0
    },
    {
        "name": "Normal Himalayan Monsoon Day (Controlled Flow)",
        "inputs": {"rainfall_mm_hr": 15.0, "soil_moisture_pct": 45.0, "terrain_slope_deg": 20.0, "river_water_level_m": 3.0, "seismic_magnitude": 0.0},
        "expected_alert": "GREEN",
        "expected_prob_max": 35.0
    },
    {
        "name": "Severe Valley Downpour (High Rain on Low Slope)",
        "inputs": {"rainfall_mm_hr": 85.0, "soil_moisture_pct": 80.0, "terrain_slope_deg": 15.0, "river_water_level_m": 7.0, "seismic_magnitude": 0.0},
        "expected_alert": ["YELLOW", "ORANGE", "RED"],
        "expected_prob_min": 35.0
    },
    {
        "name": "False Positive Prevention Check (Seismic on Flat Plains)",
        "inputs": {"rainfall_mm_hr": 0.0, "soil_moisture_pct": 20.0, "terrain_slope_deg": 3.0, "river_water_level_m": 1.5, "seismic_magnitude": 6.0},
        "expected_alert": "GREEN",
        "expected_prob_max": 35.0
    }
]

def run_benchmarks():
    print("=" * 70)
    print("  NEERNETRA HISTORICAL DISASTER BENCHMARK VERIFICATION SUITE")
    print("=" * 70)
    
    passed = 0
    for s in scenarios:
        res = predict_flood_risk(s["inputs"])
        color = res["alert_color"]
        prob = res["flood_probability_percent"]
        
        expected = s["expected_alert"]
        is_pass = (color in expected) if isinstance(expected, list) else (color == expected)
        
        status = "[PASS]" if is_pass else "[FAIL]"
        if is_pass:
            passed += 1
            
        print(f"\n{status} {s['name']}")
        print(f"       Result: Probability = {prob}% | Alert = {color}")
        print(f"       Primary Trigger: {res['primary_trigger']}")
        print(f"       Explanation:     {res['explanation']}")
        
    print("\n" + "=" * 70)
    print(f"  BENCHMARK SUMMARY: {passed}/{len(scenarios)} SCENARIOS PASSED")
    print("=" * 70)
    
    return passed == len(scenarios)

if __name__ == "__main__":
    success = run_benchmarks()
    sys.exit(0 if success else 1)
