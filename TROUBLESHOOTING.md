# 🔧 Troubleshooting & FAQ

## Backend Issues

### ❌ "Cannot find module 'express'"

**Cause**: Dependencies not installed

**Fix**:
```bash
cd backend
npm install
```

### ❌ "GROQ_API_KEY not configured in environment"

**Cause**: Missing or invalid API key

**Fix**:
```bash
1. Get key from https://console.groq.com
2. Edit .env file
3. Add: GROQ_API_KEY=gsk_...
4. Restart server
```

### ❌ "GEMINI_API_KEY not configured in environment"

**Cause**: Missing or invalid API key

**Fix**:
```bash
1. Get key from https://aistudio.google.com/apikey
2. Edit .env file
3. Add: GEMINI_API_KEY=AIzaSy...
4. Restart server
```

### ❌ "Port 5000 already in use"

**Cause**: Another process using port 5000

**Solutions**:

Option 1 - Change port:
```bash
# Edit .env
PORT=5001

# Restart server
npm run dev
```

Option 2 - Kill process using port:
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :5000
kill -9 <PID>
```

### ❌ "Connection refused on localhost:5000"

**Cause**: Backend server not running

**Fix**:
```bash
cd backend
npm run dev
```

Check for errors in console output.

### ❌ Server starts but crashes immediately

**Cause**: Syntax error or missing dependency

**Fix**:
1. Check console for error message
2. Run: `npm install`
3. Verify .env file syntax
4. Check for typos in file paths

## Frontend (Extension) Issues

### ❌ "Optimize button not appearing"

**Cause**: Extension not reloaded after code changes

**Fix**:
1. Go to `chrome://extensions/`
2. Click reload on autopattern extension
3. Refresh dashboard page

### ❌ "Click Optimize but nothing happens"

**Cause**: Backend not running or not responding

**Fix**:
1. Check backend is running: `npm run dev`
2. Check server is on `http://localhost:5000`
3. Open browser DevTools (F12)
4. Check Console tab for errors
5. Check Network tab for failed requests

### ❌ "Loading spinner spins forever"

**Cause**: 
- Backend not responding
- API timeouts
- Network issues

**Fix**:
1. Check backend console for errors
2. Check API key validity
3. Check internet connection
4. Look for rate limiting from APIs

### ❌ "CORS error in extension"

**Cause**: Backend CORS not configured or backend offline

**Error in Console**: `Access to XMLHttpRequest blocked by CORS`

**Fix**:
```bash
# 1. Ensure backend is running
npm run dev

# 2. Verify CORS middleware in server.js
# (Should be: app.use(cors());)

# 3. Check localhost:5000 is accessible
# Open http://localhost:5000/health in browser
```

## API Response Issues

### ❌ "Invalid response format from Agent 1"

**Cause**: Agent response not valid JSON

**Fix**:
1. Check API key validity
2. Check internet connection
3. Check Groq API status
4. Look for rate limiting

System has fallback logic, so partial results should display.

### ❌ "Modal displays but no steps shown"

**Cause**: Agents returned empty arrays

**Fix**:
1. Try with different workflow (more events)
2. Check backend console for warnings
3. Verify API responses in Network tab

### ❌ "Confidence score shows 0%"

**Cause**: Agents couldn't optimize workflow

**Likely**: Workflow already optimal or too simple

**Normal**: Fallback logic returns `confidence: 35` for safety

## Performance Issues

### ⏱️ "Optimization takes >30 seconds"

**Cause**: 
- API rate limiting
- Network latency
- Too many events (>1000)

**Fix**:
1. Wait longer or restart
2. Check internet connection
3. Record shorter workflows
4. Consider API upgrade

### ⏱️ "Dashboard is slow"

**Cause**: Too many workflows stored (100+)

**Fix**:
1. Delete old workflows from dashboard
2. Use browser DevTools to check performance
3. Consider database optimization

## Network/Connectivity

### ❌ "Backend can't reach Groq API"

**Cause**: 
- API key invalid
- Network blocked
- Rate limited

**Check**:
```bash
# Test Groq API connectivity
curl -X POST https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"mixtral-8x7b-32768","messages":[{"role":"user","content":"hi"}]}'
```

### ❌ "Backend can't reach Gemini API"

**Cause**: 
- API key invalid
- Network blocked
- Rate limited

**Check**:
```javascript
// Test in Node
import { GoogleGenerativeAI } from '@google/generative-ai';

const client = new GoogleGenerativeAI('YOUR_KEY');
const model = client.getGenerativeModel({ model: 'gemini-1.5-pro' });
console.log('✓ API is accessible');
```

## Configuration Issues

### ❌ ".env file not found"

**Cause**: File not created

**Fix**:
```bash
cd backend
cp .env.example .env
```

