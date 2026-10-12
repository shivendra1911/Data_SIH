import { NextRequest, NextResponse } from "next/server";
import { GET as routesGet, POST as routesPost, OPTIONS as routesOptions } from "../../routes/safe/route";

export async function OPTIONS() {
  return routesOptions();
}

export async function GET(req: NextRequest) {
  return routesGet(req);
}

export async function POST(req: NextRequest) {
  return routesPost(req);
}
