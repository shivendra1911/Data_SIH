================================================================
NEERNETRA — COMPLETE API KEYS & TOOLS CREDENTIAL SHEET
Give This to Your Agent (Me) When Building
================================================================
Last Updated: September 10, 2026
Status: RESEARCH COMPLETE — All APIs Verified

HOW TO USE THIS DOCUMENT:
Each entry has:
- What it does for NeerNetra
- Where to sign up (exact URL)
- What credential to copy
- Exact env variable name to put in .env file
- Priority: MUST (app breaks without it) / SHOULD / NICE

================================================================
SECTION 1: MUST HAVE BEFORE BUILDING STARTS
(Get all of these TONIGHT — takes 30 mins total)
================================================================

-------------------------------------------------------------
1. FIREBASE (Push Notifications + Auth + Realtime)
-------------------------------------------------------------
Why needed:
  - FCM: Send RED/ORANGE alert notifications to all phones in zone
  - Firebase Auth: Anonymous login for citizens (no username/password needed)
  - Mobile app CANNOT work without FCM
  
Sign up: https://console.firebase.google.com
  → Create project: "NeerNetra-SIH2026"
  → Enable: Authentication → Sign-in method → Anonymous ✓
  → Enable: Cloud Messaging (auto-enabled)
  → Go to Project Settings → Service Accounts → Generate private key
    Download: serviceAccountKey.json → put in backend/ folder
  → Go to Project Settings → General → Add app → Android
    Package: com.neernetra.app
    Download: google-services.json → put in mobile/android/app/ folder
  → Go to Project Settings → General → Web API Key (copy this too)

CREDENTIALS TO COLLECT AND PASTE IN .env:
  FIREBASE_PROJECT_ID=neernetra-sih2026
  FIREBASE_WEB_API_KEY=AIzaSy... (from web app settings)
  (serviceAccountKey.json file — put in backend/ folder)
  (google-services.json file — put in mobile/android/app/ folder)

Cost: FREE (Firebase Spark plan — unlimited FCM, free auth)

-------------------------------------------------------------
2. GOOGLE CLOUD FIRESTORE (NoSQL Document Cloud Persistence)
-------------------------------------------------------------
Why needed:
  - Persistent cloud synchronization for citizen locations, SOS events, and rescue dispatches
  - Automatically configured via serviceAccountKey.json (Firebase Admin SDK)
  - Zero SQL setup required — collections created on first write

CREDENTIALS:
  (serviceAccountKey.json file — present in backend/ folder)
  Project ID: neernetra-e2706

Cost: FREE (Firebase Spark Plan — 50,000 document reads, 20,000 document writes/day)

-------------------------------------------------------------
3. TOMORROW.IO (Rainfall Data — Core Prediction Input)
-------------------------------------------------------------
Why needed:
  - Primary rainfall data source for prediction engine
  - Real-time: current mm/hr for any GPS coordinate
  - Without this: prediction engine needs to use mock/fallback data

Sign up: https://www.tomorrow.io/signup
  → Free plan: 500 API calls/day
  → Go to: Development → API Keys → Create API Key
  → Test immediately (no approval needed):

  Test command (run in PowerShell):
  Invoke-WebRequest "https://api.tomorrow.io/v4/weather/realtime?location=30.4167,79.3167&fields=precipitationIntensity,humidity&apikey=YOUR_KEY_HERE" | Select Content

  Expected response: { "data": { "values": { "precipitationIntensity": 0.5 } } }

CREDENTIAL:
  TOMORROW_IO_API_KEY=your_key_here

Cost: FREE (500 calls/day = 33 zones × every 15 min = perfect fit)

-------------------------------------------------------------
4. PROTOMAPS (Offline Map Tiles — NEW ADDITION)
-------------------------------------------------------------
Why needed:
  - Serves the offline MapLibre tiles
  - Free tier: 200,000 tile requests/month (enough for demo)
  - Without this: no offline maps

Sign up: https://protomaps.com
  → Sign in with GitHub
  → Create API Key
  → Free tier is instant, no credit card

CREDENTIAL:
  PROTOMAPS_API_KEY=your_key_here

Cost: FREE (200K tiles/month free tier)
Alternative: Use OpenMapTiles free hosted service (no key needed but slower)

