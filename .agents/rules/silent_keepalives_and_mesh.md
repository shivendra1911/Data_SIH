---
trigger: always_on
description: Silent OS Background Keepalives, Hardware Test Isolation, and Multi-Hop Range Scaling
---

# Silent OS Background Keepalives & Hardware Test Isolation

1. **Silent Background Maintenance**:
   - Any background radio keepalive, heartbeat, or Doze-prevention alarm (`AlarmManager.setExactAndAllowWhileIdle()`) MUST execute with CPU partial wake lock only.
   - NEVER trigger vibrations (`Vibrator.vibrate`), ringtones, notifications with sound, or UI activity popups during periodic maintenance ticks.
   - Maintain the exact behavioral model of WhatsApp and Google Play Services: silent background radio pulses, reserving full-screen UI and ringtones strictly for genuine incoming user-to-user calls or confirmed 1/3rd quorum disaster sirens.

2. **Hardware Test Safety**:
   - Automated test scripts that trigger physical device incoming call activities MUST immediately dismiss (`ACTION_DISMISS_INCOMING_CALL`) within <= 100ms to prevent user disturbance during interactive development.

3. **Multi-Hop Range & Map Synchronization**:
   - Maintain dynamic kilometer distance scaling across mobile and web radars (200m/hop baseline).
   - Ensure `/api/citizens/nearby` and `/api/citizen/locations` are dual-aliased to prevent empty map queries.
