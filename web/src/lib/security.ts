import { NextRequest } from "next/server";

const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || "nr_admin_sec_9948c26e107fb783d47a840e";

/**
 * Validates admin authorization for mission-critical endpoints
 * (e.g., forced sirens, evacuation directives, USAR deployments).
 */
export function validateAdminAuth(req: NextRequest): { authorized: boolean; reason?: string } {
  // Check header 'x-admin-key' or 'Authorization: Bearer <key>'
  const adminKey = req.headers.get("x-admin-key");
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  const keyToTest = adminKey || bearerToken;

  // In production or development, check against ADMIN_SECRET
  if (keyToTest && keyToTest === ADMIN_SECRET) {
    return { authorized: true };
  }

  // Also allow requests originating from same-origin internal Next.js dashboard
  const host = req.headers.get("host");
  const referer = req.headers.get("referer");
  if (referer && host && referer.includes(host)) {
    return { authorized: true };
  }

  return {
    authorized: false,
    reason: "Unauthorized: Missing or invalid x-admin-key header.",
  };
}

/**
 * In-memory sliding window rate limiter
 */
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number = 20,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; retryAfterSec?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.expiresAt) {
    rateLimitMap.set(key, { count: 1, expiresAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    const retryAfterSec = Math.ceil((record.expiresAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  record.count += 1;
  return { allowed: true, remaining: maxRequests - record.count };
}

/**
 * Clean & sanitize text strings to prevent XSS in DOM / Leaflet templates
 */
export function sanitizeString(val: unknown): string {
  if (typeof val !== "string") return "";
  return val
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}