### ❌ ".env file has wrong format"

**Cause**: Syntax error in .env

**Correct format**:
```
KEY=value
PORT=5000
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIzaSy...
```

**Common mistakes**:
- Extra spaces: `KEY = value` ❌
- Quotes: `KEY="value"` ❌ (usually)
- Comments: Must start with `#`

## Logging & Debugging

### Enable Verbose Logging

**Backend** - Already enabled, shows:
```
🔍 Optimizing workflow...
📍 Agent 1: Extracting intent...
✅ Agent 1 Result:
🎯 Agent 2: Optimizing workflow...
✅ Agent 2 Result:
✨ Optimization complete!
```

### Check Network Requests

**Extension**:
1. Open DevTools: `F12` or `Ctrl+Shift+I`
2. Go to Network tab
3. Click Optimize
4. Look for POST request to `/optimize-workflow`
5. Check request/response

### Backend Logs

**Server console** shows:
- Requests received
- Agent outputs
- Errors and warnings
- Response times

## API Rate Limits

### Groq Rate Limits (Free Tier)
- Requests per minute: Generous
- Requests per day: ~10,000
- No rate limit errors in testing

### Gemini Rate Limits (Free Tier)
- Requests per minute: 60
- Requests per day: 1,500

**If rate limited**:
1. Wait before next request
2. Consider paid tier
3. Implement request queuing

## Common Workflow Errors

### ❌ "Cannot optimize empty workflow"

**Cause**: No events recorded

**Fix**: Record a workflow first in extension

### ❌ "Cannot find workflow with ID 1"

**Cause**: Workflow doesn't exist in IndexedDB

**Fix**: 
1. Reload dashboard
2. Record a new workflow
3. Try with different workflow ID

## Browser Compatibility

### ✅ Supported Browsers
- Chrome 90+
- Edge 90+
- Brave

### ⚠️ Not Supported
- Firefox (requires different manifest)
- Safari (requires different manifest)
- Internet Explorer (outdated)

## Data Privacy

### What Gets Sent to API?

**To Groq:**
- Browser event objects (anonymized)
- No user data, passwords, or sensitive info
- Event types and element information

**To Gemini:**
- Extracted steps (text only)
- No raw events
- No browser history
- No user data

### Data Retention
- Google: 30 days default
- Groq: Check their privacy policy
- Local storage: Your machine only

## Updating/Maintenance

### Update Backend Dependencies
```bash
cd backend
npm update
```

### Update to Latest Node
```bash
# Check version
node --version

# Update via nvm (recommended)
nvm install node
nvm use node
```

### Update API Keys
```bash
# Edit .env
vim .env

# Update your API keys if changed
# Restart server
npm run dev
```

## FAQ

### Q: Is my data safe?

**A**: Yes. 
- Events sent to APIs but not stored
- No personal data captured
- APIs have privacy policies
- Local workflows stored in IndexedDB

### Q: What if API goes down?

**A**: 
- Fallback logic provides partial results
- Displayed with lower confidence (35%)
- User still sees something useful

### Q: Can I use different LLM APIs?

**A**: Yes, but requires code changes:
- Replace Groq with OpenAI, Anthropic, etc.
- Update prompts for different model format
- Modify `agents/intentExtractor.js`

### Q: Will optimization always work?

**A**: No. Some workflows:
- Already optimized
- Have required steps that can't be skipped
- Are too simple to optimize further

Confidence score will be low in these cases.

### Q: Can I run this in production?

**A**: Mostly yes, with considerations:
- Add authentication
- Implement rate limiting
- Use reverse proxy
- Monitor API costs
- Set up logging/monitoring

### Q: How much will this cost?

**A**: 
- Groq: FREE (generous tier)
- Gemini: ~$0.000005 per request
- For 100 optimizations: ~$0.50/month

### Q: Can I batch optimize workflows?

**A**: Currently no, but could be added:
- Modify endpoint to accept array
- Add request queuing
- Spread out API calls

## Getting Help

### Check These First
1. QUICK_START.md
2. OPTIMIZATION_SETUP.md
3. backend/README.md
4. This file

### Enable Debug Mode
```javascript
// In dashboard.js, add logging
console.log('🐛 Optimization request:', { workflowId, events });
```

### Common Commands

```bash
# Validate setup
node backend/validate.js

# Check API connectivity
curl http://localhost:5000/health

# Restart backend
cd backend && npm run dev

# Check Node version
node --version

# Check npm packages
npm list
```

## Still Need Help?

1. **Check console errors** - Most info is there
2. **Verify API keys** - Common issue
3. **Ensure backend running** - Most common
4. **Check network connection** - API connectivity
5. **Review .env file** - Configuration errors

Good luck! 🚀
