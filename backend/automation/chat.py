"""
Interactive chat REPL for AutoPattern.

Starts a FastAPI server in the background (for the Chrome extension)
and provides an interactive prompt where users can type browser tasks,
load workflow CSVs, change settings, and more.

Usage:
    autopattern          # starts chat + API server
    autopattern --port 8000  # custom port
"""

import asyncio
import os
import signal
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

from .config import config

VERSION = "0.2.1"

AVAILABLE_MODELS = [
    "gemini-flash-latest",
    "gemini-pro-latest",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash",
]

HELP_TEXT = """
╭─────────────────── AutoPattern Commands ───────────────────╮
│                                                            │
│  Just type a task to run it in the browser:                │
│    you > Go to google.com and search for Python            │
│                                                            │
│  Slash commands:                                           │
│    /help                 Show this help message            │
│    /load <file.csv>      Load a workflow CSV file          │
│    /model [name]         Show or change the LLM model      │
│    /headless [on|off]    Toggle headless browser mode      │
│    /history              Show tasks run this session       │
│    /clear                Clear session history             │
│    /key [key]            Show or change the API key        │
│    /quit or /exit        Exit AutoPattern                  │
│                                                            │
│  While a task is running:                                  │
│    Ctrl+C                Stop the running task             │
│                                                            │
│  At the prompt:                                            │
│    Ctrl+C twice          Exit AutoPattern                  │
│                                                            │
╰────────────────────────────────────────────────────────────╯
""".strip()


# ---------------------------------------------------------------------------
# Session state
# ---------------------------------------------------------------------------

_browser = None          # Shared browser instance (lazy)
_history: list[dict] = []
_current_task: Optional[asyncio.Task] = None
_headless: bool = config.headless


# ---------------------------------------------------------------------------
# API key setup
# ---------------------------------------------------------------------------

def _ensure_api_key() -> bool:
    """Check for GOOGLE_API_KEY; prompt user to enter one if missing.

    Returns True if a valid key is available, False to abort.
    """
    if config.google_api_key:
        return True

    print()
    print("  GOOGLE_API_KEY is not set.")
    print("  You need a free Gemini API key from:")
    print("  https://aistudio.google.com/app/apikey\n")

    try:
        key = input("  Paste your API key here > ").strip()
    except (EOFError, KeyboardInterrupt):
        print("\n  Aborted.")
        return False

    if not key:
        print("  No key entered. Exiting.")
        return False

    # Apply to current process
    os.environ["GOOGLE_API_KEY"] = key
    config.google_api_key = key

    # Offer to save to .env so they don't have to enter it again
    try:
        save = input("  Save to .env so you don't have to enter it again? (Y/n) > ").strip().lower()
    except (EOFError, KeyboardInterrupt):
        save = "n"

    if save in ("", "y", "yes"):
        _save_key_to_dotenv(key)
        print("  Key saved to .env\n")
    else:
        print("  Key set for this session only.\n")

    return True


def _save_key_to_dotenv(key: str, path: Path | None = None):
    """Append or update GOOGLE_API_KEY in a .env file."""
    env_file = path or Path.cwd() / ".env"
    lines: list[str] = []
    replaced = False

    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                if line.strip().startswith("GOOGLE_API_KEY="):
                    lines.append(f'GOOGLE_API_KEY="{key}"\n')
                    replaced = True
                else:
                    lines.append(line)

    if not replaced:
        lines.append(f'GOOGLE_API_KEY="{key}"\n')

    with open(env_file, "w") as f:
        f.writelines(lines)


# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------

def _print_banner(port: int):
    print(f"""
  AutoPattern v{VERSION}
  AI-powered browser automation from CLI

  API server : http://localhost:{port}
  LLM model  : {config.llm_model}
  Headless   : {_headless}

  Type a task to automate, or /help for commands.
""")


# ---------------------------------------------------------------------------
# Browser helpers
# ---------------------------------------------------------------------------

async def _get_browser():
    """Lazily create and return the shared browser instance."""
    global _browser
    if _browser is None:
        from browser_use import Browser
        _browser = Browser(headless=_headless)
    return _browser


async def _close_browser():
    """Close the shared browser if it exists."""
    global _browser
    if _browser is not None:
        try:
            await _browser.stop()
        except Exception:
            pass
        _browser = None


# ---------------------------------------------------------------------------
# Task execution
# ---------------------------------------------------------------------------

