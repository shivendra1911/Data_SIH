# 🏆 NEERNETRA - 48-HOUR HACKATHON MASTER PLAYBOOK
**Team Leader:** Priyanshu
**Problem Statement:** SIH26192 (Flash Flood Prediction System)

---

## ⏰ MINUTE ZERO: THE GITHUB SETUP

Priyanshu (Team Lead) does this as soon as the hackathon starts:
1. Clone the empty collaborative GitHub repo to your laptop.
2. Create 4 empty folders: `mobile/`, `web/`, `backend/`, `ai_model/`.
3. Drop the `AI_SYSTEM_CONTEXT.md` file into the root of the repo.
4. Run:
   ```bash
   git add .
   git commit -m "Initial Hackathon Setup & AI Blueprint"
   git push origin main
   ```
5. Tell the rest of the team: *"Clone the repo and cd into your assigned folder."*

---

## 🔀 THE GIT COLLABORATION RULES (No Merge Conflicts)

Because this is a 48-hour sprint, we are using the **Monorepo Strategy**. 
* **RULE 1:** You ONLY work inside your assigned folder. (Shivendra ONLY touches `/web`, Priyanshu ONLY touches `/mobile`).
* **RULE 2:** Because you are in separate folders, you will NEVER have merge conflicts.
* **RULE 3:** Every 2 hours, run these exact 3 commands to sync everyone's work:
  ```bash
  git pull origin main
  git add .
  git commit -m "your name: what you just built"
  git push origin main
  ```

---

## 🤖 HOW TO USE AI TO BUILD FROM SCRATCH TOMORROW

When the timer starts, each teammate opens their specific folder in their AI IDE (Antigravity/Cursor) and pastes their exact prompt below. **The AI will read `AI_SYSTEM_CONTEXT.md` and generate the code perfectly.**

### 🖥️ TEAMMATE 1: SHIVENDRA (Next.js Web Dashboard)
**Folder:** `/web`
**Action:** Run `npx create-next-app@latest .`
**AI Prompt to Paste:** 
> "Read the `AI_SYSTEM_CONTEXT.md` file in the root folder. I am in the `web` folder. Build the Next.js 14 Dashboard. I need a Leaflet map (using react-leaflet) that connects to our Supabase database to show live Red SOS dots. Also, create a panel that fetches the current flood probability from our backend at `http://localhost:8000/api/prediction/current`. Write the code."

### 📱 TEAMMATE 2: PRIYANSHU (React Native Mobile App)
**Folder:** `/mobile`
**Action:** Run `npx create-expo-app .`
**AI Prompt to Paste:** 
> "Read the `AI_SYSTEM_CONTEXT.md` file in the root folder. I am in the `mobile` folder. Build the Expo React Native app. I need a Home Screen that displays the RED/ORANGE AI alert. I also need a massive SOS button that sends a POST request with the user's lat/lng to `http://localhost:8000/api/sos/trigger` in the exact JSON format specified in the blueprint. Write the code."

### ⚙️ TEAMMATE 3: BACKEND API
**Folder:** `/backend`
**Action:** Run `pip install fastapi uvicorn pandas scikit-learn joblib supabase`
**AI Prompt to Paste:** 
> "Read the `AI_SYSTEM_CONTEXT.md` file in the root folder. I am in the `backend` folder. Build the FastAPI `main.py` server exactly as defined in the API Contracts section. It needs to load the `.pkl` model, expose the `/api/prediction` and `/api/sos` routes, and connect to Supabase to save SOS events. Write the code."

### 🧠 TEAMMATE 4: AI MODEL & DATA
**Folder:** `/ai_model`
**Action:** Run `pip install pandas scikit-learn`
**AI Prompt to Paste:** 
> "Read the `AI_SYSTEM_CONTEXT.md` file in the root folder. I am in the `ai_model` folder. 
> 1. Write `generate_data.py` to create a 10,000-row Hybrid dataset (using simulated NASA POWER historical rain data + injected synthetic Seismic GLOF and Cloudburst events). 
> 2. Write `train_model.py` to train a Random Forest model on this data and save it as `neernetra_model.pkl` in the `../backend/` folder. Write the code and I will run it."

---

## 🎤 HOUR 40: THE PITCH PREPARATION
Stop coding. Use `SOLUTION_PART1.md` and `SOLUTION_PART2.md` to create your PowerPoint. 
**Key points to hit:**
1. Traditional systems only track rain. We use Seismic data to detect Glacial Lake Outbursts (GLOFs) like the deadly Nepal 2026 disaster.
2. Warning is useless without delivery. Our Bluetooth mesh ensures offline SOS.
3. We don't just dump 5000 SOS pins on a map. We use PostGIS K-Means Clustering to group rescues for NDRF triage.
