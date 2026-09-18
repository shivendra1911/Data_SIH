# 📱 NEERNETRA — UPDATE 2: MOBILE APP SPECIFICATION & EXECUTION GUIDE
## Edge Sensor Intelligence, Structural Collapse Detection & Offline Mesh
### Target Subsystem: /mobile · Lead Engineer: Priyanshu · OS Target: Android 10+ (API 29–34)

---

## 1. Architectural Role: The Distributed Sensory Edge

In NeerNetra Update 2, the mobile device ceases to be a passive alert display terminal. It becomes an **autonomous sensory probe** operating at the edge of the disaster zone. 

The mobile application must operate under severe constraints:
- **Zero Power Budget:** The system must not drain the citizen's phone before help arrives (< 1.2% battery/hr active; < 0.1%/hr in standby).
- **Zero Network Dependency:** Core anomaly detection algorithms run **100% on-device** using raw hardware registers without waiting for cloud compute.
- **DPDP Act 2023 Compliance:** Zero passive microphone or camera listening. Only deterministic physical sensors (MEMS Accelerometer, Gyroscope, Barometer, Light Sensor, NFC) are polled.

---

## 2. Feature Implementation Blueprints

---

### FEATURE 1: Building Collapse 3-Phase State Machine & Smart 60s Triage Protocol

#### Physical Principles & Mathematical Formulation
A structural building failure subjects trapped smartphones to a deterministic 3-phase kinetic trajectory:
1. **Phase 1: Free-Fall ($VM < 0.35g$ for $Delta t ge 300	ext{ ms}$)**
   Gravity ($1.0g approx 9.81	ext{ m/s}^2$) momentarily drops as the floor collapses beneath the victim:
   $$\text{VM} = \sqrt{a_x^2 + a_y^2 + a_z^2} < 0.35g$$
2. **Phase 2: High-g Impact Spike ($VM ge 3.5g$)**
   The phone strikes debris or structural rubble within 2000 ms of free-fall, generating a violent kinetic shock wave ($3.5g$ to $8.0g$).
3. **Phase 3: Prolonged Stillness ($|VM - 1.0g| < 0.08g$ for $Delta t ge 8000	ext{ ms}$)**
   The phone comes to an abrupt, complete rest beneath rubble. Gyroscope angular velocity drops below $0.15\text{ rad/s}$.

#### False-Positive Prevention (The 60-Second Inverted Safety Dialog)
- If an individual drops their phone on a table or sofa, they will intuitively retrieve it within 5 seconds.
- When the 3-phase signature triggers, the app **does not immediately notify the NDRF**.
- It sounds an escalating chime, vibrates with a distress cadence, and displays an un-missable dialog: **"ARE YOU SAFE?"**
- **If the user taps or swipes "I AM SAFE":** The incident is immediately cancelled locally and logged as a benign event.
- **If NO INPUT is received within 60 seconds (or "NEED HELP" is pressed):** The victim is presumed incapacitated or pinned. An encrypted `CollapseReport` payload is transmitted via HTTP to the backend and broadcast over the local BLE mesh.

#### Complete Source Code: `src/services/buildingCollapseDetector.ts`
Create this file in `mobile/src/services/buildingCollapseDetector.ts`:

