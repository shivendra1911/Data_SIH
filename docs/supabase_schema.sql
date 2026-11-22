-- ============================================================================
-- NEERNETRA SUPABASE PRODUCTION SCHEMA + REALTIME REPLICATION
-- Paste and Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/nratutjgjodkbysxyxem/sql
-- ============================================================================

-- 1. Enable PostGIS Extension (if available)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Citizens Live Location & Status Table
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

-- 3. SOS Emergency Beacons Table
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

-- 4. Location History Breadcrumbs Table
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

-- 5. Disaster Directives & Broadcasts Table
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

-- ============================================================================
-- ENABLE SUPABASE REALTIME REPLICATION (Instant <100ms WebSocket Broadcasts)
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.citizens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_events;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR PUBLIC MOBILE & WEB ACCESS
-- ============================================================================
ALTER TABLE public.citizens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disaster_directives ENABLE ROW LEVEL SECURITY;

-- Allow public read & write on citizens
DROP POLICY IF EXISTS "Allow public read citizens" ON public.citizens;
CREATE POLICY "Allow public read citizens" ON public.citizens FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert citizens" ON public.citizens;
CREATE POLICY "Allow public insert citizens" ON public.citizens FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update citizens" ON public.citizens;
CREATE POLICY "Allow public update citizens" ON public.citizens FOR UPDATE USING (true);

-- Allow public read & write on sos_events
DROP POLICY IF EXISTS "Allow public read sos_events" ON public.sos_events;
CREATE POLICY "Allow public read sos_events" ON public.sos_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert sos_events" ON public.sos_events;
CREATE POLICY "Allow public insert sos_events" ON public.sos_events FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update sos_events" ON public.sos_events;
CREATE POLICY "Allow public update sos_events" ON public.sos_events FOR UPDATE USING (true);

-- Allow public read & write on location_history
DROP POLICY IF EXISTS "Allow public read location_history" ON public.location_history;
CREATE POLICY "Allow public read location_history" ON public.location_history FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert location_history" ON public.location_history;
CREATE POLICY "Allow public insert location_history" ON public.location_history FOR INSERT WITH CHECK (true);

-- Allow public read on disaster_directives
DROP POLICY IF EXISTS "Allow public read disaster_directives" ON public.disaster_directives;
CREATE POLICY "Allow public read disaster_directives" ON public.disaster_directives FOR SELECT USING (true);
