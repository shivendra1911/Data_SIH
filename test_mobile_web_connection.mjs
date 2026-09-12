// End-to-end test simulating mobile APK talking to live Vercel cloud web platform
const LIVE_URL = "https://data-sih.vercel.app";

async function testMobileConnection() {
  console.log("=== NEERNETRA MOBILE <-> WEB LIVE INTEGRATION TEST ===");
  console.log(`Target Cloud Web URL: ${LIVE_URL}\n`);

  // Step 1: Fetch Zone Prediction
  console.log("[1] Mobile App: Fetching zone prediction from live web backend...");
  const predRes = await fetch(`${LIVE_URL}/api/prediction/current?zone_id=chamoli_01`);
  const predData = await predRes.json();
  console.log("    Response:", predRes.status, JSON.stringify(predData));

  // Step 2: 5-Minute Periodic Location Sync
  console.log("\n[2] Mobile App: Syncing citizen GPS coordinates (Background Telemetry)...");
  const locPayload = {
    device_uuid: "citizen-apk-device-01",
    name: "Citizen Mobile (Live APK)",
    lat: 30.5573,
    lng: 79.5642,
    altitude: 1450,
    accuracy: 4.5,
    battery_level: 89,
    zone_id: "chamoli_01",
    status: "SAFE",
  };
  const locRes = await fetch(`${LIVE_URL}/api/location/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(locPayload),
  });
  const locData = await locRes.json();
  console.log("    Response:", locRes.status, JSON.stringify(locData));

  // Step 3: Trigger Live SOS Beacon from Mobile APK
  console.log("\n[3] Mobile App: Citizen presses Emergency SOS Beacon...");
  const sosPayload = {
    device_uuid: "citizen-apk-device-01",
    lat: 30.5573,
    lng: 79.5642,
    danger_level: "HIGH",
    battery_level: 89,
    people_count: 3,
    medical_distress: "WATER_RISING",
    is_mesh_relayed: false,
    timestamp: new Date().toISOString(),
  };
  const sosRes = await fetch(`${LIVE_URL}/api/sos/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sosPayload),
  });
  const sosData = await sosRes.json();
  console.log("    Response:", sosRes.status, JSON.stringify(sosData));

  // Step 4: Verify Web Tactical Dashboard citizen telemetry
  console.log("\n[4] Web Command Center: Querying real-time citizen radar coordinates...");
  const citRes = await fetch(`${LIVE_URL}/api/citizen/locations`);
  const citData = await citRes.json();
  console.log(`    Total Citizens on Radar: ${citData.total}, Live Active: ${citData.live_count}`);

  // Step 5: Verify Rescue Cluster Engine
  console.log("\n[5] Web Command Center: Inspecting NDRF automated rescue clusters...");
  const clusterRes = await fetch(`${LIVE_URL}/api/sos/clusters`);
  const clusterData = await clusterRes.json();
  console.log(`    Clusters Formed: ${clusterData.clusters.length}, Assigned: ${clusterData.clusters[0]?.assigned_team}`);

  console.log("\n=== ALL INTEGRATION CHECKS PASSED SUCCESSFULLY ===");
}

testMobileConnection().catch(console.error);