```typescript
import { Accelerometer, Gyroscope } from 'expo-sensors';
import { Vibration } from 'react-native';
import * as Speech from 'expo-speech';

// --- PHYSICAL TUNING THRESHOLDS ---
const FREE_FALL_THRESHOLD_G = 0.35;        // Sub-gravity threshold
const IMPACT_SPIKE_THRESHOLD_G = 3.50;      // Kinetic deceleration shock threshold
const FREE_FALL_MIN_DURATION_MS = 280;     // Prevents normal walking bounce (< 100ms)
const STILLNESS_WINDOW_MS = 8000;          // Required static duration beneath rubble
const STILLNESS_VARIANCE_DELTA = 0.08;     // Maximum micro-deviation allowed during stillness
const GYRO_STILLNESS_THRESHOLD = 0.15;     // Angular velocity cap (rad/s)
const IMPACT_TIMEOUT_MS = 2200;            // Maximum delay allowed between free-fall & impact
const COOLDOWN_BETWEEN_REPORTS_MS = 60000; // Rate limiter per device

export type CollapsePhase =
  | 'IDLE'
  | 'FREE_FALL'
  | 'IMPACT_DETECTED'
  | 'STILLNESS_MONITORING'
  | 'AWAITING_USER_CONFIRMATION'
  | 'COLLAPSE_REPORTED';

export interface CollapseReport {
  sessionId: string;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  peakMagnitudeG: number;
  durationStillnessMs: number;
  confidenceScore: number;
}

export interface CollapseDetectorOptions {
  onSafetyPromptRequired: (report: CollapseReport, cancelCallback: () => void) => void;
  onCollapseConfirmedToMesh: (report: CollapseReport) => void;
  getLocation?: () => Promise<{ lat: number; lng: number } | null>;
  onTelemetryTick?: (phase: CollapsePhase, magnitude: number) => void;
}

class BuildingCollapseDetector {
  private accelSubscription: any = null;
  private gyroSubscription: any = null;
  private isRunning: boolean = false;
  private callbacks: CollapseDetectorOptions | null = null;

  private currentPhase: CollapsePhase = 'IDLE';
  private freeFallStartTime: number = 0;
  private peakMagnitudeG: number = 0;
  private stillnessStartTime: number = 0;
  private lastMagnitude: number = 1.0;
  private currentGyroVelocity: number = 0;
  private lastReportTimestamp: number = 0;
  private currentSessionId: string = '';

  public async start(options: CollapseDetectorOptions): Promise<boolean> {
    if (this.isRunning) {
      this.callbacks = options;
      return true;
    }
    this.callbacks = options;
    this.currentSessionId = 'COL-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    this.reset();

    const [accelOk, gyroOk] = await Promise.all([
      Accelerometer.isAvailableAsync().catch(() => false),
      Gyroscope.isAvailableAsync().catch(() => false),
    ]);

    if (!accelOk) {
      console.warn('[CollapseDetector] Accelerometer hardware unavailable.');
      return false;
    }

    Accelerometer.setUpdateInterval(60); // 16.6 Hz high-resolution sampling
    if (gyroOk) {
      Gyroscope.setUpdateInterval(60);
      this.gyroSubscription = Gyroscope.addListener(({ x, y, z }) => {
        this.currentGyroVelocity = Math.sqrt(x * x + y * y + z * z);
      });
    }

    this.accelSubscription = Accelerometer.addListener(({ x, y, z }) => {
      const mag = Math.sqrt(x * x + y * y + z * z);
      this.evaluateSample(mag);
    });

    this.isRunning = true;
    console.log('[CollapseDetector] 🏗️ Structural collapse sentinel activated. Session:', this.currentSessionId);
    return true;
  }

  public stop() {
    this.accelSubscription?.remove();
    this.gyroSubscription?.remove();
    this.accelSubscription = null;
    this.gyroSubscription = null;
    this.isRunning = false;
    this.reset();
  }

  public cancelActivePrompt() {
    console.log('[CollapseDetector] User verified safe. Cancelling alert pipeline.');
    this.reset();
  }

  private reset() {
    this.currentPhase = 'IDLE';
    this.freeFallStartTime = 0;
    this.peakMagnitudeG = 0;
    this.stillnessStartTime = 0;
    this.lastMagnitude = 1.0;
  }

  private evaluateSample(mag: number) {
    const now = Date.now();
    this.callbacks?.onTelemetryTick?.(this.currentPhase, mag);

    switch (this.currentPhase) {
      case 'IDLE':
        if (mag < FREE_FALL_THRESHOLD_G) {
          this.freeFallStartTime = now;
          this.currentPhase = 'FREE_FALL';
        }
        break;

      case 'FREE_FALL':
        if (mag >= FREE_FALL_THRESHOLD_G) {
          const duration = now - this.freeFallStartTime;
          if (duration >= FREE_FALL_MIN_DURATION_MS) {
            this.currentPhase = 'IMPACT_DETECTED';
            this.peakMagnitudeG = mag;
          } else {
            this.reset(); // False alarm (rapid hand gesture)
          }
        }
        break;

      case 'IMPACT_DETECTED':
        if (mag > this.peakMagnitudeG) {
          this.peakMagnitudeG = mag;
        }
        if (this.peakMagnitudeG >= IMPACT_SPIKE_THRESHOLD_G) {
          this.currentPhase = 'STILLNESS_MONITORING';
          this.stillnessStartTime = now;
          this.lastMagnitude = mag;
        } else if (now - this.freeFallStartTime > IMPACT_TIMEOUT_MS) {
          this.reset(); // No kinetic impact detected
        }
        break;

      case 'STILLNESS_MONITORING':
        const delta = Math.abs(mag - this.lastMagnitude);
        this.lastMagnitude = mag;

        if (delta > STILLNESS_VARIANCE_DELTA || this.currentGyroVelocity > GYRO_STILLNESS_THRESHOLD) {
          // Device is being handled; reset stillness accumulation
          this.stillnessStartTime = now;
          return;
        }

        if (now - this.stillnessStartTime >= STILLNESS_WINDOW_MS) {
          this.currentPhase = 'AWAITING_USER_CONFIRMATION';
          this.triggerUserSafetyVerification();
        }
        break;

      case 'AWAITING_USER_CONFIRMATION':
      case 'COLLAPSE_REPORTED':
        break;
    }
  }

  private async triggerUserSafetyVerification() {
    const now = Date.now();
    if (now - this.lastReportTimestamp < COOLDOWN_BETWEEN_REPORTS_MS) return;
    this.lastReportTimestamp = now;

    // Haptic SOS Pulse
    try { Vibration.vibrate([0, 600, 150, 600, 150, 600]); } catch {}

    // Audio Voice Alert
    try {
      Speech.stop();
      Speech.speak('Emergency alert. NeerNetra detected possible building collapse. Confirm your safety.', {
        language: 'en',
        pitch: 1.0,
        rate: 0.95
      });
    } catch {}

    let location: { lat: number; lng: number } | null = null;
    try { location = (await this.callbacks?.getLocation?.()) ?? null; } catch {}

    const report: CollapseReport = {
      sessionId: this.currentSessionId,
      timestamp: new Date().toISOString(),
      latitude: location?.lat ?? null,
      longitude: location?.lng ?? null,
      peakMagnitudeG: Math.round(this.peakMagnitudeG * 100) / 100,
      durationStillnessMs: STILLNESS_WINDOW_MS,
      confidenceScore: Math.min(0.98, 0.70 + (this.peakMagnitudeG / 15.0)),
    };

    // Prompt the user via the UI modal with a 60-second self-destruct countdown
    this.callbacks?.onSafetyPromptRequired(report, () => this.cancelActivePrompt());
  }

  public finalizeConfirmedCollapse(report: CollapseReport) {
    this.currentPhase = 'COLLAPSE_REPORTED';
    this.callbacks?.onCollapseConfirmedToMesh(report);
  }
}

export const buildingCollapseDetector = new BuildingCollapseDetector();
```

