# 🔧 Fix: Backend 500 Error

## The Problem
You got **"API ERROR: 500 INTERNAL SERVER ERROR"** which means the backend server isn't running or there's an error in the code.

## The Solution

### Step 1: Start the Backend Server

**Option A - Easy (Recommended)**
```
1. Go to: c:\Users\admin\OneDrive\Documents\autopattern\backend\
2. Double-click: start-backend.bat
3. Wait for server to start (you'll see a new command window)
```

**Option B - Manual**
```
1. Open Command Prompt (cmd.exe)
2. Run: cd c:\Users\admin\OneDrive\Documents\autopattern\backend
3. Run: npm run dev
4. You should see: "🚀 Autopattern backend running on http://localhost:5000"
```

### Step 2: Verify Server is Running

Open your browser and go to:
```
http://localhost:5000/health
```

You should see:
```json
{
  "status": "ok",
  "message": "Backend server is running"
}
```

### Step 3: Test the APIs

In a new command prompt, run:
```
cd c:\Users\admin\OneDrive\Documents\autopattern\backend
node test-apis.js
```

This will verify your Groq and Gemini API keys work correctly.

### Step 4: Try Optimize Again

1. Go back to the extension dashboard
2. Record a workflow (use the popup)
3. Click "Optimize" button
4. Wait 5-15 seconds for results

## If You Still Get Errors

### Check Backend Console
Look at the command window running `npm run dev` - there should be logs showing:
- What's happening
- Any error messages
- API responses

### Common Issues

| Issue | Fix |
|-------|-----|
| **"Port 5000 in use"** | Change `PORT` in .env to 5001 |
| **"Cannot find module"** | Run: `npm install` |
| **"API_KEY not configured"** | Check .env has your actual keys |
| **"Groq API error"** | Run: `node test-apis.js` to debug |

## The Fixes I Made

1. **Fixed Groq API endpoint**: Changed from `openai/v1` to `v1`
2. **Fixed Gemini model**: Changed to `gemini-pro`
3. **Added better error logging**: Now shows API error details
4. **Created test-apis.js**: To verify API keys work
5. **Created start-backend.bat**: Easy way to start server

## Key Files

| File | Purpose |
|------|---------|
| `start-backend.bat` | ✨ Easy start button |
| `test-apis.js` | ✨ Test API keys |
| `agents/intentExtractor.js` | [FIXED] Corrected Groq endpoint |
| `agents/workflowOptimizer.js` | [FIXED] Corrected Gemini model |
| `routes/optimization.js` | [IMPROVED] Better error details |

## Next Steps

1. ✅ Run `start-backend.bat`
2. ✅ Keep it running (minimized is fine)
3. ✅ Go back to extension dashboard
4. ✅ Click "Optimize" on a workflow
5. ✅ See your AI results! 🎉

---

**Need help?** Check [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
