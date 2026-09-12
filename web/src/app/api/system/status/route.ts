import { NextResponse } from "next/server";
import { getLiveSystemDiagnostics } from "@/lib/liveTelemetryService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const diagnostics = await getLiveSystemDiagnostics();
    const allOnline = diagnostics.every((d) => d.status === "ONLINE");
    const anyOnline = diagnostics.some((d) => d.status === "ONLINE");

    return NextResponse.json({
      status: allOnline ? "HEALTHY" : anyOnline ? "DEGRADED" : "OFFLINE",
      isLiveInternet: anyOnline,
      services: diagnostics,
      timestamp: new Date().toISOString(),
      server: "NeerNetra Node.js Real-Time Ingestion Engine",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "ERROR",
        isLiveInternet: false,
        error: err.message || "Failed to query system diagnostics",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
