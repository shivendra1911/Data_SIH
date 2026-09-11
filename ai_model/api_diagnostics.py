import time
import requests
import json

apis = [
    ("Tomorrow.io Weather", "https://api.tomorrow.io/v4/weather/realtime?location=30.4167,79.3167&fields=precipitationIntensity,humidity&apikey=7jUNyayjouNFNv43EipSqwfRxJvLxeny"),
    ("Open-Elevation", "https://api.open-elevation.com/api/v1/lookup?locations=30.5573,79.5642"),
    ("USGS Earthquake", "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=30.4167&longitude=79.3167&maxradiuskm=200"),
    ("NASA POWER Climate", "https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR&community=AG&longitude=79.3167&latitude=30.4167&start=20240901&end=20240905&format=JSON"),
    ("OSM Overpass Shelters", "https://overpass-api.de/api/interpreter?data=%5Bout%3Ajson%5D%3Bnode%28around%3A10000%2C30.4167%2C79.3167%29%5B%22amenity%22%3D%22hospital%22%5D%3Bout%3B")
]

print("=" * 80)
print("  LIVE EXTERNAL API HEALTH & CONNECTIVITY PROBE")
print("=" * 80)

results = []
for name, url in apis:
    t0 = time.time()
    try:
        headers = {"User-Agent": "NeerNetraDisasterSystem/1.0 (contact: student-sih@example.org)"}
        r = requests.get(url, headers=headers, timeout=15)
        latency = int((time.time() - t0) * 1000)
        status = r.status_code
        sample = r.text[:140].replace("\n", " ").strip()
        print(f"[{name:<22}] HTTP {status:<3} | {latency:>4}ms | Response: {sample}")
        results.append({"name": name, "status": status, "latency_ms": latency, "ok": status == 200, "sample": sample})
    except Exception as e:
        latency = int((time.time() - t0) * 1000)
        print(f"[{name:<22}] FAILED  | {latency:>4}ms | Error: {str(e)[:80]}")
        results.append({"name": name, "status": "ERROR", "latency_ms": latency, "ok": False, "error": str(e)})

with open("ai_model/api_health_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)

print("=" * 80)
