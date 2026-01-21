# AutoPattern Backend

Backend services for converting recorded workflows into automated browser actions.

## Installation

### Using uv (Recommended)

```bash
# Install uv if you haven't already
pip install uv

# Create virtual environment and install dependencies
uv venv --python 3.11
.\.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/macOS

# Install the package
uv sync
```

### Alternative: pip

```bash
pip install -e .
```

## Configuration

1. Copy the example environment file:
   ```bash
   cp automation/.env.example automation/.env
   ```

2. Edit `automation/.env` and add your API keys:
   ```env
   GOOGLE_API_KEY=your-gemini-api-key
   ```

## Usage

### API Server (FastAPI)

Start the API server for extension integration:

```bash
python -m automation.main --server --port 5001
```

Endpoints:
- `GET /api/health` - Health check
- `POST /api/automate` - Automate from workflow events
- `POST /api/automate/task` - Automate from task description
- `WebSocket /ws/automation` - Human-in-the-loop interactions

### CLI Tool

```bash
# Run with a task description
python -m automation.main --task "Navigate to google.com and search for Python"

# Run with recorded workflow
python -m automation.main --workflow <path-to-csv>

# Use your real Chrome profile (with cookies, extensions)
python -m automation.main --task "..." --use-profile

# Enable human-in-the-loop (agent can ask for help)
python -m automation.main --task "..." --human-in-loop
```

### As a Library

```python
from automation import AutomationRunner

runner = AutomationRunner(
    headless=False,
    use_user_profile=True,      # Use your Chrome profile
    enable_human_in_loop=True,  # Agent can ask for help
)
result = runner.run_task_sync("Navigate to google.com and search for Python")
```

## Features

### Human-in-the-Loop

Use `--human-in-loop` to enable agent-human collaboration:
- Agent can ask clarifying questions
- Request approval before critical actions
- Handle CAPTCHAs or complex decisions

## Project Structure

```
backend/
├── pyproject.toml          # Package configuration (uv compatible)
├── README.md               # This file
└── automation/             # Main package
    ├── __init__.py         # Package exports
    ├── config.py           # Environment configuration
    ├── workflow_loader.py  # CSV parsing
    ├── llm_client.py       # Gemini API client
    ├── automation_runner.py # browser-use integration
    ├── server.py           # FastAPI server
    └── main.py             # CLI entry point
```

