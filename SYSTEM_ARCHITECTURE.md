# 🏗️ System Architecture Overview

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CHROME EXTENSION                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Dashboard (UI Layer)                    │   │
│  │  • Displays recorded workflows                       │   │
│  │  • Shows workflow cards with actions                 │   │
│  │  • Renders optimization results modal               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Dashboard.js (Logic Layer)                   │   │
│  │  • optimizeWorkflow(idx) - API caller               │   │
│  │  • displayOptimizationResult() - Modal renderer     │   │
│  │  • Manages loading states                           │   │
│  │  • Error handling                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │      IndexedDB Storage Layer                         │   │
│  │  • Stores workflows with events                      │   │
│  │  • Persists across sessions                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         ↓ HTTP POST
                 [CORS: localhost:5000]
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   NODE.JS BACKEND                            │
│                  (http://localhost:5000)                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Express Server (server.js)                          │   │
│  │  • Receives POST /optimize-workflow                  │   │
│  │  • Routes requests to orchestrator                   │   │
│  │  • Returns JSON responses                            │   │
│  │  • Middleware: CORS, JSON parsing, errors           │   │
│  └──────────────────────────────────────────────────────┘   │
│                         ↓                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Orchestrator (routes/optimization.js)              │   │
│  │  1. Validate request                                │   │
│  │  2. Call Agent 1                                    │   │
│  │  3. Call Agent 2                                    │   │
│  │  4. Combine results                                 │   │
│  │  5. Return response                                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                   ↙           ↘                              │
│        ┌──────────────┐    ┌──────────────┐                │
│        ↓              ↓    ↓              ↓                │
│  ┌────────────────┐ ┌────────────────┐                    │
│  │   AGENT 1      │ │   AGENT 2      │                    │
│  │ Intent Extract │ │  Optimization  │                    │
│  └────────────────┘ └────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
        ↓                                ↓
   ┌─────────────┐                ┌──────────────┐
   │ GROQ API    │                │ GEMINI API   │
   │ LLaMA-3     │                │ 1.5 Pro      │
   │ (Free)      │                │ (Paid)       │
   └─────────────┘                └──────────────┘
        ↓                                ↓
   [Process events]              [Reason about steps]
   [Extract intent]              [Suggest optimization]
   [Identify goal]                [Explain removal]
                                   [Rate confidence]
```

## Data Flow Diagram

```
User Records Browser Events
          ↓
    [Event Array]
    {events: [click, input, scroll, ...]}
          ↓
User clicks "Optimize" button
          ↓
Frontend: optimizeWorkflow()
  • Collect workflow from memory
  • Show loading modal
  • POST to /optimize-workflow
          ↓
Backend receives request
  • Log workflow details
  • Validate events array
          ↓
Agent 1: Intent Extraction
  • Convert events → natural language
  • Call Groq LLaMA-3 API
  • Parse response: {goal, steps: []}
  • Return intent result
          ↓
Agent 2: Optimization
  • Receive goal + steps from Agent 1
  • Call Gemini 1.5 Pro API
  • Perform counterfactual reasoning
  • Parse response: {originalSteps, optimizedSteps, removedSteps, explanation, confidence}
  • Return optimization result
          ↓
Orchestrator combines results:
{
  goal: from Agent 1,
  originalSteps: from Agent 2,
  optimizedSteps: from Agent 2,
  removedSteps: from Agent 2,
  explanation: from Agent 2,
  confidence: from Agent 2,
  stepReduction: calculated
}
          ↓
Backend returns JSON response
          ↓
Frontend receives response
  • Remove loading modal
  • Parse JSON
  • Build result modal
  • Display to user
          ↓
User sees optimization results
```

## Component Interaction Diagram

```
┌────────────────────────────────────────────────┐
│          Dashboard.js (Frontend)               │
├────────────────────────────────────────────────┤
│                                                │
│  optimizeWorkflow(idx)                         │
│  ├─ Get workflow from array                   │
│  ├─ Show loading modal                        │
│  ├─ Fetch POST /optimize-workflow             │
│  │   └─ Send: {workflowId, name, events}     │
│  ├─ Handle response                           │
│  ├─ Hide loading modal                        │
│  └─ Call displayOptimizationResult()          │
│                                                │
│  displayOptimizationResult(name, result)      │
│  ├─ Create modal overlay                      │
│  ├─ Render: goal, steps, explanation          │
│  ├─ Animate confidence bar                    │
│  ├─ Show step reduction percentage            │
│  └─ Add close button                          │
│                                                │
│  Error handling:                              │
│  ├─ Network errors → error modal              │
│  ├─ API timeout → error message               │
│  └─ Invalid JSON → error alert                │
│                                                │
└────────────────────────────────────────────────┘
                    ↕️ HTTP
              [POST request]
┌────────────────────────────────────────────────┐
│   Backend: routes/optimization.js              │
├────────────────────────────────────────────────┤
│                                                │
│  optimizeWorkflowHandler(req, res)             │
│  ├─ Extract: workflowId, name, events         │
│  ├─ Validate events array                     │
│  ├─ Log workflow info                         │
│  │                                            │
│  ├─ Call Agent 1:                             │
│  │  extractIntentFromEvents(events)           │
│  │  → {goal, steps}                          │
│  │                                            │
│  ├─ Call Agent 2:                             │
│  │  optimizeWorkflow(goal, steps)             │
│  │  → {original, optimized, removed, conf}   │
│  │                                            │
│  ├─ Combine results                           │
│  ├─ Calculate step reduction                  │
│  ├─ Add timestamp                             │
│  └─ res.json(response)                        │
│                                                │
│  Error handling:                              │
│  ├─ Invalid input → 400                       │
│  ├─ Agent errors → 500 + fallback            │
│  └─ Missing keys → 500 + message             │
│                                                │
└────────────────────────────────────────────────┘
     ↓                              ↓
  ┌──────────────────────┐  ┌──────────────────────┐
  │ Agent 1              │  │ Agent 2              │
  │ intentExtractor.js   │  │ workflowOptimizer.js │
  ├──────────────────────┤  ├──────────────────────┤
  │                      │  │                      │
  │ eventsToDescription()│  │ optimizeWorkflow()   │
  │ ├─ Parse events     │  │ ├─ Build prompt     │
  │ ├─ Create narrative │  │ ├─ Call Gemini API  │
  │ └─ Return text      │  │ ├─ Parse response   │
  │                      │  │ ├─ Validate JSON    │
  │ extractIntentFromE...│  │ └─ Fallback heuristics
  │ ├─ Call Groq API    │  │                      │
  │ ├─ Parse response   │  │ Returns:            │
  │ ├─ Validate format  │  │ {                   │
  │ ├─ Fallback logic   │  │  originalSteps: []  │
  │ └─ Return result    │  │  optimizedSteps: [] │
  │                      │  │  removedSteps: []   │
  │ Returns:            │  │  explanation: ""    │
  │ {                   │  │  confidence: 0-100  │
  │  goal: "",          │  │ }                   │
  │  steps: []          │  │                      │
  │ }                   │  │                      │
  │                      │  │                      │
  └──────────────────────┘  └──────────────────────┘
     ↓                              ↓
   [Groq API]                 [Gemini API]
   mixtral-8x7b             1.5 Pro Model
   Free Tier                 Paid/Free Tier
```

## Request/Response Flow

```
REQUEST (from extension):
POST /optimize-workflow
Content-Type: application/json

{
  "workflowId": 1,
  "workflowName": "Login Workflow",
  "events": [
    {
      "type": "click",
      "target": {
        "tagName": "BUTTON",
        "id": "signin",
        "innerText": "Sign In"
      },
      "timestamp": 1704206400000
    },
    {
      "type": "input",
      "target": {
        "tagName": "INPUT",
        "id": "email",
        "value": "user@example.com"
      },
      "timestamp": 1704206405000
    }
    // ... more events
  ]
}

         ↓ Processing ↓

RESPONSE (to extension):
HTTP 200 OK
Content-Type: application/json

{
  "workflowId": 1,
  "workflowName": "Login Workflow",
  "goal": "Authenticate user account",
  
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
  
  "explanation": "The 'Click next' step is redundant browser navigation...",
  "confidence": 85,
  
  "optimization": {
    "stepReduction": "40.0"
  },
  
  "timestamp": "2024-01-02T10:30:00.000Z"
}
```

## File Organization

```
autopattern/
│
├── 📁 extension/                    [Chrome Extension]
│   └── src/ui/
│       ├── dashboard.html           [Modified: +Optimize CSS]
│       └── dashboard.js             [Modified: +optimize functions]
│
├── 📁 backend/                      [Node.js Backend - NEW]
│   ├── 📄 server.js                 [Express app entry point]
│   ├── 📄 package.json              [Dependencies]
│   ├── 📄 .env.example              [Configuration template]
│   ├── 📄 .gitignore                [Git ignore rules]
│   ├── 📄 README.md                 [Backend docs]
│   ├── 📄 validate.js               [Setup validator]
│   │
│   ├── 📁 agents/                   [AI Agents]
│   │   ├── 📄 intentExtractor.js    [Agent 1 - Groq]
│   │   └── 📄 workflowOptimizer.js  [Agent 2 - Gemini]
│   │
│   └── 📁 routes/                   [API Routes]
│       └── 📄 optimization.js       [/optimize-workflow endpoint]
│
├── 📁 docs/                         [Documentation]
│   ├── 📄 QUICK_START.md            [5-min setup]
│   ├── 📄 OPTIMIZATION_SETUP.md     [Complete guide]
│   ├── 📄 TROUBLESHOOTING.md        [FAQ & issues]
│   ├── 📄 AI_AGENTS_IMPLEMENTATION.md [Technical details]
│   └── 📄 SYSTEM_ARCHITECTURE.md    [This file]
│
└── ... (existing files)
```

## Technology Stack

### Frontend
- **Language**: JavaScript
- **Environment**: Chrome Extension
- **Storage**: IndexedDB
- **API Client**: Fetch API
- **UI**: HTML/CSS (vanilla)

### Backend
- **Runtime**: Node.js v18+
- **Framework**: Express.js
- **Language**: JavaScript (ES6 modules)
- **Parsing**: JSON
- **HTTP Client**: Axios

### External APIs
- **Intent Extraction**: Groq (LLaMA-3)
  - Free tier
  - Mixtral-8x7b-32768 model
  - Text completion

- **Optimization**: Google Generative AI (Gemini 1.5 Pro)
  - Paid/Free tier
  - Advanced reasoning
  - Structured output

### Infrastructure
- **Server**: Localhost (http://localhost:5000)
- **CORS**: Configured for localhost only
- **Request Size**: 50MB limit
- **Rate Limiting**: API-dependent

## Data Models

### Workflow Model (Frontend)
```javascript
{
  id: number,              // Primary key from IndexedDB
  name: string,            // User-defined name
  createdAt: timestamp,    // Creation timestamp
  events: Event[],         // Array of browser events
  eventCount: number,      // Count of events
  schema: 'workflow-v1'    // Version identifier
}
```

### Event Model (Raw)
```javascript
{
  type: 'click'|'input'|'submit'|'scroll'|'change'|...,
  target: {
    tagName: string,       // HTML tag (BUTTON, INPUT, etc.)
    id?: string,           // Element ID if present
    className?: string,    // Class name if present
    innerText?: string,    // Visible text
    textContent?: string,  // Text content
    value?: string         // Input value
  },
  timestamp?: number       // Event timestamp
}
```

### Intent Model (Agent 1 Output)
```javascript
{
  goal: string,            // High-level workflow goal
  steps: string[]          // 5-15 semantic steps
}
```

### Optimization Model (Agent 2 Output)
```javascript
{
  originalSteps: string[],     // Steps from Agent 1
  optimizedSteps: string[],    // Suggested shorter workflow
  removedSteps: string[],      // Steps that can be skipped
  explanation: string,         // Why optimization works
  confidence: number           // 0-100 confidence score
}
```

### API Response Model
```javascript
{
  workflowId: number,
  workflowName: string,
  goal: string,
  originalSteps: string[],
  optimizedSteps: string[],
  removedSteps: string[],
  explanation: string,
  confidence: number,
  optimization: {
    stepReduction: string        // Percentage as string
  },
  timestamp: ISO8601String
}
```

## Error Handling Strategy

```
Request Received
      ↓
Validate Input
  ├─ Yes → Continue
  └─ No → 400 Bad Request
      ↓
Call Agent 1
  ├─ Success → Return {goal, steps}
  ├─ API Error → Fallback heuristic
  └─ Timeout → Return generic goal
      ↓
Call Agent 2
  ├─ Success → Return optimization
  ├─ API Error → Fallback heuristic
  └─ Timeout → Return partial optimization
      ↓
Format Response
      ↓
Return 200 OK + JSON
  (Even if degraded, response is valid)
```

## Security Considerations

1. **API Key Storage**: `.env` file (not committed)
2. **CORS**: Localhost only
3. **Input Validation**: All endpoints validate input
4. **Request Size**: 50MB limit
5. **Error Messages**: Generic without exposing internals
6. **No Direct API Calls**: Backend proxies all API calls
7. **Rate Limiting**: Recommended for production

## Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| Event parsing | <100ms | Frontend |
| Network request | 100-500ms | Depends on connection |
| Agent 1 (Groq) | 2-5s | Intent extraction |
| Agent 2 (Gemini) | 3-8s | Optimization reasoning |
| Response transmission | 100-500ms | Depends on bandwidth |
| **Total** | **5-15s** | Typical experience |

## Scalability Considerations

For production:
- Add request queuing
- Implement caching
- Use load balancing
- Monitor API costs
- Add rate limiting
- Implement job queue (Bull, RabbitMQ)

## Future Architecture

Potential enhancements:
```
┌─ Database (MongoDB/PostgreSQL)
│  └─ Store optimization history
│
├─ Caching Layer (Redis)
│  └─ Cache Agent 1 & 2 results
│
├─ Job Queue (Bull/RabbitMQ)
│  └─ Async optimization processing
│
├─ WebSocket Server
│  └─ Real-time progress updates
│
├─ Analytics Dashboard
│  └─ Track optimization metrics
│
└─ Admin Panel
   └─ Manage API keys, monitor costs
```

---

**See also:**
- [QUICK_START.md](QUICK_START.md) - 5-minute setup
- [OPTIMIZATION_SETUP.md](OPTIMIZATION_SETUP.md) - Complete guide
- [backend/README.md](backend/README.md) - API documentation
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - FAQ & issues
