# 💻 NEERNETRA — UPDATE 2: WEB PORTAL SPECIFICATION & EXECUTION GUIDE
## Incident Command Center, USAR Collapse Panels & Multi-Hazard Telemetry
### Target Subsystem: /web · Lead Engineer: Shivendra · Framework: Next.js 14 (App Router) + Tailwind CSS

---

## 1. Architectural Role: The NDRF Incident Command Dashboard

While the mobile application serves citizens under offline and austere edge conditions, the **NeerNetra Web Portal** is the centralized operational nerve center for:
- National Disaster Response Force (NDRF) Battalion Commanders
- State Disaster Management Authorities (SDMA - Uttarakhand / Kerala / Assam)
- District Emergency Operation Centers (DEOC - Chamoli, Rudraprayag, Wayanad)

In Update 2, the Web Portal evolves beyond displaying flood hazard maps. It becomes a **Multi-Hazard Tactical Response Matrix**, consuming distributed sensor events from thousands of citizen devices and synthesizing them into instantaneous rescue missions.

---

## 2. Component Implementation Blueprints

---

### COMPONENT 1: USAR Building Collapse Incident Panel

#### Purpose & Functional Logic
When the backend detects 3+ mobile devices reporting collapse kinetic signatures within a 100-meter radius within 15 seconds, it opens an active incident cluster.
This component renders the live incident with:
- **Incident Severity Grading:**
  - `1 Phone:` 🟡 *Sensor Anomaly (Single Device Dropped)*
  - `2 Phones:` 🟠 *Suspected Structural Event (Evaluating)*
  - `3+ Phones:` 🔴 *CONFIRMED STRUCTURAL COLLAPSE (USAR LEVEL 1)*
- **Trapped Headcount Tally:** Estimated victims based on non-responding devices.
- **Elapsed Rescue Timer:** Counts up from moment of collapse confirmation ($T+00:00$).
- **One-Click Tactical Dispatch:** Bypasses manual phone trees to route NDRF brigades to exact GPS coordinates.

#### Complete Source Code: `src/components/Dashboard/BuildingCollapsePanel.tsx`
Create this file in `web/src/components/Dashboard/BuildingCollapsePanel.tsx`:

```tsx
"use client";

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Users, Clock, Navigation, AlertTriangle, CheckCircle2, Siren } from 'lucide-react';

export interface CollapseIncident {
  clusterId: string;
  locationName: string;
  latitude: number;
  longitude: number;
  deviceCount: number;
  unconfirmedCount: number;
  peakMagnitudeG: number;
  timestamp: string;
  status: 'EVALUATING' | 'CONFIRMED_COLLAPSE' | 'RESCUE_DISPATCHED' | 'RESOLVED';
}

export const BuildingCollapsePanel: React.FC = () => {
  const [incidents, setIncidents] = useState<CollapseIncident[]>([
    {
      clusterId: 'CLUS-DEL-782',
      locationName: 'Sector 4-B, Near Alaknanda Bridge (Chamoli)',
      latitude: 30.4167,
      longitude: 79.3167,
      deviceCount: 4,
      unconfirmedCount: 3,
      peakMagnitudeG: 4.8,
      timestamp: new Date(Date.now() - 140000).toISOString(),
      status: 'CONFIRMED_COLLAPSE'
    }
  ]);

  const [dispatchedMap, setDispatchedMap] = useState<Record<string, boolean>>({});

  const handleDispatchUSAR = (clusterId: string) => {
    setDispatchedMap(prev => ({ ...prev, [clusterId]: true }));
    // API Call to Backend
    fetch('/api/rescue/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clusterId,
        teamType: 'USAR_CANINE_HEAVY_EXTRACTION',
        priority: 'CRITICAL_URGENT'
      })
    }).catch(console.error);
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 shadow-lg mb-6">
      <div className="flex items-center justify-between pb-4 border-b border-[#30363d] mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              USAR Building Collapse Sentinels
              <span className="px-2 py-0.5 text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30 rounded-full">
                LIVE TELEMETRY
              </span>
            </h2>
            <p className="text-xs text-gray-400">
              Distributed smartphone accelerometer cluster detection (100m spatiotemporal radius)
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-gray-400 font-mono">ACTIVE CLUSTERS</span>
          <p className="text-xl font-black text-red-500 font-mono">{incidents.length}</p>
        </div>
      </div>

      <div className="space-y-4">
        {incidents.map((inc) => {
          const isDispatched = dispatchedMap[inc.clusterId] || inc.status === 'RESCUE_DISPATCHED';
          const elapsedMinutes = Math.floor((Date.now() - new Date(inc.timestamp).getTime()) / 60000);

          return (
            <div
              key={inc.clusterId}
              className="bg-[#0d1117] border border-red-500/30 rounded-lg p-4 transition-all hover:border-red-500/60"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 text-xs font-bold font-mono bg-red-600 text-white rounded">
                      {inc.clusterId}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {inc.locationName}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono">
                    GPS: {inc.latitude.toFixed(4)}°N, {inc.longitude.toFixed(4)}°E • Kinetic Shock: {inc.peakMagnitudeG}g
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#161b22] border border-[#30363d] rounded text-xs text-gray-300 font-mono">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>T+{elapsedMinutes}m ago</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400 font-bold font-mono">
                    <Users className="w-3.5 h-3.5" />
                    <span>{inc.unconfirmedCount} TRAPPED EST.</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#21262d]">
                <div className="text-xs text-gray-400">
                  Total Phones Reporting: <span className="text-gray-200 font-semibold">{inc.deviceCount}</span>
                  {' '}• 60s Triage Window: <span className="text-red-400 font-semibold">EXPIRED (ZERO RESPONSE)</span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`https://www.google.com/maps?q=${inc.latitude},${inc.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-200 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Tactical Map
                  </a>

                  {isDispatched ? (
                    <div className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded flex items-center gap-1.5 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      BRIGADE DISPATCHED
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDispatchUSAR(inc.clusterId)}
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded flex items-center gap-1.5 shadow-lg shadow-red-900/30 transition-all cursor-pointer"
                    >
                      <Siren className="w-3.5 h-3.5" />
                      DISPATCH USAR BRIGADE
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

---

### COMPONENT 2: Hathras Crowd Crush Density Sentinel

#### Purpose & Functional Logic
Monitors localized pedestrian biomechanics. When a crowd bottleneck reaches dangerous compression levels (cadence dropping below $0.8\text{ Hz}$ with high lateral jostle energy), this component:
1. Displays an ambient crowd pressure gauge (NORMAL, ELEVATED, DANGEROUS CRUSH RISK).
2. Calculates egress bottleneck chokepoints on the tactical map.
3. Provides a one-click button: **"BROADCAST ALTERNATIVE ESCAPE ROUTE"** which triggers high-priority push notifications and BLE beacons directing victims away from congested gates.

#### Source Code: `src/components/Dashboard/CrowdCrushHeatmap.tsx`
Create in `web/src/components/Dashboard/CrowdCrushHeatmap.tsx`:

```tsx
"use client";

import React, { useState } from 'react';
import { Footprints, AlertCircle, Radio, ArrowRight } from 'lucide-react';

export const CrowdCrushHeatmap: React.FC = () => {
  const [crowdDensity, setCrowdDensity] = useState({
    zone: 'Hathras Pilgrimage Ground Sector 2-West',
    activeDevices: 64,
    averageGaitCadenceHz: 0.42, // Severely restricted (normal = 1.8 Hz)
    lateralSwayVarianceG: 0.74,  // High crowd buffer jostle
    status: 'CRITICAL_CRUSH_IMMINENT'
  });

  const [routeBroadcasted, setRouteBroadcasted] = useState(false);

  const handleBroadcastReroute = () => {
    setRouteBroadcasted(true);
    fetch('/api/alert/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'EMERGENCY EVACUATION REROUTE',
        message: 'Main Gate 2 is severely congested. Proceed immediately to East Perimeter Gate 4.',
        priority: 'CRITICAL_URGENT',
        targetGeoFence: { lat: 27.5968, lng: 78.0520, radiusM: 300 }
      })
    }).catch(console.error);
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 shadow-lg mb-6">
      <div className="flex items-center justify-between pb-3 border-b border-[#30363d] mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
            <Footprints className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Crowd Crush & Biomechanical Density Monitor</h3>
            <p className="text-xs text-gray-400">P2P Gait cadence & lateral kinetic telemetry</p>
          </div>
        </div>
        <span className="px-2.5 py-1 text-xs font-bold font-mono bg-red-500/20 text-red-400 border border-red-500/30 rounded-full">
          DANGER: BOTTLENECK DETECTED
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-[#0d1117] p-3 rounded-lg border border-[#21262d]">
          <span className="text-xs text-gray-400 font-mono">DEVICES TRACKED</span>
          <p className="text-2xl font-bold text-white font-mono mt-1">{crowdDensity.activeDevices}</p>
          <span className="text-[10px] text-gray-500">In 200m radius</span>
        </div>

        <div className="bg-[#0d1117] p-3 rounded-lg border border-[#21262d]">
          <span className="text-xs text-gray-400 font-mono">GAIT CADENCE (WALK SPEED)</span>
          <p className="text-2xl font-bold text-red-400 font-mono mt-1">{crowdDensity.averageGaitCadenceHz} Hz</p>
          <span className="text-[10px] text-red-500 font-semibold">Restricted (Normal: 1.8 Hz)</span>
        </div>

        <div className="bg-[#0d1117] p-3 rounded-lg border border-[#21262d]">
          <span className="text-xs text-gray-400 font-mono">LATERAL COMPRESSION SWAY</span>
          <p className="text-2xl font-bold text-amber-400 font-mono mt-1">{crowdDensity.lateralSwayVarianceG}g</p>
          <span className="text-[10px] text-amber-500 font-semibold">High Physical Jostle</span>
        </div>
      </div>

      <div className="flex items-center justify-between bg-red-900/20 border border-red-800/40 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-xs text-red-300">
            <strong>Action Recommended:</strong> Disperse Gate 2 bottleneck before crowd collapse occurs.
          </span>
        </div>

        <button
          onClick={handleBroadcastReroute}
          disabled={routeBroadcasted}
          className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition-all ${
            routeBroadcasted
              ? 'bg-emerald-600 text-white'
              : 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          {routeBroadcasted ? 'REROUTE BROADCAST SENT' : 'BROADCAST ALTERNATIVE ROUTE'}
        </button>
      </div>
    </div>
  );
};
```

---

### COMPONENT 3: Structural & Mine Ingress/Egress Live Manifest

#### Purpose & Functional Logic
Directly addresses the tragic mine entrapments in Meghalaya (Feb 2026) and Assam (Jan 2025). Workers tapping passive ₹15 NFC tags generate an instantaneous digital manifest:
- **Total Entered Underground:** Live counter.
- **Checked Out Safe:** Workers currently on the surface.
- **Accounted Under Debris/Shaft:** Exactly who is trapped, including their specific work shaft ID.

#### Source Code: `src/components/Dashboard/MineManifestTracker.tsx`
Create in `web/src/components/Dashboard/MineManifestTracker.tsx`:

```tsx
"use client";

import React from 'react';
import { HardHat, ShieldCheck, UserX, Clock } from 'lucide-react';

export const MineManifestTracker: React.FC = () => {
  const manifest = {
    facilityName: 'Dhanbad Sub-Surface Incline Shaft #4',
    totalEntered: 28,
    exitedSafe: 22,
    unaccountedTrapped: 6,
    lastUpdate: '2 mins ago',
    trappedWorkers: [
      { id: 'WRK-09', name: 'Rameshwar Mahato', shaft: 'North Drift Sub-Level 2', enteredAt: '06:30 AM' },
      { id: 'WRK-14', name: 'Birendra Hansda', shaft: 'North Drift Sub-Level 2', enteredAt: '06:45 AM' },
      { id: 'WRK-22', name: 'Sanjay Murmu', shaft: 'Ventilation Crosscut B', enteredAt: '07:10 AM' },
    ]
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 shadow-lg mb-6">
      <div className="flex items-center justify-between pb-3 border-b border-[#30363d] mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
            <HardHat className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Passive NFC Worker Ingress / Egress Manifest</h3>
            <p className="text-xs text-gray-400">{manifest.facilityName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-mono">
          <Clock className="w-3.5 h-3.5" />
          <span>Synced {manifest.lastUpdate}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-[#0d1117] p-3 rounded-lg border border-[#21262d]">
          <span className="text-xs text-gray-400 font-mono">ENTERED SHIFT</span>
          <p className="text-2xl font-bold text-white font-mono mt-1">{manifest.totalEntered}</p>
        </div>
        <div className="bg-[#0d1117] p-3 rounded-lg border border-[#21262d]">
          <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> EXITED SAFE
          </span>
          <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">{manifest.exitedSafe}</p>
        </div>
        <div className="bg-[#0d1117] p-3 rounded-lg border border-red-500/30 bg-red-500/5">
          <span className="text-xs text-red-400 font-mono flex items-center gap-1">
            <UserX className="w-3.5 h-3.5" /> TRAPPED / UNACCOUNTED
          </span>
          <p className="text-2xl font-bold text-red-400 font-mono mt-1">{manifest.unaccountedTrapped}</p>
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
          Last Known Underground Work Locations:
        </span>
        {manifest.trappedWorkers.map(w => (
          <div key={w.id} className="flex items-center justify-between p-2.5 bg-[#0d1117] rounded border border-[#21262d] text-xs">
            <div>
              <span className="font-bold text-white">{w.name}</span>
              <span className="text-gray-400 font-mono ml-2">({w.id})</span>
            </div>
            <div className="text-gray-300 font-mono">
              {w.shaft} <span className="text-gray-500">• In: {w.enteredAt}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 3. Integration into Dashboard Home (`src/app/page.tsx`)

Import and stack these three new components in `web/src/app/page.tsx`:

```tsx
import { BuildingCollapsePanel } from '@/components/Dashboard/BuildingCollapsePanel';
import { CrowdCrushHeatmap } from '@/components/Dashboard/CrowdCrushHeatmap';
import { MineManifestTracker } from '@/components/Dashboard/MineManifestTracker';

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#0d1117] text-[#e6edf3] p-6 max-w-7xl mx-auto">
      {/* 1. USAR Structural Collapse Sentinels (Top Critical Priority) */}
      <BuildingCollapsePanel />

      {/* 2. Crowd Crush & Mine Safety Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CrowdCrushHeatmap />
        <MineManifestTracker />
      </div>

      {/* Existing Flood Prediction Panels, Hydrographs, SOS Feeds */}
      {/* ... */}
    </main>
  );
}
```

---

## 4. Execution & Verification Plan

### Test 1: Start Next.js Development Server
```powershell
cd C:\Data_SIH\web
npm install
npm run dev
```
*Open `http://localhost:3000` in Chrome and verify all panels render with crisp dark-mode styling.*

### Test 2: Verify Responsive Layout
- Check layout on **1920x1080** (command center projection screens).
- Check layout on **1366x768** (standard field laptops used by district magistrates).
- Verify that table columns collapse cleanly without horizontal overflow.
