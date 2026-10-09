import { NextRequest, NextResponse } from "next/server";
import { POST as reportPost, OPTIONS as reportOptions } from "../report/route";

export async function OPTIONS() {
  return reportOptions();
}

export async function POST(req: NextRequest) {
  return reportPost(req);
}
