import sqlite3
import os
import math
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any
import supabase_client

DB_PATH = os.path.join(os.path.dirname(__file__), "neernetra.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Citizens Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS citizens (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        altitude REAL DEFAULT 1450.0,
        battery_level REAL DEFAULT 85.0,
        safety_status TEXT DEFAULT 'SAFE',
        location_name TEXT,
        last_synced_at TEXT NOT NULL
    );
    """)

    # 2. SOS Events Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sos_events (
        id TEXT PRIMARY KEY,
        device_uuid TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        status TEXT NOT NULL,
        sos_type TEXT DEFAULT 'GENERAL',
        is_mesh_relayed INTEGER DEFAULT 0,
        notes TEXT,
        received_at TEXT NOT NULL
    );
    """)

    # 3. Location History Breadcrumbs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS location_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_uuid TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        altitude REAL,
        accuracy REAL,
        battery_level REAL,
        recorded_at TEXT NOT NULL
    );
    """)

    # 4. Disaster Directives Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS disaster_directives (
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
        verified INTEGER DEFAULT 1
    );
    """)

    conn.commit()
    conn.close()
    print("[Database] Schema initialized successfully.")

def calculate_haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> int:
    R = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return int(R * c)

def upsert_citizen(citizen_data: Dict[str, Any]):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO citizens (id, name, phone, lat, lng, altitude, battery_level, safety_status, location_name, last_synced_at)
    VALUES (:id, :name, :phone, :lat, :lng, :altitude, :battery_level, :safety_status, :location_name, :last_synced_at)
    ON CONFLICT(id) DO UPDATE SET
        lat=excluded.lat,
        lng=excluded.lng,
        altitude=COALESCE(excluded.altitude, citizens.altitude),
        battery_level=COALESCE(excluded.battery_level, citizens.battery_level),
        safety_status=COALESCE(excluded.safety_status, citizens.safety_status),
        location_name=COALESCE(excluded.location_name, citizens.location_name),
        last_synced_at=excluded.last_synced_at;
    """, citizen_data)
    conn.commit()
    conn.close()
    try:
        supabase_client.sync_citizen_sync(citizen_data)
    except Exception:
        pass

def update_citizen_safety(device_uuid: str, status: str):
    conn = get_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
    UPDATE citizens 
    SET safety_status = ?, last_synced_at = ?
    WHERE id = ?;
    """, (status.upper(), now_iso, device_uuid))
    if cursor.rowcount == 0:
        cursor.execute("""
        INSERT INTO citizens (id, name, phone, lat, lng, safety_status, last_synced_at)
        VALUES (?, 'Active Citizen', '+91 98765 00000', 0.0, 0.0, ?, ?);
        """, (device_uuid, status.upper(), now_iso))
    conn.commit()
    conn.close()

def record_sos_event(event: Dict[str, Any]):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO sos_events (id, device_uuid, lat, lng, status, sos_type, is_mesh_relayed, notes, received_at)
    VALUES (:id, :device_uuid, :lat, :lng, :status, :sos_type, :is_mesh_relayed, :notes, :received_at);
    """, event)
    conn.commit()
    conn.close()

def record_location_breadcrumb(crumb: Dict[str, Any]):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO location_history (device_uuid, lat, lng, altitude, accuracy, battery_level, recorded_at)
    VALUES (:device_uuid, :lat, :lng, :altitude, :accuracy, :battery_level, :recorded_at);
    """, crumb)
    conn.commit()
    conn.close()

def get_nearby_citizens_from_db(lat: float, lng: float, radius_meters: int = 50000) -> List[Dict[str, Any]]:
    """
    Returns only genuine synced devices and citizen beacons stored in SQLite neernetra.db.
    No mock or simulated citizen records.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM citizens;")
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        c_lat, c_lng = r["lat"], r["lng"]
        if c_lat == 0.0 and c_lng == 0.0:
            continue
        dist = calculate_haversine_meters(lat, lng, c_lat, c_lng)
        if dist <= radius_meters:
            results.append({
                "id": r["id"],
                "name": r["name"],
                "phone": r["phone"],
                "lat": c_lat,
                "lng": c_lng,
                "distance_meters": dist,
                "battery_level": r["battery_level"],
                "safety_status": r["safety_status"],
                "status": "SOS" if r["safety_status"] == "DANGER" else r["safety_status"],
                "location_name": r["location_name"] or f"Sector ({c_lat:.4f}°N, {c_lng:.4f}°E)",
                "last_synced_at": r["last_synced_at"]
            })
    results.sort(key=lambda x: x["distance_meters"])
    return results

def get_all_sos_events_from_db(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sos_events ORDER BY received_at DESC LIMIT ?;", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

init_db()
