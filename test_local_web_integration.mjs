// Comprehensive 2-Way Mobile <-> Web Integration Test
const LOCAL_URL = process.env.LOCAL_URL || "http://localhost:3000";

async function runTwoWayIntegrationTest() {
  console.log("=============================================================");
  console.log("   NEERNETRA 2-WAY MOBILE <-> WEB PORTAL INTEGRATION TEST    ");
  console.log(`   Target Server: ${LOCAL_URL}                              `);
  console.log("=============================================================\n");

  let passedSteps = 0;

  // Step 1: Health check on Web Platform
  console.log("[1] Checking Web Platform API connectivity...");
  try {
    const res = await fetch(`${LOCAL_URL}/api/citizen/locations`);
    const data = await res.json();
    console.log(`    Status: ${res.status} OK | Current connected citizens: ${data.total}`);
    passedSteps++;
  } catch (err) {
    console.error("    FAILED Step 1:", err.message);
  }

  // Step 2: Mobile APK periodic location sync (GPS Telemetry)
  console.log("\n[2] Simulating Mobile Phone GPS Location Sync (POST /api/location/sync)...");
  const deviceUuid = "vivo-v2437-node-01";
  const locPayload = {
    device_uuid: deviceUuid,
    name: "Vivo V2437 (Physical Device)",
    phone: "+91 98765 43210",
    lat: 30.5573,
    lng: 79.5642,
    altitude: 184,
    accuracy: 4.8,
    battery_level: 89,
    battery_pct: 89,
    zone_id: "chamoli_01",
    status: "SAFE",
    notes: "Vivo V2437 | Periodic live GPS location check-in",
  };
  try {
    const res = await fetch(`${LOCAL_URL}/api/location/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(locPayload),
    });
    const data = await res.json();
    console.log(`    Response (${res.status}):`, JSON.stringify(data));
    if (data.success) {
      console.log(`    ✅ Location sync reached web portal! Total connected: ${data.total_connected}`);
      passedSteps++;
    }
  } catch (err) {
    console.error("    FAILED Step 2:", err.message);
  }

  // Step 3: Verify Web Tactical Dashboard connected mobile count
  console.log("\n[3] Querying Web Command Center Citizen Locations (GET /api/citizen/locations)...");
  try {
    const res = await fetch(`${LOCAL_URL}/api/citizen/locations`);
    const data = await res.json();
    console.log(`    Total Citizens on Radar: ${data.total}, Live Count: ${data.live_count}`);
    const foundDev = data.citizens?.find((c) => c.device_uuid === deviceUuid);
    if (foundDev) {
      console.log(`    ✅ Device found on radar: ${foundDev.name} at (${foundDev.lat}, ${foundDev.lng}) Battery: ${foundDev.battery_pct}% Status: ${foundDev.status}`);
      passedSteps++;
    } else {
      console.error("    ❌ Device NOT found in radar results!");
    }
  } catch (err) {
    console.error("    FAILED Step 3:", err.message);
  }

  // Step 4: High-frequency 5s Telemetry Breadcrumb Stream
  console.log("\n[4] Simulating 5-Second Disaster GPS Telemetry Stream (POST /api/citizen/telemetry-stream)...");
  const streamPayload = {
    device_uuid: deviceUuid,
    phone_model: "Vivo V2437",
    lat: 30.5575,
    lng: 79.5645,
    altitude: 185,
    accuracy: 4.5,
    speed: 0.8,
    status: "SOS_STREAM",
    sos_type: "LOCATION_TRACKING",
    timestamp: new Date().toISOString(),
  };
  try {
    const res = await fetch(`${LOCAL_URL}/api/citizen/telemetry-stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(streamPayload),
    });
    const data = await res.json();
    console.log(`    Response (${res.status}):`, JSON.stringify(data));
    if (data.success) {
      console.log(`    ✅ Telemetry stream saved! Active radar citizens: ${data.active_citizens}`);
      passedSteps++;
    }
  } catch (err) {
    console.error("    FAILED Step 4:", err.message);
  }

  // Step 5: Mobile SOS Distress Trigger (POST /api/citizen/sos)
  console.log("\n[5] Citizen presses Emergency SOS Beacon (POST /api/citizen/sos)...");
  const sosPayload = {
    device_uuid: deviceUuid,
    name: "Vivo V2437 (Distress Active)",
    phone: "+91 98765 43210",
    lat: 30.5575,
    lng: 79.5645,
    status: "SOS",
    sos_type: "HIGH_WATER_EVACUATION",
    medical_distress: "WATER_RISING",
    battery_level: 87,
    accuracy: 3.5,
    is_mesh_relayed: false,
    notes: "Vivo V2437 | Rising water in ground structure",
  };
  try {
    const res = await fetch(`${LOCAL_URL}/api/citizen/sos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sosPayload),
    });
    const data = await res.json();
    console.log(`    Response (${res.status}):`, JSON.stringify(data));
    if (data.success) {
      console.log(`    ✅ Mobile SOS signal ingested by Command Dashboard!`);
      passedSteps++;
    }
  } catch (err) {
    console.error("    FAILED Step 5:", err.message);
  }

  // Step 6: Verify Radar updates to SOS status
  console.log("\n[6] Verifying Citizen Status Updated to SOS on Dashboard Radar...");
  try {
    const res = await fetch(`${LOCAL_URL}/api/citizen/locations`);
    const data = await res.json();
    const foundDev = data.citizens?.find((c) => c.device_uuid === deviceUuid);
    if (foundDev && foundDev.status === "SOS") {
      console.log(`    ✅ Device updated to SOS status on radar! Medical distress: ${foundDev.medical_distress}`);
      passedSteps++;
    } else {
      console.error("    ❌ Device status did not update to SOS:", foundDev?.status);
    }
  } catch (err) {
    console.error("    FAILED Step 6:", err.message);
  }

  // Step 7: Web Command Center dispatches emergency siren to phones (POST /api/mobile/siren-dispatch)
  console.log("\n[7] Web Incident Commander dispatches Civil Defense Siren (POST /api/mobile/siren-dispatch)...");
  const sirenDispatchPayload = {
    zone_id: "chamoli_01",
    zone_name: "Chamoli Disaster Sector",
    action: "ACTIVATE",
    authorized_by: "NDRF / SDMA National Command Authority",
    message: "🚨 MANDATORY EVACUATION: Flash flood wave approaching Chamoli. Immediate high ground ascent ordered!",
    safe_haven: "Chamoli High Ground Relief Staging Camp",
  };
  try {
    const res = await fetch(`${LOCAL_URL}/api/mobile/siren-dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sirenDispatchPayload),
    });
    const data = await res.json();
    console.log(`    Response (${res.status}):`, JSON.stringify(data));
    if (data.success) {
      console.log(`    ✅ Emergency Siren dispatched! Target devices: ${data.record?.target_devices_count}`);
      passedSteps++;
    }
  } catch (err) {
    console.error("    FAILED Step 7:", err.message);
  }

  // Step 8: Mobile Siren Listener queries siren state (GET /api/mobile/siren-dispatch)
  console.log("\n[8] Mobile Siren Listener checks for active sirens (GET /api/mobile/siren-dispatch)...");
  try {
    const res = await fetch(`${LOCAL_URL}/api/mobile/siren-dispatch`);
    const data = await res.json();
    console.log(`    Response (${res.status}):`, JSON.stringify(data));
    if (data.is_siren_active_on_mobile && data.active_dispatches?.length > 0) {
      console.log(`    ✅ Mobile Siren Listener detected ACTIVE siren: "${data.latest_dispatch?.emergency_message}"`);
      passedSteps++;
    } else {
      console.error("    ❌ Mobile Siren Listener did NOT detect active siren!");
    }
  } catch (err) {
    console.error("    FAILED Step 8:", err.message);
  }

  // Step 9: Web Commander halts siren (POST /api/mobile/siren-dispatch action: HALT)
  console.log("\n[9] Web Incident Commander halts siren broadcast (POST /api/mobile/siren-dispatch action: HALT)...");
  try {
    const res = await fetch(`${LOCAL_URL}/api/mobile/siren-dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zone_id: "chamoli_01",
        action: "HALT",
        authorized_by: "NDRF / SDMA National Command Authority",
      }),
    });
    const data = await res.json();
    console.log(`    Response (${res.status}):`, JSON.stringify(data));
    if (data.success && !data.is_active) {
      console.log(`    ✅ Siren successfully halted on Web Portal!`);
      passedSteps++;
    }
  } catch (err) {
    console.error("    FAILED Step 9:", err.message);
  }

  // Step 10: Verify Mobile Siren Listener receives HALT
  console.log("\n[10] Mobile Siren Listener verifies siren is HALTED (GET /api/mobile/siren-dispatch)...");
  try {
    const res = await fetch(`${LOCAL_URL}/api/mobile/siren-dispatch`);
    const data = await res.json();
    console.log(`    Active Sirens: ${data.total_active_mobile_sirens}, is_active: ${data.is_siren_active_on_mobile}`);
    if (!data.is_siren_active_on_mobile && data.total_active_mobile_sirens === 0) {
      console.log(`    ✅ Mobile siren safely silenced on device!`);
      passedSteps++;
    }
  } catch (err) {
    console.error("    FAILED Step 10:", err.message);
  }

  console.log(`\n=============================================================`);
  console.log(`   INTEGRATION TEST SUMMARY: ${passedSteps}/10 CHECKS PASSED `);
  console.log(`=============================================================`);
}

runTwoWayIntegrationTest().catch(console.error);
