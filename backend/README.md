# ⚡ AutoPattern

**Record browser workflows, replay them with AI.**

AutoPattern records your clicks, inputs and navigation in Chrome, then uses Google Gemini + [browser-use](https://github.com/browser-use/browser-use) to replay them autonomously. It ships as a single CLI command with a built-in API server for the companion Chrome extension.

[![PyPI](https://img.shields.io/pypi/v/autopattern)](https://pypi.org/project/autopattern/)
[![Python](https://img.shields.io/pypi/pyversions/autopattern)](https://pypi.org/project/autopattern/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## Installation

```bash
pip install autopattern
```

Then install the browser driver (one-time):

```bash
playwright install chromium
```

### Configuration

Set your Google Gemini API key ([get one free](https://aistudio.google.com/app/apikey)):

```bash
export GOOGLE_API_KEY="your-key-here"
```

Or create a `.env` file in your working directory:

```env
GOOGLE_API_KEY=your-key-here
```

---

## Quick Start

Just run:

```bash
autopattern
```

This starts:
- An **interactive chat** where you type browser tasks in plain English
- A **background API server** on port 5001 for the Chrome extension

```
╭────────────────────────────────────────────╮
│          ⚡ AutoPattern v0.2.0             │
│   AI-powered browser automation from CLI   │
╰────────────────────────────────────────────╯

  📡 API server  : http://localhost:5001
  🤖 LLM model   : gemini-flash-latest

you > Go to github.com and star the autopattern repo
  🚀 Starting automation...
  ✅ Task completed successfully!

you > /quit
```

### Chat Commands

| Command | Description |
|---|---|
| *(any text)* | Run as a browser automation task |
| `/load <file.csv>` | Load a recorded workflow CSV |
| `/model [name]` | Show or change the Gemini model |
| `/headless [on\|off]` | Toggle headless browser mode |
| `/history` | Show tasks run this session |
| `/help` | Show all commands |
| `/quit` | Exit |
| `Ctrl+C` | Stop a running task |

---

## CLI Modes

```bash
# Interactive chat + API server (default)
autopattern

# Run a single task
autopattern --task "Search Google for 'Python tutorials'"

# Replay a recorded workflow CSV
autopattern --workflow recording.csv

# API server only (no chat)
autopattern --server

# Custom port
autopattern --port 8000
```

---

## As a Library

```python
from automation import AutomationRunner

runner = AutomationRunner(headless=False)
result = runner.run_task_sync("Go to google.com and search for Python")
print(result["success"])
```

---

## Chrome Extension

The companion Chrome extension records your browser interactions and sends them to AutoPattern's API for replay. Install it from the `extension/` directory in the [source repo](https://github.com/AadityaChaudhary/autopattern).

---

## API Endpoints

When AutoPattern is running (via `autopattern` or `autopattern --server`):

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check |
| `/api/settings` | GET/PUT | View or update settings |
| `/api/describe` | POST | Analyze workflow events → structured steps |
| `/api/automate` | POST | Run automation from recorded events |
| `/api/automate/task` | POST | Run automation from a task description |

---

## Development

```bash
git clone https://github.com/AadityaChaudhary/autopattern.git
cd autopattern/backend
pip install -e ".[dev]"
playwright install chromium
```

---

## License

MIT — see [LICENSE](https://github.com/AadityaChaudhary/autopattern/blob/main/LICENSE).

