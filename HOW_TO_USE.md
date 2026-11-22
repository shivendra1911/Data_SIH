# 🌊 NeerNetra — How to Test & Use Our Project
> **Team:** Data_SIH | **Grand Finale Live Guide for Judges & Mentors**

Hello respected judges and mentors!

When you asked us for our live link, we wanted to direct you to our GitHub because **NeerNetra is a dual-system project**:
1. A **National Command Web Portal** (for disaster response teams, NDRF, and district collectors).
2. A **Mobile Citizen Edge App** (for citizens trapped in remote valleys with zero connectivity).

Since both talk to each other in real-time, here is the quick step-by-step guide on how you can test both the **Web** and the **App** live right now!

---

## 💻 Part 1: Testing the Web Platform (Instant Live Access)

You can open our live web platform directly in any browser (laptop, tablet, or phone) without installing anything:

👉 **Live Web Link:** **[https://data-sih.vercel.app](https://data-sih.vercel.app)**

### What you can see & test on the website:
1. **Interactive Tactical GIS Radar:**
   - Scroll down to the map or click **"SCROLL TO RADAR"**.
   - Notice the evacuation routes: these are **real curved topological road paths** (powered by OSRM street networks), not naive straight lines that cross through rivers or cliffs.
2. **USAR Building Collapse Sentinel (Section 3):**
   - Scroll to the **"Building Collapse Alert"** panel.
   - It starts at a clean baseline: *"All Structures Stable"* (Zero fake/mock data).
   - If you don't have the mobile phone in hand right now, you can click **"Simulate Live Phone Tremor"** directly on the web to see how a live phone shock wave is registered at exact GPS coordinates!
   - Click it again to see Phone #2 and Phone #3 arrive: watch the progress bar reach **3 / 3 (100% Quorum Reached)**, flash red, and unlock the **"Dispatch USAR Brigade"** button.
3. **Sub-Surface Landslide Consensus Panel:**
   - Shows real-time monitoring of mountain sectors (like *Wayanad* and *Joshimath*).
   - Tracks the live consensus ratio ($\ge \frac{1}{3}\text{rd}$ of active phones needed to confirm bedrock shear tremors).
4. **Instant Civil Defense Acoustic Siren:**
   - Click the **"Broadcast Siren"** button to see the sub-100ms emergency dispatch console that wakes up citizen devices without relying on Google Firebase.

---

## 📱 Part 2: Testing the Mobile Citizen App (Android APK)

If you have an Android phone, you can install our actual mobile app and see genuine sensor telemetry in action!

👉 **Direct APK Download Link:** **[Download NeerNetra.apk](https://github.com/shivendra1911/Data_SIH/raw/main/mobile/apk/NeerNetra.apk)**  
*(Located in the repository at `mobile/apk/NeerNetra.apk`)*

### Quick 2-Minute Installation Steps:
1. Tap the download link above on your Android phone.
2. Tap **"Download anyway"** when Chrome prompts you, then open the downloaded APK and tap **"Install"**.
3. Open **NeerNetra** on your phone.
4. **Grant permissions:**
   * **Location:** Required so rescue teams receive your exact GPS coordinates under rubble.
   * **Bluetooth / Nearby Devices:** Required for the offline peer-to-peer mesh when cell towers fail.

---

## ⚡ Part 3: The Live Connected Test (Phone $\rightarrow$ Web in Real-Time)

This is the exact demonstration that proves our backend and edge sensors work end-to-end:

```
[Citizen Phone in Danger Zone]  ---> (MEMS Shock Sensor) ---> [Supabase Realtime Cloud] ---> [Live Web Command Portal]
```

### Try this live test:
1. Keep the website open on your laptop screen: **`https://data-sih.vercel.app`**
2. Open the NeerNetra app on your phone.
3. Go to the **Status** screen and tap **"Simulate Collapse Shock"** (or gently drop the phone on a sofa or cushion).
4. **Look at your phone:**
   - The phone's accelerometer detects the fall, records the peak impact (e.g. `4.8g`), and starts an audible **60-second inverted safety countdown**.
   - If conscious, you can tap *"I AM SAFE"* to cancel it.
5. **Now look at your laptop screen:**
   - Within 2 seconds, your phone's real device ID (e.g. `dev_o2xy89k1...`) and exact GPS coordinates pop up on the **Building Collapse Panel** on `data-sih.vercel.app`!
   - You will see your phone's exact **Peak Shock ($g$)**, **Free-Fall duration ($ms$)**, and **Timestamp** itemized on the screen.
6. When 3 phones in that 100m area report impact, the web cluster confirms a **Structural Collapse** and enables instant rescue dispatch!

---

## 📂 Quick Summary of Repository Structure:

* **`web/`** — Next.js 14 Web Command Center code deployed at `https://data-sih.vercel.app`.
* **`mobile/`** — React Native & Android Native Java source code, background foreground services, and BLE GATT mesh.
* **`mobile/apk/`** — Direct downloadable Android build (`NeerNetra.apk`).
* **`backend/`** — FastAPI Python server, Random Forest GLOF machine learning model (`neernetra_model.pkl`), and 100m Haversine clustering algorithms.
* **`docs/`** — Project build plans, architecture diagrams, and mentor presentation guides.

---

*Thank you for evaluating NeerNetra! If you have any questions or want to see a live offline mesh demonstration, please let us know.*
