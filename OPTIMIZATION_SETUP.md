# AI Workflow Optimization Feature - Complete Setup Guide

## 📋 Overview

This guide walks you through setting up the AI-powered workflow optimization feature that integrates a Chrome extension with a backend Node.js server running two specialized AI agents.

## 🏗️ Architecture

```
┌─────────────────────┐
│  Chrome Extension   │
│  (Dashboard.js)     │
│  - Optimize Button  │
│  - Loading Modal    │
│  - Result Display   │
└──────────┬──────────┘
           │ HTTP POST
           ↓
┌─────────────────────────────────────┐
│  Backend Server (Node.js + Express) │
├─────────────────────────────────────┤
│  Agent 1: Intent Extraction         │
│  - Input: Raw browser events        │
│  - Output: Goal + semantic steps    │
│  - Model: Groq LLaMA-3 (FREE)       │
├─────────────────────────────────────┤
│  Agent 2: Workflow Optimization     │
│  - Input: Goal + steps              │
│  - Output: Optimized workflow       │
│  - Model: Gemini 1.5 Pro            │
└──────────┬──────────────────────────┘
           │ JSON Response
           ↓
┌─────────────────────┐
│  Chrome Extension   │
│  - Modal Display    │
│  - Show Results     │
│  - Display Insights │
└─────────────────────┘
```

## 🚀 Setup Steps

### Step 1: Get API Keys

#### 1a. Groq API Key (FREE - for Intent Extraction)
```
1. Go to https://console.groq.com
2. Sign up (free)
3. Navigate to API Keys section
4. Generate a new API key
5. Copy the key
```

**Why Groq?**
- Free tier with generous limits
- Fast response times
- Good quality intent extraction
- Perfect for text analysis

#### 1b. Google Gemini API Key (for Optimization)
```
1. Go to https://aistudio.google.com/apikey
2. Sign in with Google account
3. Click "Get API Key"
4. Create a new key
5. Copy the key (free tier available)
```

**Why Gemini 1.5 Pro?**
- Advanced reasoning capabilities
- Handles complex counterfactual analysis
- Structured output support
- Free tier available for testing

### Step 2: Setup Backend Server

```bash
# Navigate to backend directory
cd c:\Users\admin\OneDrive\Documents\autopattern\backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your API keys
# Windows: notepad .env
# macOS/Linux: nano .env
```

**Your .env file should look like:**
```
PORT=5000
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
GEMINI_API_KEY=AIzaSyD...xxxxxxxxxxxxxxxxxxxx
```

### Step 3: Verify Frontend Changes

Frontend changes are already implemented:
- ✅ `dashboard.html` - Added Optimize button styling and modals
- ✅ `dashboard.js` - Added optimization functions and API calls
- ✅ Extended workflow card with 4 buttons: View, Automate, Optimize, Delete

No additional changes needed!

### Step 4: Start Backend Server

```bash
cd backend

# Development mode (with auto-reload)
npm run dev

# OR Production mode
npm start
```

**Expected output:**
```
🚀 Autopattern backend running on http://localhost:5000
📡 API endpoint: POST /optimize-workflow
```

### Step 5: Load Chrome Extension

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Navigate to `extension/` folder
6. Select folder

Extension should now be loaded!

### Step 6: Test the Feature

1. Open extension dashboard
2. Record a workflow (use the popup to start/stop recording)
3. Click "Optimize" on a recorded workflow
4. Wait for AI analysis (5-15 seconds)
5. See optimization results in modal

## 🔄 How It Works

### When User Clicks "Optimize":

**Frontend (dashboard.js):**
```javascript
1. Show loading modal with spinner
2. Fetch raw events from stored workflow
3. POST to http://localhost:5000/optimize-workflow
4. Wait for response
5. Display results in beautiful modal
```

**Backend - Agent 1 (Intent Extraction):**
```
1. Receive raw browser events
2. Parse events into natural language description
3. Call Groq LLaMA-3 API
4. Extract: goal + semantic steps (5-15 steps)
5. Return structured JSON
```

**Backend - Agent 2 (Workflow Optimization):**
```
1. Receive goal + steps from Agent 1
2. Call Gemini 1.5 Pro API
3. Perform counterfactual reasoning:
   - "Can we skip step 3?"
   - "Can we combine steps 1 & 2?"
4. Suggest optimized workflow
5. Return: original steps, optimized steps, removed steps, explanation
```

**Frontend (Result Display):**
```
1. Show modal with:
   - Inferred goal
   - Original steps (numbered list)
   - Optimized steps (numbered list, highlighted)
   - Removed steps (marked as redundant)
   - Explanation of optimization
   - Confidence score (0-100%)
   - Step reduction percentage
```

## 📁 File Structure

