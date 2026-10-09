"""
NeerNetra End-to-End Integration Verification Suite
Tests the complete real-time data loops between:
  1. Mobile App (Citizen edge node) -> Ingests GPS & SOS
  2. Backend Server (FastAPI)       -> Runs ML inference, clusters distress, routes commands
  3. Web Dashboard (NDRF Command)  -> Real-time telemetry, rescue dispatch, emergency broadcast
"""

import os
import sys
import time
import json
from datetime import datetime, timezone, timedelta

# Add backend directory and repo root to sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(CURRENT_DIR)
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from fastapi.testclient import TestClient

def run_integration_tests():
    print("=" * 75)
    print("  NEERNETRA END-TO-END INTEGRATION TEST SUITE")
    print("  Connecting Web Command Portal, Backend API, and Citizen Mobile Nodes")
    print("=" * 75)

    try:
        from main import app
    except ImportError as e:
        print(f"[FAIL] Could not import FastAPI app: {e}")
        return False

    with TestClient(app) as client:
        tests_passed = 0
        total_tests = 17

    # 1. Health & Status
    print("\n[TEST 1] Verifying Backend Root & Health Status...")
    res = client.get("/")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert data["status"] == "ONLINE"
    print(f"  --> Root status: ONLINE | Monitored Zones: {data.get('monitored_zones')}")
    tests_passed += 1

    # 2. Multi-Zone AI Prediction (Web Dashboard Overview)
    print("\n[TEST 2] Verifying Global Multi-Zone Prediction Grid (/api/prediction/zones)...")
    res = client.get("/api/prediction/zones")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    zones_data = res.json()
    assert zones_data["total_zones"] == 10, f"Expected 10 Himalayan zones, got {zones_data['total_zones']}"
    print(f"  --> Loaded {zones_data['total_zones']} Himalayan zones across Uttarakhand.")
    for z in zones_data["zones"][:3]:
        print(f"      • {z['zone_name']:<14} ({z['river']}): {z['alert_color']} ({z['flood_probability_percent']}%)")
    tests_passed += 1

    # 3. Zone-Specific Telemetry & Physics Inference
    print("\n[TEST 3] Verifying Real-Time AI Inference for Chamoli (/api/prediction/current)...")
    res = client.get("/api/prediction/current?zone_id=chamoli_01")
    assert res.status_code == 200
    pred = res.json()
    assert "flood_probability_percent" in pred
    assert "alert_color" in pred
    assert "primary_trigger" in pred
    assert "sensors" in pred
    print(f"  --> Zone: {pred['zone_name']} | Risk: {pred['flood_probability_percent']}% [{pred['alert_color']}]")
    print(f"  --> AI Trigger: {pred['primary_trigger']}")
    tests_passed += 1

    # 4. Mobile App Periodic 5-Minute GPS Sync (/api/location/sync)
    print("\n[TEST 4] Simulating Mobile App 5-Minute GPS Sync (/api/location/sync)...")
    mobile_uuid = f"dev_test_phone_{int(time.time())}"
    sync_payload = {
        "device_uuid": mobile_uuid,
        "lat": 30.5590,
        "lng": 79.5660,
        "altitude": 1490.5,
        "accuracy": 4.0,
        "battery_level": 92,
        "last_synced_at": datetime.now(timezone.utc).isoformat(),
        "zone_id": "chamoli_01"
    }
    res = client.post("/api/location/sync", json=sync_payload)
    assert res.status_code == 200
    assert res.json()["success"] is True
    print(f"  --> Mobile Node {mobile_uuid[:18]} registered GPS location.")
    tests_passed += 1

    # 5. Web Dashboard Live Citizens & Unresponsive Danger Escalation (/api/location/live)
    print("\n[TEST 5] Verifying Web Dashboard Live Citizen Ingestion (/api/location/live)...")
    res = client.get("/api/location/live")
    assert res.status_code == 200
    live_data = res.json()
    device_uuids = [d["device_uuid"] for d in live_data["devices"]]
    assert mobile_uuid in device_uuids, "Newly synced mobile device not found in live query!"
    print(f"  --> Total Active Citizens on Radar: {live_data['total_devices']}")
    print(f"  --> Unresponsive Danger Citizens: {live_data['unresponsive_danger_count']}")
    tests_passed += 1

    # 6. Mobile App Distress Beacon Trigger (/api/sos/trigger)
    print("\n[TEST 6] Simulating Mobile App Emergency SOS Trigger (/api/sos/trigger)...")
    sos_payload = {
        "device_uuid": mobile_uuid,
        "lat": 30.5590,
        "lng": 79.5660,
        "status": "SOS",
        "sos_type": "TRAPPED",
        "is_mesh_relayed": True,
        "notes": "BLE Multi-Hop mesh relay test beacon from collapsed bridge."
    }
    res = client.post("/api/sos/trigger", json=sos_payload)
    assert res.status_code == 200
    sos_res = res.json()
    assert sos_res["success"] is True
    print(f"  --> SOS Beacon Ingested: {sos_res['message_id']} (Total Active SOS: {sos_res['total_active_sos']})")
    tests_passed += 1

    # 7. Web Dashboard Rescue Clustering & Triage (/api/sos/clusters)
    print("\n[TEST 7] Verifying NDRF Rescue Clustering (/api/sos/clusters)...")
    res = client.get("/api/sos/clusters?zone_id=chamoli_01")
    assert res.status_code == 200
    clusters_data = res.json()
    assert len(clusters_data["clusters"]) > 0
    c1 = clusters_data["clusters"][0]
    print(f"  --> Rescue Cluster #{c1['cluster_id']} identified: {c1['total_people']} victims | Priority: {c1['priority']}")
    tests_passed += 1

    # 8. Web Dashboard Tactical Rescue Squad Dispatch (/api/rescue/dispatch)
    print("\n[TEST 8] Simulating Web Command Portal Rescue Squad Dispatch (/api/rescue/dispatch)...")
    dispatch_payload = {
        "cluster_id": c1["cluster_id"],
        "squad_type": "HELICOPTER",
        "zone_id": "chamoli_01",
        "assigned_unit": "NDRF Air Wing Squad 04",
        "notes": "Immediate airlift extraction authorized."
    }
    res = client.post("/api/rescue/dispatch", json=dispatch_payload)
    assert res.status_code == 200
    disp_res = res.json()
    assert disp_res["success"] is True
    print(f"  --> Mission Launch Confirmed: {disp_res['dispatch']['dispatch_id']} ({disp_res['dispatch']['assigned_unit']})")
    tests_passed += 1

    # 9. Emergency Red Alert Broadcast & Active Alerts (/api/alert/broadcast)
    print("\n[TEST 9] Simulating Government Red Alert Evacuation Broadcast (/api/alert/broadcast)...")
    res = client.post("/api/alert/broadcast?zone_id=chamoli_01")
    assert res.status_code == 200
    bcast_res = res.json()
    assert bcast_res["broadcast_status"] == "DISPATCHED"

    # Verify mobile client can read active alerts
    alerts_res = client.get("/api/alerts/active")
    assert alerts_res.status_code == 200
    assert len(alerts_res.json()["alerts"]) > 0
    print(f"  --> Emergency Broadcast Broadcasted to all phones in CHAMOLI_01 sector.")
    tests_passed += 1

    # 10. Firebase Cloud Messaging (FCM) Push Token Registration & Alert Dispatch
    print("\n[TEST 10] Verifying Firebase Cloud Messaging (FCM) Push Registration & Broadcast...")
    reg_res = client.post("/api/telemetry/register-push-token", json={
        "device_uuid": "dev_test_phone_178",
        "fcm_token": "fcm_token_dry_run_device_node",
        "zone_id": "chamoli_01"
    })
    assert reg_res.status_code == 200
    assert reg_res.json()["success"] is True

    fcm_test_res = client.post("/api/alerts/test-fcm", json={
        "zone_id": "chamoli_01",
        "title": "🚨 GLOF High Risk Push",
        "body": "Evacuate Chamoli basin immediately.",
        "dry_run": True
    })
    assert fcm_test_res.status_code == 200
    fcm_data = fcm_test_res.json()
    assert fcm_data["success"] is True
    print(f"  --> Firebase FCM Push Broadcast Verified! Topic Sent: {fcm_data['fcm_summary']['topic_dispatched']}")
    tests_passed += 1

    # 11. Official Central Water Commission (CWC) Danger Threshold Calibration
    print("\n[TEST 11] Verifying Official CWC Gauge Danger Calibration (/api/prediction/current)...")
    res = client.get("/api/prediction/current?zone_id=chamoli_01")
    assert res.status_code == 200
    pred_cwc = res.json()
    assert "cwc_gauge" in pred_cwc, "Missing cwc_gauge in prediction!"
    cwc = pred_cwc["cwc_gauge"]
    assert "warning_level_m" in cwc and "danger_level_m" in cwc and "hfl_record_m" in cwc
    print(f"  --> CWC Station: {cwc['gauge_station']} ({cwc['river']})")
    print(f"  --> Warning: {cwc['warning_level_m']}m | Danger: {cwc['danger_level_m']}m | HFL: {cwc['hfl_record_m']}m | Status: {cwc['status']}")
    tests_passed += 1

    # 12. High-Ground Evacuation Safe Havens & Compass Routing (/api/shelters/high-ground)
    print("\n[TEST 12] Verifying Offline High-Ground Evacuation Routing (/api/shelters/high-ground)...")
    res = client.get("/api/shelters/high-ground?current_lat=30.4100&current_lng=79.3100&current_alt=1450.0&zone_id=chamoli_01")
    assert res.status_code == 200
    sh_data = res.json()
    assert sh_data["total"] > 0
    nearest = sh_data["nearest_shelter"]
    assert nearest is not None
    assert "distance_km" in nearest and "bearing_compass" in nearest and "elevation_gain_m" in nearest
    print(f"  --> Nearest Safe Shelter: {nearest['name']}")
    print(f"  --> Distance: {nearest['distance_km']} km ({nearest['distance_m']}m) | Elevation Gain: +{nearest['elevation_gain_m']}m | Bearing: {nearest['bearing_deg']}° ({nearest['bearing_compass']})")
    tests_passed += 1

    # 13. Edge Building Collapse Ingestion & Initial Cluster Creation
    print("\n[TEST 13] Verifying Edge Structural Collapse Event Ingestion (/api/collapse/event)...")
    c_res1 = client.post("/api/collapse/event", json={
        "device_uuid": "dev_collapse_victim_01",
        "lat": 30.5573,
        "lng": 79.5642,
        "confidence": 0.94,
        "peak_g": 5.2,
        "rubble_duration_s": 8.0,
        "notes": "Satya Niketan structural failure test"
    })
    assert c_res1.status_code == 200, f"Expected 200, got {c_res1.status_code}"
    c_data1 = c_res1.json()
    assert c_data1["success"] is True
    assert c_data1["cluster_status"] == "PENDING_QUORUM"
    assert c_data1["quorum_count"] == 1
    cluster_id = c_data1["cluster_id"]
    print(f"  --> First collapse report ingested. Cluster: {cluster_id} [Status: {c_data1['cluster_status']}]")
    tests_passed += 1

    # 14. 3+ Phone Spatiotemporal Quorum Consensus (Within 100m)
    print("\n[TEST 14] Verifying 3+ Phone Spatiotemporal Quorum Consensus (Upgrade to CONFIRMED_COLLAPSE)...")
    # Phone 2 (30 meters away)
    c_res2 = client.post("/api/collapse/event", json={
        "device_uuid": "dev_collapse_victim_02",
        "lat": 30.5575,
        "lng": 79.5644,
        "confidence": 0.91,
        "peak_g": 4.6,
        "rubble_duration_s": 8.0
    })
    assert c_res2.status_code == 200
    assert c_res2.json()["cluster_id"] == cluster_id
    assert c_res2.json()["quorum_count"] == 2

    # Phone 3 (50 meters away) -> Reaches Quorum >= 3!
    c_res3 = client.post("/api/collapse/event", json={
        "device_uuid": "dev_collapse_victim_03",
        "lat": 30.5571,
        "lng": 79.5640,
        "confidence": 0.96,
        "peak_g": 6.1,
        "rubble_duration_s": 8.0
    })
    assert c_res3.status_code == 200
    c_data3 = c_res3.json()
    assert c_data3["cluster_id"] == cluster_id
    assert c_data3["quorum_count"] == 3
    assert c_data3["is_confirmed"] is True
    assert c_data3["cluster_status"] == "CONFIRMED_COLLAPSE"
    print(f"  --> Quorum Reached! 3 phones confirmed collapse in 100m. Status: {c_data3['cluster_status']}")
    tests_passed += 1

    # 15. USAR Active Collapse Clusters Endpoint
    print("\n[TEST 15] Verifying Active USAR Collapse Clusters Feed (/api/collapse/active-clusters)...")
    c_list_res = client.get("/api/collapse/active-clusters")
    assert c_list_res.status_code == 200
    c_list_data = c_list_res.json()
    assert c_list_data["confirmed_clusters_count"] >= 1
    target_cluster = next((c for c in c_list_data["clusters"] if c["cluster_id"] == cluster_id), None)
    assert target_cluster is not None
    assert target_cluster["status"] == "CONFIRMED_COLLAPSE"
    assert target_cluster["trapped_headcount"] == 3
    print(f"  --> Confirmed Collapse Clusters: {c_list_data['confirmed_clusters_count']} | Trapped Headcount: {target_cluster['trapped_headcount']}")
    tests_passed += 1

    # 16. Inverted Safety Window "I AM SAFE" User Cancellation
    print("\n[TEST 16] Verifying User 'I AM SAFE' Cancellation Disarm (/api/collapse/cancel)...")
    cancel_res = client.post("/api/collapse/cancel", json={
        "device_uuid": "dev_collapse_victim_01",
        "lat": 30.5573,
        "lng": 79.5642
    })
    assert cancel_res.status_code == 200
    cancel_data = cancel_res.json()
    assert cancel_data["success"] is True
    assert cancel_data["status"] == "CANCELLED"
    print(f"  --> Alarm safely cancelled for dev_collapse_victim_01. Affected clusters: {cancel_data['affected_clusters']}")
    tests_passed += 1

    # 17. False Alarm Prevention: Uncorrelated phone drop > 15s later starts fresh cluster and does NOT form false quorum
    print("\n[TEST 17] Verifying False Alarm Prevention (Phone Drops > 15s Apart Do NOT Accrue Into Quorum)...")
    # First isolated drop
    iso_res1 = client.post("/api/collapse/event", json={
        "device_uuid": "dev_single_drop_user_A",
        "lat": 29.3950,
        "lng": 79.4580,
        "confidence": 0.88,
        "peak_g": 3.8,
        "rubble_duration_s": 8.0,
        "notes": "Accidental phone drop on street"
    })
    assert iso_res1.status_code == 200
    iso_data1 = iso_res1.json()
    assert iso_data1["cluster_status"] == "PENDING_QUORUM"
    assert iso_data1["quorum_count"] == 1
    c_id_iso1 = iso_data1["cluster_id"]

    # Manually backdate cluster 1 last_report_at by 20 seconds to simulate time lapse > 15s
    from main import collapse_clusters_db
    collapse_clusters_db[c_id_iso1]["last_report_at"] = (datetime.now(timezone.utc) - timedelta(seconds=20)).isoformat()

    # Second isolated drop at same location 20s later -> MUST NOT merge with expired cluster, must start fresh!
    iso_res2 = client.post("/api/collapse/event", json={
        "device_uuid": "dev_single_drop_user_B",
        "lat": 29.3952,
        "lng": 79.4581,
        "confidence": 0.86,
        "peak_g": 3.6,
        "rubble_duration_s": 8.0,
        "notes": "Independent phone drop later in the day"
    })
    assert iso_res2.status_code == 200
    iso_data2 = iso_res2.json()
    assert iso_data2["cluster_id"] != c_id_iso1, "Uncorrelated phone drop > 15s later should not merge into previous cluster!"
    assert iso_data2["cluster_status"] == "PENDING_QUORUM"
    assert iso_data2["quorum_count"] == 1
    assert collapse_clusters_db[c_id_iso1]["status"] == "EXPIRED_NO_QUORUM"
    print(f"  --> False alarm prevention verified! Past drop expired; new drop started fresh cluster {iso_data2['cluster_id']} (Quorum: 1).")
    tests_passed += 1

    print("\n" + "=" * 75)
    print(f"  ALL {tests_passed}/{total_tests} INTEGRATION TESTS PASSED WITH 100% SUCCESS RATE!")
    print("=" * 75)
    return True

if __name__ == '__main__':
    ok = run_integration_tests()
    sys.exit(0 if ok else 1)