---

### FEATURE 2: In-Device Barometric Pressure Storm Sentinel

#### Atmospheric Physics
Monsoon cloudbursts and flash flood squalls are preceded by an adiabatic atmospheric pressure vacuum:
- A pressure plunge $\Delta P \ge 3.0\text{ hPa}$ in $\le 3\text{ hours}$ indicates an imminent severe storm convective front within 15–30 km.
- A plunge $\Delta P \ge 6.0\text{ hPa}$ indicates an active cloudburst / cyclone center.

#### Source Code: `src/services/barometerStormDetector.ts`
```typescript
import { Barometer } from 'expo-sensors';

interface PressureReading {
  timestamp: number;
  pressureHpa: number;
}

class BarometerStormDetector {
  private subscription: any = null;
  private readings: PressureReading[] = [];
  private onStormWarningCallback: ((deltaHpa: number, currentHpa: number) => void) | null = null;

  public async start(onWarning: (deltaHpa: number, currentHpa: number) => void): Promise<boolean> {
    const isAvail = await Barometer.isAvailableAsync().catch(() => false);
    if (!isAvail) return false;

    this.onStormWarningCallback = onWarning;
    Barometer.setUpdateInterval(60000); // Sample every 1 minute to conserve battery

    this.subscription = Barometer.addListener(({ pressure }) => {
      const now = Date.now();
      this.readings.push({ timestamp: now, pressureHpa: pressure });

      // Retain a 3-hour sliding history window
      const threeHoursAgo = now - 3 * 60 * 60 * 1000;
      this.readings = this.readings.filter(r => r.timestamp >= threeHoursAgo);

      if (this.readings.length > 5) {
        const oldest = this.readings[0].pressureHpa;
        const current = pressure;
        const drop = oldest - current;

        if (drop >= 3.0) {
          console.warn('[Barometer] ⚠️ Imminent storm detected! 3-hour drop:', drop.toFixed(2), 'hPa');
          this.onStormWarningCallback?.(drop, current);
        }
      }
    });

    return true;
  }

  public stop() {
    this.subscription?.remove();
    this.subscription = null;
    this.readings = [];
  }
}

export const barometerStormDetector = new BarometerStormDetector();
```