```
autopattern/
├── extension/
│   └── src/
│       └── ui/
│           ├── dashboard.html       [MODIFIED] Added Optimize button CSS
│           └── dashboard.js         [MODIFIED] Added optimize functions
│
└── backend/                         [NEW]
    ├── server.js                    Main Express server
    ├── package.json                 Dependencies
    ├── .env.example                 Configuration template
    ├── README.md                    Backend documentation
    │
    ├── agents/
    │   ├── intentExtractor.js       Agent 1 - Groq LLaMA-3
    │   └── workflowOptimizer.js     Agent 2 - Gemini 1.5 Pro
    │
    └── routes/
        └── optimization.js          POST /optimize-workflow endpoint
```

## 🧪 Testing Checklist

- [ ] Backend server starts without errors
- [ ] API key environment variables loaded
- [ ] Health endpoint works: `curl http://localhost:5000/health`
- [ ] Extension loads in Chrome without errors
- [ ] Dashboard displays workflows
- [ ] Optimize button visible on workflow cards
- [ ] Click Optimize shows loading state
- [ ] Results modal displays after 5-15 seconds
- [ ] All fields visible: goal, steps, explanation, confidence
- [ ] Close button removes modal

## 🔧 Troubleshooting

### Backend Won't Start
```
Error: Port 5000 in use
Solution: Change PORT in .env to 5001, restart
```

### GROQ_API_KEY not configured
```
Error: GROQ_API_KEY not configured in environment
Solution: Add GROQ_API_KEY to .env file
```

### CORS Error in Extension
```
Backend already configured with CORS middleware
Solution: Verify backend is running on localhost:5000
```

### API Response Timeout
```
Analysis taking >15 seconds
Solution: Check network connection, API quotas
```

### Invalid JSON from Agent
```
Solution: Fallback logic handles malformed responses
Result will show with lower confidence score
```

## 📊 Example Workflow

**Original Workflow:**
1. Open email app
2. Wait for page to load
3. Click inbox
4. Wait for emails
5. Scroll down
6. Click first email
7. Read content
8. Click archive button

**AI Analysis:**
- **Goal:** "Archive first email from inbox"
- **Removed Steps:** "Wait for page to load", "Wait for emails", "Scroll down" (all internal/automatic)
- **Optimized Workflow:**
  1. Open email app
  2. Click inbox
  3. Click first email
  4. Read content
  5. Click archive button

**Step Reduction:** 37.5% fewer steps

## 🔐 Security Notes

- ✅ API keys in .env (never committed to git)
- ✅ CORS configured for localhost only
- ✅ Rate limiting recommended for production
- ✅ Input validation on all endpoints
- ✅ 50MB request size limit

## 🚀 Production Deployment

For production use:

1. **Environment Variables**
   - Store keys in secure vault (AWS Secrets, Vercel, etc.)
   - Never commit .env file

2. **Rate Limiting**
   - Add `express-rate-limit` middleware
   - Limit: 10 requests per minute per IP

3. **Monitoring**
   - Log all optimization requests
   - Track API usage and costs
   - Monitor error rates

4. **Scaling**
   - Run multiple backend instances
   - Use load balancer
   - Consider async job queue for long analyses

## 📝 API Response Examples

### Success Response
```json
{
  "workflowId": 1,
  "workflowName": "Login Flow",
  "goal": "Authenticate user",
  "originalSteps": ["Enter email", "Click next", "Enter password", "Click sign in"],
  "optimizedSteps": ["Enter email and password", "Click sign in"],
  "removedSteps": ["Click next"],
  "explanation": "The 'Click next' step is automation overhead",
  "confidence": 82,
  "optimization": {
    "stepReduction": "50.0"
  },
  "timestamp": "2024-01-02T10:30:00.000Z"
}
```

### Error Response
```json
{
  "error": "Workflow optimization failed",
  "message": "GROQ_API_KEY not configured"
}
```

## 💡 Best Practices

1. **Record Clear Workflows**
   - Workflows with 5-20 steps work best
   - Too few: Hard to optimize
   - Too many: May exceed API limits

2. **API Key Security**
   - Rotate keys monthly
   - Use different keys for dev/prod
   - Monitor API usage

3. **Testing**
   - Test with various workflow types
   - Monitor performance
   - Collect feedback from users

## 📞 Support

For issues:
1. Check backend README: `backend/README.md`
2. Review server logs (console output)
3. Verify API keys are valid
4. Check network connection
5. Review frontend console for errors

## 🎉 You're Done!

Your AI workflow optimization feature is now ready to use. The system will:
- Extract workflow intent using free Groq API
- Optimize workflows using advanced Gemini reasoning
- Provide beautiful results with confidence scores
- All without hardcoded rules!

Happy optimizing! 🚀
