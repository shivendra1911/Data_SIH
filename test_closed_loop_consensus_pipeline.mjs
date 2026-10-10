// End-to-end Verification of the Closed-Loop Disaster Consensus Pipeline
const TARGET_URL = process.env.TARGET_URL || "http://192.168.0.185:3000";

async function runConsensusPipelineTest() {
  console.log("=======================================================================");
  console.log("      NEERNETRA CLOSED-LOOP DISASTER CONSENSUS PIPELINE VERIFICATION   ");
  console.log(`      Target Web Portal: ${TARGET_URL}                                 `);
  console.log("=======================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
    }
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 1: WAYANAD LANDSLIDE 1/3RD SECTOR QUORUM CONSENSUS PIPELINE
  // --------------------------------------------------------------------------
  console.log("--- TEST SUITE 1: WAYANAD LANDSLIDE 1/3RD SECTOR CONSENSUS ---");

  const sectorId = "sector_wayanad_04";

  // 1.1 Reset sector to clean MONITORING state
  console.log("\n[1.1] Resetting sector to MONITORING baseline...");
  const resetRes = await fetch(`${TARGET_URL}/api/landslide/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sector_id: sectorId }),
  });
  const resetData = await resetRes.json();
  assert(resetData.success === true, "Sector reset successfully");

  // 1.2 Single-phone tremor: Phone #1 reports 18.5Hz sub-surface tremor
  console.log("\n[1.2] Single Phone (#1) reports 18.5Hz sub-surface tremor...");
  const phone1Res = await fetch(`${TARGET_URL}/api/landslide/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      device_uuid: "vivo_v2437_phone_01",
      sector_id: sectorId,
      sector_name: "Sector 4: Chooralmala / Meppadi (Wayanad)",
      lat: 11.5273,
      lng: 76.1242,
      tremor_g: 0.19,
      frequency_hz: 18.5,
      duration_s: 30,
    }),
  });
  const phone1Data = await phone1Res.json();
  assert(phone1Data.status === "PENDING_QUORUM", "Single-phone report: Status is strictly PENDING_QUORUM (no false alarm)");
  assert(phone1Data.is_confirmed === false, "Single-phone report: Consensus NOT confirmed (1/3 devices)");
  assert(phone1Data.directive_broadcast_active === false, "Single-phone report: No siren broadcast dispatched");

  // Verify mobile sirens remain silent
  const sirenCheck1 = await fetch(`${TARGET_URL}/api/mobile/siren-dispatch?zone_id=${sectorId}`);
  const sirenData1 = await sirenCheck1.json();
  const sirenGlobalCheck1 = await fetch(`${TARGET_URL}/api/mobile/siren-dispatch`);
  const sirenGlobalData1 = await sirenGlobalCheck1.json();
  const hasActiveSectorTremorSiren = (sirenGlobalData1.active_dispatches || []).some(
    (d) => d.is_active && (d.zone_id === sectorId || d.zone_id?.includes(sectorId))
  );
  assert(sirenData1.is_siren_active_on_mobile === false && !hasActiveSectorTremorSiren, "Single-phone report: Mobile Siren Listener confirms sirens are SILENT");

  // 1.3 Phone #2 reports matching tremor
  console.log("\n[1.3] Phone #2 reports matching tremor in sector...");
  const phone2Res = await fetch(`${TARGET_URL}/api/landslide/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      device_uuid: "motorola_edge60_phone_02",
      sector_id: sectorId,
      lat: 11.5275,
      lng: 76.1245,
      tremor_g: 0.22,
      frequency_hz: 18.4,
      duration_s: 32,
    }),
  });
  const phone2Data = await phone2Res.json();
  assert(phone2Data.status === "PENDING_QUORUM", "2-phone report: Status remains PENDING_QUORUM (2/3 devices)");
  assert(phone2Data.is_confirmed === false, "2-phone report: Quorum NOT yet reached");

  // 1.4 Phone #3 reports matching tremor -> 1/3rd Quorum Reached!
  console.log("\n[1.4] Phone #3 reports matching tremor -> 1/3RD QUORUM CONSENSUS REACHED!");
  const phone3Res = await fetch(`${TARGET_URL}/api/landslide/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      device_uuid: "samsung_a15_phone_03",
      sector_id: sectorId,
      lat: 11.5271,
      lng: 76.1240,
      tremor_g: 0.20,
      frequency_hz: 18.6,
      duration_s: 31,
    }),
  });
  const phone3Data = await phone3Res.json();
  assert(phone3Data.status === "CONFIRMED_LANDSLIDE", "3-phone report: Sector transitions to CONFIRMED_LANDSLIDE");
  assert(phone3Data.is_confirmed === true, "3-phone report: is_confirmed is TRUE (3/3 threshold met)");
  assert(phone3Data.directive_broadcast_active === true, "3-phone report: Automated Directive Broadcast dispatched!");

  // 1.5 Verify Web Active Sectors Panel API
  console.log("\n[1.5] Verifying Web Active Sectors Panel API (/api/landslide/active-sectors)...");
  const sectorsRes = await fetch(`${TARGET_URL}/api/landslide/active-sectors`);
  const sectorsData = await sectorsRes.json();
  const foundSector = sectorsData.sectors?.find((s) => s.sector_id === sectorId);
  assert(foundSector && foundSector.status === "CONFIRMED_LANDSLIDE", "Web Portal displays CONFIRMED_LANDSLIDE with red alarm");
  assert(foundSector && foundSector.has_active_directive === true, "Web Portal confirms active evacuation directive");

  // 1.6 Verify Mobile Siren Listener receives Emergency Siren Directive
  console.log("\n[1.6] Verifying Mobile Siren Listener detects active directive...");
  const sirenCheck2 = await fetch(`${TARGET_URL}/api/mobile/siren-dispatch?zone_id=${sectorId}`);
  const sirenData2 = await sirenCheck2.json();
  const sirenGlobalCheck2 = await fetch(`${TARGET_URL}/api/mobile/siren-dispatch`);
  const sirenGlobalData2 = await sirenGlobalCheck2.json();
  assert(sirenData2.is_siren_active_on_mobile === true || sirenGlobalData2.is_siren_active_on_mobile === true, "Mobile Siren Listener receives ACTIVE_SIREN signal");
  const sirenMessage = sirenData2.details?.emergency_message || sirenGlobalData2.latest_dispatch?.emergency_message || "";
  assert(
    sirenMessage.includes("LANDSLIDE CONFIRMED BY 1/3RD SECTOR CONSENSUS"),
    "Mobile lock-screen siren message matches 1/3rd Consensus Directive"
  );

  // 1.7 Cancel / Disarm Landslide Alarm
  console.log("\n[1.7] Incident Commander disarms Landslide Alarm (POST /api/landslide/cancel)...");
  const cancelRes = await fetch(`${TARGET_URL}/api/landslide/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sector_id: sectorId }),
  });
  const cancelData = await cancelRes.json();
  assert(cancelData.success === true, "Landslide alarm cancelled");
  const sirenCheck3 = await fetch(`${TARGET_URL}/api/mobile/siren-dispatch?zone_id=${sectorId}`);
  const sirenData3 = await sirenCheck3.json();
  const sirenGlobalCheck3 = await fetch(`${TARGET_URL}/api/mobile/siren-dispatch`);
  const sirenGlobalData3 = await sirenGlobalCheck3.json();
  const hasActiveLandslideSiren = (sirenGlobalData3.active_dispatches || []).some(
    (d) => d.is_active && (d.zone_id === sectorId || d.zone_id?.includes(sectorId))
  );
  assert(sirenData3.is_siren_active_on_mobile === false && !hasActiveLandslideSiren, "Mobile phones safely silenced after cancel");

  // --------------------------------------------------------------------------
  // TEST SUITE 2: USAR STRUCTURAL COLLAPSE KINETIC QUORUM PIPELINE
  // --------------------------------------------------------------------------
  console.log("\n--- TEST SUITE 2: USAR STRUCTURAL COLLAPSE KINETIC QUORUM ---");

  // 2.1 Reset collapse state
  await fetch(`${TARGET_URL}/api/collapse/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_uuid: "col_phone_01" }),
  });
  await fetch(`${TARGET_URL}/api/collapse/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_uuid: "col_phone_02" }),
  });
  await fetch(`${TARGET_URL}/api/collapse/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_uuid: "col_phone_03" }),
  });

  // 2.2 Phone #1 detects free-fall and 4.5g impact
  console.log("\n[2.1] Phone #1 detects kinetic shock (free-fall 350ms + 4.5g impact)...");
  const col1Res = await fetch(`${TARGET_URL}/api/collapse/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      device_uuid: "col_phone_01",
      lat: 30.5512,
      lng: 79.5621,
      peak_g: 4.5,
      free_fall_ms: 350,
      confidence: 0.92,
    }),
  });
  const col1Data = await col1Res.json();
  assert(col1Data.cluster_status === "PENDING_QUORUM" || col1Data.status === "PENDING_QUORUM", "1st collapse drop: Cluster is PENDING_QUORUM (1/3 devices)");
  assert(col1Data.is_confirmed === false, "1st collapse drop: Quorum NOT confirmed");

  // 2.3 Phone #2 drops within 100m
  console.log("\n[2.2] Phone #2 drops within 100m (free-fall 320ms + 4.2g impact)...");
  const col2Res = await fetch(`${TARGET_URL}/api/collapse/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      device_uuid: "col_phone_02",
      lat: 30.5513,
      lng: 79.5622,
      peak_g: 4.2,
      free_fall_ms: 320,
      confidence: 0.89,
    }),
  });
  const col2Data = await col2Res.json();
  assert(col2Data.cluster_status === "PENDING_QUORUM" || col2Data.status === "PENDING_QUORUM", "2nd collapse drop: Cluster is PENDING_QUORUM (2/3 devices)");

  // 2.4 Phone #3 drops within 100m -> 3+ QUORUM REACHED!
  console.log("\n[2.3] Phone #3 drops within 100m -> 3+ PHONES REACH SPATIOTEMPORAL QUORUM!");
  const col3Res = await fetch(`${TARGET_URL}/api/collapse/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      device_uuid: "col_phone_03",
      lat: 30.5511,
      lng: 79.5620,
      peak_g: 4.8,
      free_fall_ms: 360,
      confidence: 0.95,
    }),
  });
  const col3Data = await col3Res.json();
  assert(col3Data.cluster_status === "CONFIRMED_COLLAPSE" || col3Data.status === "CONFIRMED_COLLAPSE", "3rd collapse drop: Cluster transitions to CONFIRMED_COLLAPSE!");
  assert(col3Data.is_confirmed === true, "3rd collapse drop: Quorum consensus confirmed (3/3 devices within 100m)");
  assert(col3Data.directive_broadcast_active === true, "3rd collapse drop: Automated Directive Broadcast dispatched!");

  // 2.5 Verify Web Active Clusters Panel API
  console.log("\n[2.4] Verifying Web Active Clusters Panel API (/api/collapse/active-clusters)...");
  const clustersRes = await fetch(`${TARGET_URL}/api/collapse/active-clusters`);
  const clustersData = await clustersRes.json();
  const confirmedCluster = clustersData.clusters?.find((c) => c.status === "CONFIRMED_COLLAPSE");
  assert(confirmedCluster !== undefined, "Web Command Center displays CONFIRMED_COLLAPSE cluster in USAR panel");
  assert(confirmedCluster?.trapped_headcount >= 3, `Trapped headcount verified: ${confirmedCluster?.trapped_headcount} victims`);

  // 2.6 Verify Mobile Siren Listener receives Emergency Collapse Directive
  console.log("\n[2.5] Verifying Mobile Siren Listener detects active collapse directive...");
  const colSirenCheck = await fetch(`${TARGET_URL}/api/mobile/siren-dispatch`);
  const colSirenData = await colSirenCheck.json();
  assert(colSirenData.is_siren_active_on_mobile === true, "Mobile Siren Listener receives ACTIVE_SIREN for structural collapse");
  assert(
    colSirenData.latest_dispatch?.emergency_message?.includes("STRUCTURAL COLLAPSE CONFIRMED BY 3+ PHONES") ||
    colSirenData.active_dispatches?.some((d) => d.emergency_message?.includes("STRUCTURAL COLLAPSE")),
    "Mobile lock-screen siren message matches 3+ Phone Collapse Quorum Directive"
  );

  // 2.7 User confirms "I AM SAFE" within 60s grace window
  console.log("\n[2.6] Phone #1 user taps 'I AM SAFE' (POST /api/collapse/cancel)...");
  const safeRes = await fetch(`${TARGET_URL}/api/collapse/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_uuid: "col_phone_01" }),
  });
  const safeData = await safeRes.json();
  assert(safeData.success === true, "Phone #1 safely disarmed collapse alarm");

  // Verify collapse sirens silenced on mobile
  const colSirenCheckAfter = await fetch(`${TARGET_URL}/api/mobile/siren-dispatch`);
  const colSirenDataAfter = await colSirenCheckAfter.json();
  const hasActiveCollapseSiren = (colSirenDataAfter.active_dispatches || []).some(
    (d) => d.is_active && (d.zone_id?.includes("clp_cluster") || d.zone_id?.includes("collapse"))
  );
  assert(!hasActiveCollapseSiren, "Mobile phones safely disarmed from collapse siren after cancellation");

  // --------------------------------------------------------------------------
  // TEST SUITE 3: RADAR CITIZEN LOCATIONS & MULTI-DEVICE TELEMETRY STREAM
  // --------------------------------------------------------------------------
  console.log("\n--- TEST SUITE 3: RADAR CITIZENS & MULTI-DEVICE TELEMETRY STREAM ---");

  // 3.1 Verify total connected devices on radar
  console.log("\n[3.1] Querying Connected Citizen Locations (/api/citizen/locations)...");
  const radarRes = await fetch(`${TARGET_URL}/api/citizen/locations`);
  const radarData = await radarRes.json();
  assert(radarData.total >= 6, `Radar reports ${radarData.total} connected physical & field mobile nodes (>= 6)`);
  assert(radarData.live_count >= 6, `Radar reports ${radarData.live_count} live active nodes`);

  // 3.2 High-frequency 5s Telemetry Breadcrumb Stream
  console.log("\n[3.2] Testing high-frequency breadcrumb stream ingestion (/api/citizen/telemetry-stream)...");
  const streamRes = await fetch(`${TARGET_URL}/api/citizen/telemetry-stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      device_uuid: "vivo_v2437_physical_node",
      phone_model: "Vivo V2437",
      lat: 27.6015,
      lng: 77.5975,
      altitude: 184,
      accuracy: 4.8,
      speed: 0.0,
      status: "LOCATION_TRACKING",
      timestamp: new Date().toISOString(),
    }),
  });
  const streamData = await streamRes.json();
  assert(streamData.success === true, "5s Telemetry breadcrumb successfully ingested and mirrored");

  // 3.3 Query Telemetry Stream Breadcrumbs
  const getStreamRes = await fetch(`${TARGET_URL}/api/citizen/telemetry-stream`);
  const getStreamData = await getStreamRes.json();
  assert(getStreamData.breadcrumbs?.length > 0, `Telemetry stream contains ${getStreamData.breadcrumbs?.length} breadcrumb points`);

  // SUMMARY
  console.log("\n=======================================================================");
  console.log(`   CLOSED-LOOP CONSENSUS PIPELINE SUMMARY: ${passed}/${total} TESTS PASSED`);
  console.log("=======================================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runConsensusPipelineTest().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