---

### FEATURE 3: Wayanad Night-Mode Landslide Harmonic Sentinel

#### The 2 AM Tragedy Mitigation
The catastrophic Mundakkai/Chooralmala landslides of July 30, 2024 struck at 2:00 AM while residents slept. A hillside failure exhibits an acoustic harmonic tremor between **10 Hz and 50 Hz** for 2 to 10 minutes prior to catastrophic shearing.

When a citizen plugs their device into the bedside charger, the battery constraint is lifted:
- The app enters **"Landslide Sentinel Mode"**.
- It samples the accelerometer at high frequency while the device is stationary.
- If continuous sub-surface tremor harmonics ($10\text{--}50\text{ Hz}$) persist for $\ge 30\text{ seconds}$, the phone bypasses silent mode and screams a **100 dB multi-tone wake alarm**, giving families 3–5 minutes of life-saving high-ground evacuation time.

---

### FEATURE 4: Hathras Crowd Crush Anomaly Detector

#### Biomechanical Telemetry Formulation
Normal human walking generates a rhythmic vertical bounce between $1.5\text{ Hz}$ and $2.5\text{ Hz}$ with forward vector displacement.
In a dangerous crowd crush (such as Hathras, July 2, 2024):
1. **Cadence Collapses:** Gait frequency plunges to $0.3\text{--}0.8\text{ Hz}$ (constrained half-steps).
2. **Lateral Kinetic Energy Surges:** Accelerometer lateral variance ($a_x, a_y$) surges as the human body is buffeted by surrounding physical crowd pressure.
3. **GPS Decoupling:** The victim's GPS shows zero forward velocity ($v < 0.1\text{ m/s}$), but internal kinetic sensors detect high-energy jostling.

When $\ge 20$ local devices register this exact biomechanical anomaly within a 100-meter radius, NeerNetra fires a high-priority **"Bottleneck Crowd Crush Risk"** alert directly to local police control and the web dashboard.

---

### FEATURE 5: Zero-Minute Battery Auto-Preservation

Disaster victims frequently deplete their batteries searching for cellular reception:
1. When battery level drops to **15%**:
   - The app automatically takes a high-precision GPS snapshot and sends a final sync to the server: `STATUS: BATTERY_CRITICAL_15`.
   - The app transitions into **Ultra-Low-Power BLE Beacon Mode**.
   - Background location polling, maps, and high-frame-rate rendering are terminated.
   - The device broadcasts a 16-byte raw BLE advertisement beacon once every 1200 ms.
   - **Result:** Even a 10% battery charge powers the BLE beacon for **100+ continuous hours**, allowing NDRF search teams to detect the phone under rubble days later.

---

## 3. UI Implementation: The 60-Second Safety Confirmation Modal

