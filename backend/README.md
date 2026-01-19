# AutoPattern Backend

Backend services for converting recorded workflows into automated browser actions.

## Installation

```bash
# Install in development mode
pip install -e .

# Or install dependencies only
pip install -r automation/requirements.txt
```

## Configuration

1. Copy the example environment file:
   ```bash
   cp automation/.env.example automation/.env
   ```

2. Edit `automation/.env` and add your GitHub PAT with `models` scope.

## Usage

### As a CLI tool

```bash
# After installing with pip install -e .
autopattern --workflow <path-to-csv>
autopattern --task "Navigate to google.com and search for Python"

# Or run directly
python -m automation.main --workflow <path-to-csv>
```

### As a library

```python
from automation import WorkflowLoader, LLMClient, AutomationRunner

# Load a workflow
loader = WorkflowLoader("path/to/workflow.csv")
workflow = loader.load_single()

# Generate task description
llm = LLMClient()
task = llm.generate_task_description(workflow)

# Run automation
runner = AutomationRunner()
result = runner.run_task_sync(task)
```

## Project Structure

```
backend/
├── pyproject.toml          # Package configuration
├── README.md               # This file
└── automation/             # Main package
    ├── __init__.py         # Package exports
    ├── config.py           # Environment configuration
    ├── workflow_loader.py  # CSV parsing
    ├── llm_client.py       # GitHub Models API
    ├── automation_runner.py # browser-use integration
    ├── main.py             # CLI entry point
    └── requirements.txt    # Dependencies
```