async def _run_task(task_description: str, sensitive_data: Optional[dict] = None) -> dict:
    """Run a browser task using the shared browser instance."""
    from .automation_runner import AutomationRunner

    browser = await _get_browser()
    runner = AutomationRunner(
        headless=_headless,
        llm_model=config.llm_model,
    )
    return await runner.run_task(task_description, sensitive_data=sensitive_data, browser=browser)


# ---------------------------------------------------------------------------
# Slash-command handlers
# ---------------------------------------------------------------------------

def _cmd_help():
    print(HELP_TEXT)


def _cmd_model(args: str):
    global _headless
    parts = args.strip().split()
    if not parts:
        # Show current model + available list
        print(f"\n  Current model: {config.llm_model}")
        print(f"  Available models:")
        for m in AVAILABLE_MODELS:
            marker = " ◀" if m == config.llm_model else ""
            print(f"    - {m}{marker}")
        print()
    else:
        new_model = parts[0]
        config.llm_model = new_model
        # Also update server runtime settings if server is running
        try:
            from .server import runtime_settings
            runtime_settings.llm_model = new_model
        except Exception:
            pass
        print(f"  Model set to: {new_model}")


def _cmd_headless(args: str):
    global _headless, _browser
    parts = args.strip().lower().split()
    if not parts:
        print(f"  Headless mode: {'on' if _headless else 'off'}")
        return

    val = parts[0]
    if val in ("on", "true", "1", "yes"):
        _headless = True
    elif val in ("off", "false", "0", "no"):
        _headless = False
    else:
        print(f"  Usage: /headless [on|off]")
        return

    config.headless = _headless
    # Force a new browser on next task with the new setting
    if _browser is not None:
        print("  Note: Browser will restart with new setting on next task.")
        # Schedule close; next _get_browser() will create a new one
        asyncio.get_event_loop().create_task(_close_browser())

    print(f"  Headless mode: {'on' if _headless else 'off'}")


def _cmd_history():
    if not _history:
        print("  No tasks in this session yet.\n")
        return
    print()
    for i, entry in enumerate(_history, 1):
        status = "ok" if entry["success"] else ("stopped" if entry.get("cancelled") else "failed")
        task_preview = entry["task"][:70] + ("..." if len(entry["task"]) > 70 else "")
        print(f"  {i}. {status} [{entry['time']}] {task_preview}")
    print()


def _cmd_clear():
    _history.clear()
    print("  Session history cleared.")


def _cmd_key(args: str):
    """Show or change the API key."""
    parts = args.strip()
    if not parts:
        key = config.google_api_key
        if key:
            masked = key[:4] + "..." + key[-4:] if len(key) > 8 else "****"
            print(f"  Current API key: {masked}")
        else:
            print("  No API key set.")
        return

    # Set new key
    os.environ["GOOGLE_API_KEY"] = parts
    config.google_api_key = parts
    print(f"  API key updated.")

    try:
        save = input("  Save to .env? (Y/n) > ").strip().lower()
    except (EOFError, KeyboardInterrupt):
        save = "n"

    if save in ("", "y", "yes"):
        _save_key_to_dotenv(parts)
        print("  Saved to .env")


async def _cmd_load(args: str):
    """Load a CSV workflow, generate task description, offer to run."""
    from .workflow_loader import WorkflowLoader
    from .llm_client import LLMClient

    parts = args.strip().split()
    if not parts:
        print("  Usage: /load <path-to-csv> [--id <workflow_id>]")
        return

    csv_path = Path(parts[0]).expanduser()
    workflow_id = None
    if "--id" in parts:
        idx = parts.index("--id")
        if idx + 1 < len(parts):
            workflow_id = parts[idx + 1]

    if not csv_path.exists():
        print(f"  Error: File not found: {csv_path}")
        return

    print(f"  Loading workflow from: {csv_path}")
    try:
        loader = WorkflowLoader(csv_path)
        workflow = loader.load_single(workflow_id)
    except Exception as e:
        print(f"  Error: Failed to load workflow: {e}")
        return

    print(f"  Workflow: {workflow.workflow_id} ({len(workflow.events)} events)")
    print(f"  Start URL: {workflow.start_url}")

    print("\n  Generating task description...")
    try:
        config.validate()
        llm_client = LLMClient()
        task_description = llm_client.generate_task_description(workflow)
    except Exception as e:
        print(f"  Error: LLM generation failed: {e}")
        return

    print(f"\n  Generated task:")
    print(f"     {task_description}\n")

    # Ask to run
    try:
        answer = await asyncio.get_event_loop().run_in_executor(None, input, "  Run this task? (y/n) > ")
    except (EOFError, KeyboardInterrupt):
        print("\n  Skipped.")
        return

    if answer.strip().lower() in ("y", "yes"):
        await _execute_task(task_description)
    else:
        print("  Skipped.")


