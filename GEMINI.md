# Antigravity Autonomous Execution & User Permissions

## Core Directives
1. **Full Autonomous Authorization**: The user (thx-manas / Manas Singh) has explicitly granted full permission to run commands, create/edit files, install required dependencies, execute tests, and push/pull to Git repositories without prompting for permission.
2. **Proactive Execution**: Never pause or ask "Should I proceed?" or "Do you want me to run this?". Execute the necessary actions directly, verify the results, and report the outcome clearly.
3. **Repository Scope**: In `Data_SIH`, the user is strictly responsible for `ai_model/` and exported model artifacts for `backend/`. Keep all code changes strictly within this boundary unless explicitly instructed otherwise.
4. **Silent OS Background Keepalives**: Any background radio keepalive or Doze-prevention alarm (`AlarmManager.setExactAndAllowWhileIdle()`) MUST execute with CPU partial wake lock only. NEVER trigger vibrations (`Vibrator.vibrate`), ringtones, sounds, or UI activity popups during periodic maintenance ticks. Maintain the exact behavioral model of WhatsApp and Google Play Services: silent background radio refresh, reserving full-screen UI and ringtones strictly for genuine incoming user-to-user calls or confirmed 1/3rd quorum disaster sirens.
5. **Hardware Test Isolation**: Automated test scripts that trigger physical device incoming call activities MUST immediately dismiss (`ACTION_DISMISS_INCOMING_CALL`) within <= 100ms to prevent user disturbance during interactive development.
6. **Multi-Hop Range & Map Sync**: Maintain dynamic kilometer distance scaling across mobile and web radars (200m/hop baseline). Ensure `/api/citizens/nearby` and `/api/citizen/locations` are dual-aliased to prevent empty map queries.

