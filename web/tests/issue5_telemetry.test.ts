import { NextRequest } from "next/server";
import { GET, TelemetryBreadcrumb } from "../src/app/api/citizen/telemetry-stream/route";
import assert from "node:assert";

async function runTests() {
  console.log("Running Issue 5 tests: unauthenticated telemetry data exposure...");

  // Setup sample mock telemetry in memory
  const sampleBreadcrumb: TelemetryBreadcrumb = {
    id: "test-device-uuid-1",
    device_uuid: "real_node_01",
    phone_model: "Vivo V2437",
    lat: 30.5512,
    lng: 79.5621,
    altitude: 184,
    accuracy: 10,
    speed: 0,
    status: "SOS_STREAM",
    sos_type: "LOCATION_TRACKING",
    timestamp: new Date().toISOString(),
  };

  (global as any).__NEERNETRA_TELEMETRY_STREAM__ = [sampleBreadcrumb];

  // 1. Unauthenticated request (no cookie, no session, no auth header)
  const unauthReq = new NextRequest("http://localhost:3000/api/citizen/telemetry-stream");
  const unauthRes = await GET(unauthReq);
  assert.strictEqual(unauthRes.status, 200, "Unauthenticated GET should return 200 OK");
  const unauthData = await unauthRes.json();

  console.log("Unauthenticated response breadcrumbs count:", unauthData.breadcrumbs?.length);

  assert(Array.isArray(unauthData.breadcrumbs), "breadcrumbs must be an array");
  assert(unauthData.breadcrumbs.length > 0, "must have at least 1 breadcrumb");

  for (const b of unauthData.breadcrumbs) {
    assert.strictEqual(
      b.phone_model,
      undefined,
      `Unauthenticated breadcrumb must NOT leak phone_model. Found: ${b.phone_model}`
    );
  }

  for (const dev of unauthData.latest_per_device || []) {
    assert.strictEqual(
      dev.phone_model,
      undefined,
      `Unauthenticated latest_per_device must NOT leak phone_model. Found: ${dev.phone_model}`
    );
  }

  console.log("PASS: Unauthenticated caller does NOT receive phone_model.");

  // 2. Authenticated request (with admin secret key)
  const authReq = new NextRequest("http://localhost:3000/api/citizen/telemetry-stream", {
    headers: {
      "x-admin-key": "nr_admin_sec_9948c26e107fb783d47a840e",
    },
  });
  const authRes = await GET(authReq);
  assert.strictEqual(authRes.status, 200, "Authenticated GET should return 200 OK");
  const authData = await authRes.json();

  assert(Array.isArray(authData.breadcrumbs), "breadcrumbs must be an array");
  const authBreadcrumb = authData.breadcrumbs.find((b: any) => b.device_uuid === "real_node_01");
  assert(authBreadcrumb, "must contain sample device");
  assert.strictEqual(
    authBreadcrumb.phone_model,
    "Vivo V2437",
    "Authenticated caller SHOULD receive phone_model"
  );

  console.log("PASS: Authenticated caller correctly receives phone_model.");
  console.log("ALL TESTS PASSED for Issue 5!");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