# ---------------------------------------------------------------------------
# Task execution wrapper (with cancellation support)
# ---------------------------------------------------------------------------

async def _execute_task(task_description: str, sensitive_data: Optional[dict] = None):
    """Execute a task with Ctrl+C cancellation support."""
    global _current_task

    loop = asyncio.get_event_loop()

    # Create the task
    _current_task = asyncio.create_task(
        _run_task(task_description, sensitive_data=sensitive_data)
    )

    print("  (press Ctrl+C to stop the task)\n")

    # Install SIGINT handler that cancels the running task
    original_handler = signal.getsignal(signal.SIGINT)

    def _cancel_handler(signum, frame):
        if _current_task and not _current_task.done():
            _current_task.cancel()

    signal.signal(signal.SIGINT, _cancel_handler)

    try:
        result = await _current_task
        _history.append({
            "task": task_description,
            "success": result.get("success", False),
            "cancelled": False,
            "time": datetime.now().strftime("%H:%M:%S"),
        })
        if result["success"]:
            print("\n  Task completed.")
        else:
            print(f"\n  Error: {result.get('error', 'Unknown error')}")

    except asyncio.CancelledError:
        print("\n  Task cancelled.")
        _history.append({
            "task": task_description,
            "success": False,
            "cancelled": True,
            "time": datetime.now().strftime("%H:%M:%S"),
        })

    finally:
        _current_task = None
        signal.signal(signal.SIGINT, original_handler)


# ---------------------------------------------------------------------------
# Main REPL loop
# ---------------------------------------------------------------------------

async def start_chat(port: int = 5001):
    """Start the API server in the background and run the interactive chat REPL."""
    import logging
    import uvicorn
    from .server import app as fastapi_app

    # --- Ensure API key is configured ---
    if not _ensure_api_key():
        sys.exit(1)

    # Suppress noisy uvicorn/starlette shutdown tracebacks
    logging.getLogger("uvicorn.error").setLevel(logging.CRITICAL)

    # --- Start uvicorn as a background async task ---
    uvi_config = uvicorn.Config(
        fastapi_app,
        host="0.0.0.0",
        port=port,
        log_level="warning",
    )
    server = uvicorn.Server(uvi_config)

    server_task = asyncio.create_task(server.serve())

    # Give server a moment to bind
    await asyncio.sleep(0.3)

    _print_banner(port)

    loop = asyncio.get_event_loop()
    ctrl_c_count = 0

    try:
        while True:
            # Read input without blocking the event loop
            try:
                ctrl_c_count = 0  # reset on successful prompt
                user_input = await loop.run_in_executor(None, input, "you > ")
            except EOFError:
                # Ctrl+D
                break
            except KeyboardInterrupt:
                ctrl_c_count += 1
                if ctrl_c_count >= 2:
                    break
                print("\n  Press Ctrl+C again to exit, or type /quit")
                continue

            line = user_input.strip()
            if not line:
                continue

            # --- Slash commands ---
            if line.startswith("/"):
                cmd_parts = line.split(None, 1)
                cmd = cmd_parts[0].lower()
                cmd_args = cmd_parts[1] if len(cmd_parts) > 1 else ""

                if cmd in ("/quit", "/exit"):
                    break
                elif cmd == "/help":
                    _cmd_help()
                elif cmd == "/model":
                    _cmd_model(cmd_args)
                elif cmd == "/headless":
                    _cmd_headless(cmd_args)
                elif cmd == "/history":
                    _cmd_history()
                elif cmd == "/clear":
                    _cmd_clear()
                elif cmd == "/load":
                    await _cmd_load(cmd_args)
                elif cmd == "/key":
                    _cmd_key(cmd_args)
                else:
                    print(f"  Unknown command: {cmd}. Type /help for available commands.")
                continue

            # --- Task execution ---
            await _execute_task(line)

    finally:
        # Clean shutdown
        print("\n👋 Shutting down...")

        await _close_browser()

        server.should_exit = True
        try:
            await asyncio.wait_for(server_task, timeout=3.0)
        except (asyncio.TimeoutError, asyncio.CancelledError, Exception):
            try:
                server_task.cancel()
                await server_task
            except (asyncio.CancelledError, Exception):
                pass

        print("   Goodbye!\n")
