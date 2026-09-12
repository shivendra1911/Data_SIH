import time
import requests
import json

apis = [
    ("Tomorrow.io Weather", "https://api.tomorrow.io/v4/weather/realtime?location=30.4167,79.3167&fields=precipitationIntensity,humidity&apikey=7jUNyayjouNFNv43EipSqwfRxJvLxeny"),
    ("Open-Elevation", "https://api.open-elevation.com/api/v1/lookup?locations=30.5573,79.5642"),
    ("USGS Earthquake", "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=30.4167&longitude=79.3167&maxradiuskm=200"),
    ("NASA POWER Climate", "https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR&community=AG&longitude=79.3167&latitude=30.4167&start=20240901&end=20240905&format=JSON"),
    ("OSM Shelters & POI", "https://nominatim.openstreetmap.org/search?q=hospital+chamoli+uttarakhand&format=json&limit=3")
]

print("=" * 80)
print("  LIVE EXTERNAL API HEALTH & CONNECTIVITY PROBE")
print("=" * 80)

results = []
for name, url in apis:
    t0 = time.time()
    try:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) NeerNetraDisasterPortal/1.0"}
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
