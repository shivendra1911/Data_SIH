import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  const clientIp = forwarded ? forwarded.split(",")[0].trim() : req.ip || "";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const ipUrl = clientIp && clientIp !== "::1" && clientIp !== "127.0.0.1"
      ? `http://ip-api.com/json/${clientIp}`
      : `http://ip-api.com/json/`;

    const res = await fetch(ipUrl, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.status === "success") {
        return NextResponse.json(
          {
            success: true,
            city: data.city || "Live Location",
            region: data.regionName || data.region || "India",
            country: data.country || "India",
            lat: Number(data.lat),
            lng: Number(data.lon),
            queryIp: data.query,
            isp: data.isp,
            timezone: data.timezone,
            source: "IP_GEOLOCATION_LIVE",
          },
          { headers: corsHeaders }
        );
      }
    }
  } catch (err: any) {
    console.warn("Geolocation service error:", err.message);
  }

  return NextResponse.json(
    {
      success: true,
      city: "Live Location",
      region: "India",
      country: "India",
      lat: 24.7114,
      lng: 83.0387,
      source: "DEFAULT_LIVE_FALLBACK",
    },
    { headers: corsHeaders }
  );
}