-------------------------------------------------------------
5. UPSTASH REDIS (Caching + Real-time Pub/Sub)
-------------------------------------------------------------
Why needed:
  - Cache prediction results (avoid hammering APIs every request)
  - WebSocket pub/sub across multiple backend workers
  - Without this: dashboard won't get real-time updates at scale

Sign up: https://upstash.com
  → Sign in with GitHub
  → Create Database → Region: ap-south-1 (Mumbai)
  → Copy REST URL and REST token

CREDENTIAL:
  UPSTASH_REDIS_URL=https://us1-xxxx.upstash.io
  UPSTASH_REDIS_TOKEN=AXxx...

Cost: FREE (10,000 commands/day free)

================================================================
SECTION 2: SHOULD HAVE (Get tonight if time allows)
================================================================

-------------------------------------------------------------
6. OPENWEATHERMAP (Backup Weather API)
-------------------------------------------------------------
Why needed: Fallback when Tomorrow.io quota exhausted
Sign up: https://openweathermap.org/api
  → Sign Up → Go to API keys tab → Copy Default key
  → Note: Key takes 10 minutes to activate after creation
  
Test: https://api.openweathermap.org/data/2.5/weather?lat=30.4167&lon=79.3167&appid=YOUR_KEY

CREDENTIAL:
  OPENWEATHER_API_KEY=your_key_here

Cost: FREE (1000 calls/day, 60 calls/minute)

-------------------------------------------------------------
7. AGROMONITORING (Soil Moisture)
-------------------------------------------------------------
Why needed: Soil saturation is 25% of flood probability formula
Sign up: https://agromonitoring.com/api
  → Register as Student/Researcher
  → Free tier available (may require email verification)
  → Under plan details: copy App ID and API Key

CREDENTIAL:
  AGROMONITORING_APP_ID=your_app_id
  AGROMONITORING_API_KEY=your_api_key

Cost: FREE (limited calls, sufficient for demo)
FALLBACK if not available: Use NASA POWER historical soil data (no key needed)

-------------------------------------------------------------
8. RAILWAY.APP (Backend Hosting)
-------------------------------------------------------------
Why needed: Deploy your FastAPI backend online
            Both mobile app and web dashboard need a live URL
Sign up: https://railway.app
  → Sign in with GitHub
  → New Project → Deploy from GitHub repo
  → Add environment variables (all keys from this document)

CREDENTIAL:
  (No key needed — login with GitHub)
  Your deployed URL will be: https://neernetra-production.up.railway.app

Cost: FREE ($5 free credit on new accounts, no credit card required)

-------------------------------------------------------------
9. VERCEL (Web Dashboard Hosting)
-------------------------------------------------------------
Why needed: Deploy Next.js web dashboard
Sign up: https://vercel.com
  → Sign in with GitHub
  → Import repository → neer-netra/web
  → Auto-deploys on every git push

CREDENTIAL:
  (No key needed — login with GitHub)
  Your URL: https://neernetra.vercel.app

Cost: FREE (Hobby plan, perfect for hackathon)

================================================================
SECTION 3: NO KEY NEEDED (Use these immediately — free forever)
================================================================

-------------------------------------------------------------
10. OPEN-ELEVATION (Terrain Slope Data)
-------------------------------------------------------------
Why needed: Slope is 20% of flood probability formula
No sign-up: https://api.open-elevation.com

Test right now in browser:
https://api.open-elevation.com/api/v1/lookup?locations=30.5573,79.5642

Returns: { "results": [{ "latitude": 30.5573, "longitude": 79.5642, "elevation": 1890 }] }

CREDENTIAL: NONE NEEDED

