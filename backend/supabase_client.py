import os
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import httpx

def _load_env():
    env_file = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_file):
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip())

_load_env()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://nratutjgjodkbysxyxem.supabase.co").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

logger = logging.getLogger("neernetra.supabase")

def get_headers(use_service_key: bool = True) -> Dict[str, str]:
    key = SUPABASE_SERVICE_KEY if use_service_key and SUPABASE_SERVICE_KEY else SUPABASE_ANON_KEY
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

def get_supabase_sql_schema() -> str:
    return """-- NeerNetra Database Schema for Supabase
CREATE TABLE IF NOT EXISTS public.citizens (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    altitude DOUBLE PRECISION DEFAULT 1450.0,
    battery_level DOUBLE PRECISION DEFAULT 85.0,
    safety_status TEXT DEFAULT 'SAFE',
    location_name TEXT,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sos_events (
    id TEXT PRIMARY KEY,
    device_uuid TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    status TEXT NOT NULL,
    sos_type TEXT DEFAULT 'GENERAL',
    is_mesh_relayed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.location_history (
    id BIGSERIAL PRIMARY KEY,
    device_uuid TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    altitude DOUBLE PRECISION,
    accuracy DOUBLE PRECISION,
    battery_level DOUBLE PRECISION,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.disaster_directives (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    full_text TEXT NOT NULL,
    source TEXT NOT NULL,
    source_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    ref_code TEXT,
    timestamp TEXT NOT NULL,
    contact_hotline TEXT,
    action_advice TEXT,
    verified BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.sensor_telemetry (
    id BIGSERIAL PRIMARY KEY,
    zone_id TEXT NOT NULL,
    rainfall_mm DOUBLE PRECISION NOT NULL,
    seismic_mag DOUBLE PRECISION NOT NULL,
    soil_moisture DOUBLE PRECISION NOT NULL,
    river_discharge_m3s DOUBLE PRECISION NOT NULL,
    slope_angle_deg DOUBLE PRECISION NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

async def async_sync_citizen(citizen: Dict[str, Any]) -> bool:
    if not SUPABASE_SERVICE_KEY or not SUPABASE_URL:
        return False
    url = f"{SUPABASE_URL}/rest/v1/citizens"
    headers = get_headers()
    headers["Prefer"] = "resolution=merge-duplicates"
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.post(url, headers=headers, json=[citizen])
            return resp.status_code in (200, 201)
    except Exception as e:
        logger.debug(f"[Supabase] Sync citizen skipped: {e}")
        return False

async def async_sync_sos_event(sos_event: Dict[str, Any]) -> bool:
    if not SUPABASE_SERVICE_KEY or not SUPABASE_URL:
        return False
    url = f"{SUPABASE_URL}/rest/v1/sos_events"
    headers = get_headers()
    headers["Prefer"] = "resolution=merge-duplicates"
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.post(url, headers=headers, json=[sos_event])
            return resp.status_code in (200, 201)
    except Exception as e:
        logger.debug(f"[Supabase] Sync SOS skipped: {e}")
        return False

async def async_sync_location_history(crumb: Dict[str, Any]) -> bool:
    if not SUPABASE_SERVICE_KEY or not SUPABASE_URL:
        return False
    url = f"{SUPABASE_URL}/rest/v1/location_history"
    headers = get_headers()
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.post(url, headers=headers, json=[crumb])
            return resp.status_code in (200, 201)
    except Exception as e:
        logger.debug(f"[Supabase] Sync breadcrumb skipped: {e}")
        return False

def sync_citizen_sync(citizen: Dict[str, Any]):
    if not SUPABASE_SERVICE_KEY:
        return
    url = f"{SUPABASE_URL}/rest/v1/citizens"
    headers = get_headers()
    headers["Prefer"] = "resolution=merge-duplicates"
    try:
        with httpx.Client(timeout=3.0) as client:
            client.post(url, headers=headers, json=[citizen])
    except Exception:
        pass
