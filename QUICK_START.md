# ⚡ Quick Start Guide - AI Workflow Optimization

## 5-Minute Setup

### 1️⃣ Get API Keys (2 minutes)

**Groq (FREE):**
- Visit: https://console.groq.com
- Sign up, get API key, copy it

**Gemini:**
- Visit: https://aistudio.google.com/apikey
- Get API key, copy it

### 2️⃣ Setup Backend (3 minutes)

```bash
cd backend

# Install
npm install

# Configure
cp .env.example .env
# Edit .env - paste your API keys

# Run
npm run dev
```

✅ Server running on `http://localhost:5000`

### 3️⃣ Load Extension

1. Chrome → `chrome://extensions/`
2. Developer mode ON
3. Load unpacked → select `extension/` folder
4. Done!

## 🎬 First Test

1. Dashboard → Record a workflow (popup)
2. Optimization button appears on card
3. Click "Optimize"
4. Wait 5-15 seconds
5. See AI results!

## 📂 What Was Added

| File | Purpose |
|------|---------|
| `backend/server.js` | Express server |
| `backend/agents/intentExtractor.js` | Agent 1 - Groq |
| `backend/agents/workflowOptimizer.js` | Agent 2 - Gemini |
| `backend/routes/optimization.js` | `/optimize-workflow` endpoint |
| `backend/package.json` | Dependencies |
| `backend/.env.example` | Configuration template |
| `extension/src/ui/dashboard.js` | Updated with optimize function |
| `extension/src/ui/dashboard.html` | Added Optimize button & modals |

## 🔗 How It Works

```
Raw Events → Agent 1 (Groq) → Goal + Steps
                                    ↓
                        Agent 2 (Gemini) → Optimized Workflow
                                    ↓
                            Beautiful Modal UI
```

## 🚨 Common Issues

| Problem | Fix |
|---------|-----|
| `GROQ_API_KEY not found` | Add to .env |
| `Port 5000 in use` | Change PORT in .env |
| `CORS error` | Restart backend |
| `API timeout` | Check internet connection |

## 📖 Full Docs

- Backend: `backend/README.md`
- Setup: `OPTIMIZATION_SETUP.md`

## ✨ That's It!

Your AI workflow optimizer is ready. Go optimize some workflows! 🚀
