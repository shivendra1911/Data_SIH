"""
NeerNetra Live Real-Time Polling Pipeline & Daemon
Continuously ingests live satellite, weather, and seismic telemetry from APIs,
runs real-time multi-hazard predictions across all 10 Himalayan zones,
and streams the results to latest_zone_predictions.json for backend & dashboard consumption.
"""

import os
import sys
import time
import json
import argparse
from datetime import datetime, timezone

# Ensure ai_model is in python path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from fetch_realtime_data import fetch_rainfall, fetch_elevation, estimate_slope_from_elevation, fetch_seismic, estimate_soil_moisture, estimate_river_level, ZONES
from inference_engine import predict_flood_risk

LATEST_JSON_PATH = os.path.join(BASE_DIR, "latest_zone_predictions.json")
TELEMETRY_LOG_PATH = os.path.join(BASE_DIR, "live_telemetry_history.csv")


def poll_and_predict_all_zones(verbose=True):
    timestamp_utc = datetime.now(timezone.utc).isoformat()
    if verbose:
        print("=" * 70)
        print(f"  NEERNETRA TELEMETRY POLL & PREDICTION CYCLE: {timestamp_utc}")
        print("=" * 70)

    results = {}
    csv_rows = []

    for zone_id, zone in ZONES.items():
        lat, lng = zone["lat"], zone["lng"]
        name = zone["name"]

        # 1. Fetch live rainfall from Tomorrow.io
        rain, humidity = fetch_rainfall(lat, lng)
        if rain is None:
            rain, humidity = 0.0, 50.0  # safe fallback

        # 2. Fetch elevation and estimate slope
        elev = fetch_elevation(lat, lng)
        slope = estimate_slope_from_elevation(lat, lng, elev) if elev else 25.0
        if slope is None:
            slope = 25.0

        # 3. Fetch seismic activity from USGS
        seismic = fetch_seismic(lat, lng, radius_km=200)
        if seismic is None:
            seismic = 0.0

        # 4. Physical proxies for soil and river
        soil = estimate_soil_moisture(humidity, rain)
        river = estimate_river_level(rain, slope)

        sensor_dict = {
            "rainfall_mm_hr": rain,
            "soil_moisture_pct": soil,
            "terrain_slope_deg": slope,
            "river_water_level_m": river,
            "seismic_magnitude": seismic,
            "elevation_m": elev,
            "humidity_pct": humidity
        }

        # 5. Run ML Model Prediction
        prediction = predict_flood_risk(sensor_dict)

        zone_data = {
            "zone_id": zone_id,
            "zone_name": name,
            "coordinates": {"lat": lat, "lng": lng},
            "flood_probability_percent": prediction["flood_probability_percent"],
            "alert_color": prediction["alert_color"],
            "primary_trigger": prediction["primary_trigger"],
            "explanation": prediction["explanation"],
            "sensors": sensor_dict,
            "last_synced_at": timestamp_utc
        }

        results[zone_id] = zone_data

        if verbose:
            color = prediction["alert_color"]
            prob = prediction["flood_probability_percent"]
            print(f"  [{color:<6}] {name:<14} | Rain: {rain:>5.1f}mm | Soil: {soil:>5.1f}% | River: {river:>5.2f}m | Seis: {seismic:>3.1f}M -> {prob:>5.1f}% Risk")

        csv_rows.append(f"{timestamp_utc},{zone_id},{name},{lat},{lng},{rain},{soil},{slope},{river},{seismic},{prediction['flood_probability_percent']},{prediction['alert_color']}")

    # Save latest snapshot to JSON
    with open(LATEST_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump({
            "updated_at": timestamp_utc,
            "total_monitored_zones": len(results),
            "zones": results
        }, f, indent=2)

    # Append to telemetry log CSV
    file_exists = os.path.exists(TELEMETRY_LOG_PATH)
    with open(TELEMETRY_LOG_PATH, "a", encoding="utf-8") as f:
        if not file_exists:
            f.write("timestamp_utc,zone_id,zone_name,lat,lng,rainfall_mm_hr,soil_moisture_pct,terrain_slope_deg,river_water_level_m,seismic_magnitude,flood_prob_pct,alert_color\n")
        for row in csv_rows:
            f.write(row + "\n")

    if verbose:
        print("-" * 70)
        print(f"  [✓] Updated {LATEST_JSON_PATH}")
        print(f"  [✓] Appended readings to {TELEMETRY_LOG_PATH}")
        print("=" * 70 + "\n")

    return results


def run_daemon(interval_seconds=900):
    print(f"[*] Starting NeerNetra Telemetry Daemon (Interval: {interval_seconds}s)...")
    while True:
        try:
            poll_and_predict_all_zones(verbose=True)
            print(f"[*] Sleeping for {interval_seconds}s... (Press Ctrl+C to stop)")
            time.sleep(interval_seconds)
        except KeyboardInterrupt:
            print("\n[!] Daemon stopped by user.")
            break
        except Exception as e:
            print(f"[!] Error in polling loop: {e}")
            time.sleep(10)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NeerNetra Live Telemetry Polling Daemon")
    parser.add_argument("--daemon", action="store_true", help="Run continuously as background daemon")
    parser.add_argument("--interval", type=int, default=900, help="Polling interval in seconds (default: 900 / 15 mins)")
    args = parser.parse_args()

    if args.daemon:
        run_daemon(args.interval)
    else:
        # Run single polling cycle
        poll_and_predict_all_zones(verbose=True)