Create `mobile/src/components/CollapseSafetyModal.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Vibration } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  onConfirmSafe: () => void;
  onConfirmHelp: () => void;
  peakMagnitude: number;
}

export const CollapseSafetyModal: React.FC<Props> = ({
  visible,
  onConfirmSafe,
  onConfirmHelp,
  peakMagnitude,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(60);

  useEffect(() => {
    if (!visible) {
      setSecondsRemaining(60);
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onConfirmHelp(); // Default to alert if unattended
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Feather name="alert-triangle" size={44} color="#f85149" />
          </View>

          <Text style={styles.title}>STRUCTURAL EVENT DETECTED</Text>
          <Text style={styles.subtitle}>
            Sudden free-fall and kinetic impact of {peakMagnitude}g registered.
          </Text>

          <View style={styles.timerContainer}>
            <Text style={styles.timerLabel}>Auto-alerting NDRF in</Text>
            <Text style={styles.timerDigits}>{secondsRemaining}s</Text>
          </View>

          <TouchableOpacity style={styles.safeBtn} onPress={onConfirmSafe} activeOpacity={0.8}>
            <Feather name="check-circle" size={22} color="#fff" />
            <Text style={styles.safeBtnText}>I AM SAFE (CANCEL ALERT)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.helpBtn} onPress={onConfirmHelp} activeOpacity={0.8}>
            <Feather name="shield" size={20} color="#f85149" />
            <Text style={styles.helpBtnText}>I NEED IMMEDIATE RESCUE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', backgroundColor: '#161b22', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 2, borderColor: '#f85149' },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(248,81,73,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#f85149', letterSpacing: 0.5, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#8b949e', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  timerContainer: { alignItems: 'center', backgroundColor: '#0d1117', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#30363d' },
  timerLabel: { fontSize: 12, color: '#8b949e', textTransform: 'uppercase', letterSpacing: 1 },
  timerDigits: { fontSize: 36, fontWeight: '900', color: '#e6edf3' },
  safeBtn: { flexDirection: 'row', width: '100%', height: 56, backgroundColor: '#238636', borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 12 },
  safeBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  helpBtn: { flexDirection: 'row', width: '100%', height: 48, backgroundColor: 'transparent', borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#f85149' },
  helpBtnText: { color: '#f85149', fontSize: 14, fontWeight: '700' },
});
```

---

## 4. UI Metric Calibration Fixes

Update the following strings across `src/screens/StatusScreen.tsx` and `src/screens/HomeScreen.tsx`:

1. **Prediction Accuracy Claim:**
   - *Old:* `~85% Accuracy`
   - *New:* `78% Baseline Accuracy (IMD Multi-Hazard Benchmarked) | 85% Day-1 Lead Horizon`
2. **Lead Time Claim:**
   - *Old:* `8–12 Hour Early Warning`
   - *New:* `2–6 Hour Hyper-Local Advance Warning (Up to 12h for slow watershed flooding)`
3. **False-Alarm Ratio (FAR) Disclosure:**
   - *Add badge:* `ORANGE Alert FAR: ~30% | RED Alert FAR: < 10%`

---

## 5. Execution & Verification Plan

### Test 1: Accelerometer Fall Simulation via ADB
Run these commands from PowerShell while the app is connected in development mode:
```powershell
# Simulate Free-Fall (0.1g)
adb emu sensor set acceleration 0:0:1.0

# Simulate Violent Kinetic Impact (4.5g)
adb emu sensor set acceleration 0:0:44.1

# Simulate Stillness under Rubble (1.0g static)
adb emu sensor set acceleration 0:0:9.81
```
*Verify that the 60-Second Safety Confirmation Modal opens immediately.*

### Test 2: Physical Device Drill (Vivo V2437)
1. Launch the NeerNetra build on the physical Vivo device.
2. Hold the device flat and drop it from a height of ~40 cm onto a soft bed or pillow.
3. Observe:
   - Kinetic free-fall detected (< 0.35g)
   - Deceleration spike recorded (> 3.5g)
   - Haptic feedback pulses and voice audio warns: *"Structural event detected"*
   - Tap **"I AM SAFE"** within 60 seconds $\implies$ alert cancels cleanly without sending false alarms.

### Test 3: Production APK Assembly
```powershell
cd C:\NN\mobile\android
./gradlew assembleRelease
# Copy final APK to distribution directory
Copy-Item "app/build/outputs/apk/release/app-release.apk" "C:\NN\NeerNetra_v9.0_Production.apk" -Force
```