Implementation:
  const getElevation = async (lat, lng) => {
    const res = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`);
    const data = await res.json();
    return data.results[0].elevation;
  };

Cost: COMPLETELY FREE, no rate limit specified

-------------------------------------------------------------
11. NASA POWER API (Historical Climate / Soil Fallback)
-------------------------------------------------------------
Why needed: Historical rainfall data for model training + soil fallback
No sign-up: https://power.larc.nasa.gov/api/

Test in browser:
https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR&community=AG&longitude=79.3167&latitude=30.4167&start=20240901&end=20240930&format=JSON

Returns daily rainfall data for September 2024 for Chamoli area

CREDENTIAL: NONE NEEDED

Cost: COMPLETELY FREE

-------------------------------------------------------------
12. INDIA-WRIS (River Water Levels)
-------------------------------------------------------------
Why needed: River level is 20% of flood probability formula
URL: https://indiawris.gov.in/wris/#/RiverMonitoring

HOW TO USE: 
  - This is a government website, no formal REST API documented
  - For hackathon: Use their map to look up current levels manually
    then hardcode the demo values
  - For production: Contact india-wris.gov.in for API access
    (Government of India, they support researchers)
  
CREDENTIAL: NONE NEEDED (manual lookup for demo)
ALTERNATIVE: India Water Portal - https://www.indiawaterportal.org

-------------------------------------------------------------
13. GEOFABRIK (Offline Map Data Download)
-------------------------------------------------------------
Why needed: Download OSM map data for Uttarakhand to make offline map
No sign-up needed
Download URL: https://download.geofabrik.de/asia/india/uttarakhand-latest.osm.pbf
File size: ~32MB
Update frequency: Daily

CREDENTIAL: NONE NEEDED

How to use:
  - Download the .pbf file
  - Run through tilemaker (free CLI tool) to convert to MBTiles
  - OR: Use Protomaps hosted (much easier, key #4 above)

-------------------------------------------------------------
14. OSM OVERPASS API (Safe Assembly Points Query)
-------------------------------------------------------------
Why needed: Find government schools, hospitals, ITBP camps in Chamoli
No sign-up needed
URL: https://overpass-api.de/api/interpreter

Query to find emergency shelters in Chamoli:
  [out:json];
  (
    node["amenity"="school"]["name"~"Chamoli"](29,78,32,81);
    node["amenity"="hospital"](29,78,32,81);
    node["amenity"="police"](29,78,32,81);
    node["building"="government"](29,78,32,81);
  );
  out body;

Returns: JSON with GPS coordinates of all schools/hospitals in region
Use this to populate your assembly_points database

CREDENTIAL: NONE NEEDED

-------------------------------------------------------------
15. VILLAGE BOUNDARIES GEOJSON (Zone Polygons)
-------------------------------------------------------------
Why needed: Defines which area = which prediction zone
GitHub: https://github.com/datameet/india-village-boundaries
License: ODbL (free for any use)

Direct URL for Uttarakhand:
  https://raw.githubusercontent.com/datameet/india-village-boundaries/master/states/05_Uttarakhand/

CREDENTIAL: NONE NEEDED

================================================================
SECTION 4: OPTIONAL — FOR FUTURE / NICE TO HAVE
================================================================

-------------------------------------------------------------
16. BRIDGEFY SDK (Alternative BLE Mesh — if Nearby Connections fails)
-------------------------------------------------------------
Why needed: If Google Nearby Connections has setup issues
Sign up: https://bridgefy.me/developers/
  → Create developer account
  → Create app → Get API key

CREDENTIAL:
  BRIDGEFY_API_KEY=your_key_here

Cost: FREE tier (5000 messages/month)
NOTE: Use only as BACKUP to Google Nearby Connections

-------------------------------------------------------------
17. EXPO EAS BUILD (Build APK without local Android Studio)
-------------------------------------------------------------
Why needed: Build actual APK for demo without Android Studio
Sign up: https://expo.dev (use existing Expo account or create)
  → Go to: Account Settings → Access Tokens → Create Token

CREDENTIAL:
  EXPO_TOKEN=your_token_here

Command to build:
  npx eas build -p android --profile preview

Cost: FREE (30 builds/month on free plan)
Time: 15-20 minutes per build

-------------------------------------------------------------
18. SENTRY (Error Tracking — optional for demo)
-------------------------------------------------------------
Why needed: See crashes and errors in real-time during demo
Sign up: https://sentry.io (free for small projects)
CREDENTIAL: SENTRY_DSN=https://xxxx@o0.ingest.sentry.io/xxxx
Cost: FREE

================================================================
SECTION 5: YOUR .env FILE TEMPLATE
================================================================

Create this file at: backend/.env

```
# === REQUIRED — GET THESE TONIGHT ===
FIREBASE_PROJECT_ID=neernetra-e2706
FIREBASE_WEB_API_KEY=AIzaSy_YOUR_KEY_HERE
TOMORROW_IO_API_KEY=YOUR_KEY_HERE

# === SHOULD GET ===
OPENWEATHER_API_KEY=YOUR_KEY_HERE
AGROMONITORING_APP_ID=YOUR_APP_ID
AGROMONITORING_API_KEY=YOUR_KEY_HERE

# === NO KEY NEEDED - just leave as-is ===
OPEN_ELEVATION_URL=https://api.open-elevation.com/api/v1/lookup
NASA_POWER_URL=https://power.larc.nasa.gov/api/temporal/daily/point
OVERPASS_API_URL=https://overpass-api.de/api/interpreter

# === OPTIONAL ===
BRIDGEFY_API_KEY=YOUR_KEY_HERE
SENTRY_DSN=YOUR_DSN_HERE

# === APP CONFIG ===
APP_ENV=development
APP_NAME=NeerNetra
APP_VERSION=1.0.0
ADMIN_SECRET=neernetra_admin_2026  # change this before demo!
JWT_SECRET=super_secret_jwt_key_change_this
```

Create this file at: mobile/.env

```
# === REQUIRED ===
EXPO_PUBLIC_API_URL=http://localhost:8000

# === MAP CONFIG ===
EXPO_PUBLIC_MAP_DEFAULT_LAT=30.4167
EXPO_PUBLIC_MAP_DEFAULT_LNG=79.3167
EXPO_PUBLIC_MAP_DEFAULT_ZOOM=10
```

Create this file at: web/.env.local

```
# === REQUIRED ===
NEXT_PUBLIC_API_URL=http://localhost:8000

# SERVER-SIDE ONLY (not exposed to browser)
ADMIN_SECRET=neernetra_admin_2026
```

================================================================
SECTION 6: CREDENTIAL COLLECTION CHECKLIST
================================================================

Priority A - Do RIGHT NOW (blocks all development):
[x] Firebase project created + serviceAccountKey.json downloaded
[x] Firebase google-services.json downloaded (for Android)  
[x] Tomorrow.io account + API key tested with curl/browser

Priority B - Do tonight after starting build:
[ ] OpenWeatherMap API key (email verification may be needed)
[ ] AgroMonitoring account created

Priority C - No key needed, verify these work RIGHT NOW:
[x] Open-Elevation test: https://api.open-elevation.com/api/v1/lookup?locations=30.5573,79.5642
[x] NASA POWER test: power.larc.nasa.gov/api (check in browser)
[x] USGS Seismic API: https://earthquake.usgs.gov/fdsnws/event/1/query

================================================================
SECTION 7: WHO DOES WHAT (Credential Assignment)
================================================================

SHIVENDRA — Get all API keys:
  1. Tomorrow.io account → test API → give key to Priyanshu
  2. AgroMonitoring account → get credentials → give to Priyanshu
  3. OpenWeatherMap → activate key (10 min) → give to Priyanshu

PRIYANSHU — Platform & Cloud:
  1. Firebase project → download both JSON files
  2. Set up .env files in all folders
  3. Test: python -c "import firebase_admin; print('ok')"

MANAS — Mobile & BLE:
  1. Test Expo Mobile App on physical device
  2. Verify BLE mesh lifecycle and offline storage queue

================================================================
SECTION 8: COST SUMMARY — TOTAL COST FOR DEMO = ₹0
================================================================

| Service | Free Tier | Limit | Your Usage |
|---|---|---|---|
| Firebase FCM | Unlimited | none | ~100 demo alerts |
| Google Firestore | 50K reads/day | 50K/day | ~100 documents |
| Tomorrow.io | 500 calls/day | 500/day | ~33 zones × 4hr demo |
| Open-Elevation | Unlimited | - | ~100 calls |
| NASA POWER | Unlimited | - | ~10 calls |
| USGS Seismic | Unlimited | - | ~100 calls |

TOTAL COST: ₹0 (literally zero rupees)

================================================================
DOCUMENT END
================================================================
NeerNetra API Credentials Sheet v1.0
September 10, 2026 — Team NeerNetra | GLA University
================================================================
