# 🚀 AI-Powered Workflow Optimization Backend

## Overview

This backend implements a two-agent AI system that analyzes browser workflows and suggests optimizations using advanced reasoning.

### Architecture

```
User Workflow (Raw Browser Events)
    ↓
[Agent 1: Intent Extraction] ← Groq LLaMA-3 (FREE)
    ↓ (Extracts: goal + semantic steps)
[Agent 2: Workflow Optimization] ← Gemini 1.5 Pro
    ↓ (Returns: optimized steps + explanation)
User Interface (Modal with Results)
```

## Features

✅ **Real AI Reasoning** - Not rule-based heuristics
✅ **Two-Agent Pipeline** - Specialized agents for each task
✅ **Counterfactual Analysis** - Why can steps be removed?
✅ **Confidence Scoring** - How certain is the optimization?
✅ **Zero Local Heuristics** - All analysis happens in backend
✅ **Graceful Fallbacks** - Works even if API calls fail

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Get API Keys

#### Groq API Key (FREE - Intent Extraction)
1. Go to https://console.groq.com
2. Sign up or login
3. Create an API key
4. Free tier includes generous rate limits for development

#### Gemini API Key (Workflow Optimization)
1. Go to https://aistudio.google.com/apikey
2. Click "Get API Key"
3. Create a new key
4. Free tier available for testing (limited requests/minute)

### 3. Configure Environment

```bash
# Copy example to .env
cp .env.example .env

# Edit .env with your API keys
# GROQ_API_KEY=your_key_here
# GEMINI_API_KEY=your_key_here
```

### 4. Run Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs on `http://localhost:5000`

## API Documentation

### POST /optimize-workflow

Analyzes and optimizes a workflow.

**Request:**
```json
{
  "workflowId": 1,
  "workflowName": "Login to Gmail",
  "events": [
    {
      "type": "click",
      "target": {
        "tagName": "BUTTON",
        "innerText": "Sign in"
      }
    },
    {
      "type": "input",
      "target": {
        "tagName": "INPUT",
        "value": "user@gmail.com"
      }
    }
    // ... more events
  ]
}
```

**Response:**
```json
{
  "workflowId": 1,
  "workflowName": "Login to Gmail",
  "goal": "Successfully authenticate user account",
  "originalSteps": [
    "Navigate to login page",
    "Enter email address",
    "Click next button",
    "Enter password",
    "Click sign in button"
  ],
  "optimizedSteps": [
    "Navigate to login page",
    "Enter credentials",
    "Click sign in button"
  ],
  "removedSteps": [
    "Click next button"
  ],
  "explanation": "The 'Click next button' step is redundant because...",
  "confidence": 85,
  "optimization": {
    "stepReduction": "40.0"
  },
  "timestamp": "2024-01-02T10:30:00.000Z"
}
```

## Agent Details

### Agent 1: Intent Extraction

**Model:** Groq LLaMA-3 (Free)
**Cost:** Free tier
**Purpose:** Convert raw browser events into semantic intent

**Input:** 
- Array of browser events (click, input, submit, etc.)

**Output:**
```json
{
  "goal": "end goal of workflow",
  "steps": ["semantic step 1", "semantic step 2"]
}
```

**How it works:**
1. Groups related events into logical actions
2. Identifies the intent of each action
3. Determines the overall workflow goal
4. Returns 5-15 semantic steps (not individual events)

### Agent 2: Workflow Optimization

**Model:** Gemini 1.5 Pro
**Cost:** Free tier available (rate limited)
**Purpose:** Suggest shorter workflows using counterfactual reasoning

**Input:**
- Goal (from Agent 1)
- Steps (from Agent 1)

**Output:**
```json
{
  "originalSteps": [],
  "optimizedSteps": [],
  "removedSteps": [],
  "explanation": "why optimization works",
  "confidence": 0-100
}
```

**Reasoning Process:**
- Analyzes each step's necessity for goal achievement
- Questions: "Can we skip this step?"
- Provides counterfactual explanation
- Rates confidence in optimization

## Error Handling

### Graceful Fallbacks

If API calls fail:
- Agent 1 falls back to basic event classification
- Agent 2 suggests minor optimizations heuristically
- Frontend receives valid response with lower confidence
- User sees partial results rather than errors

### Common Issues

| Issue | Solution |
|-------|----------|
| `GROQ_API_KEY not configured` | Add API key to .env |
| `GEMINI_API_KEY not configured` | Add API key to .env |
| `Connection refused on port 5000` | Check if server is running |
| `CORS error` | Server is running with CORS enabled |

## Performance

- **Intent Extraction:** 2-5 seconds
- **Optimization:** 3-8 seconds
- **Total:** ~5-15 seconds per workflow
- **Request size limit:** 50MB (events)

## Testing

### Manual Testing with cURL

```bash
# Test health endpoint
curl http://localhost:5000/health

# Test optimization (replace with real events)
curl -X POST http://localhost:5000/optimize-workflow \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": 1,
    "workflowName": "Test Workflow",
    "events": [
      {"type": "click", "target": {"tagName": "BUTTON"}},
      {"type": "input", "target": {"tagName": "INPUT"}}
    ]
  }'
```

## Development Notes

### Frontend Integration

The dashboard.js already handles:
- Calling `/optimize-workflow` endpoint
- Loading state UI
- Error handling
- Result modal display

### Environment Variables

All API keys must be in `.env` file (never commit to git):
- `GROQ_API_KEY` - Free LLM for intent extraction
- `GEMINI_API_KEY` - Premium model for optimization
- `PORT` - Server port (default: 5000)

### Debugging

Enable verbose logging:
```javascript
// In routes/optimization.js - already included
console.log(`🔍 Optimizing workflow...`);
console.log(`✅ Agent 1 Result:`);
console.log(`🎯 Agent 2: Optimizing workflow...`);
```

## Future Enhancements

- [ ] Request queuing for rate limiting
- [ ] Caching of optimization results
- [ ] Support for custom AI models
- [ ] Batch optimization of multiple workflows
- [ ] Workflow execution validation
- [ ] Performance metrics tracking

## License

MIT
