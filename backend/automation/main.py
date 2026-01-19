"""
Main entry point for the workflow-to-automation pipeline.

Usage:
    python main.py --workflow <path-to-csv>
    python main.py --workflow <path-to-csv> --workflow-id <id>
    python main.py --task "Navigate to google.com and search for Python"
"""

import argparse
import asyncio
import sys
from pathlib import Path

# Fix Windows console encoding for emoji support
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

from .config import config
from .workflow_loader import WorkflowLoader
from .llm_client import LLMClient
from .automation_runner import AutomationRunner


def parse_args():
    parser = argparse.ArgumentParser(
        description="Convert recorded workflows to automated browser actions"
    )
    
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--workflow",
        type=Path,
        help="Path to CSV workflow export file",
    )
    group.add_argument(
        "--task",
        type=str,
        help="Direct task description to execute (skip LLM generation)",
    )
    group.add_argument(
        "--server",
        action="store_true",
        help="Run as API server for extension integration",
    )
    
    parser.add_argument(
        "--port",
        type=int,
        default=5001,
        help="Port for API server (default: 5001)",
    )
    parser.add_argument(
        "--workflow-id",
        type=str,
        default=None,
        help="Specific workflow ID to process (optional, uses first if not specified)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Generate task description but don't execute automation",
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Run browser in headless mode",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose output",
    )
    
    return parser.parse_args()


async def main_async():
    args = parse_args()
    
    # Server mode - run API server
    if args.server:
        from .server import run_server
        run_server(port=args.port)
        return 0
    
    # Validate config for workflow mode
    if not args.task:
        config.validate()
    
    task_description = None
    
    if args.task:
        # Direct task mode - skip workflow loading and LLM
        task_description = args.task
        print(f"\n📋 Task: {task_description}")
    
    else:
        # Workflow mode - load CSV and generate description
        print(f"\n📂 Loading workflow from: {args.workflow}")
        
        loader = WorkflowLoader(args.workflow)
        workflow = loader.load_single(args.workflow_id)
        
        print(f"📊 Loaded workflow: {workflow.workflow_id}")
        print(f"   - Events: {len(workflow.events)}")
        print(f"   - Start URL: {workflow.start_url}")
        
        if args.verbose:
            print("\n📝 Workflow summary:")
            print(workflow.summary)
        
        # Generate task description using LLM
        print("\n🤖 Generating task description with LLM...")
        llm_client = LLMClient()
        task_description = llm_client.generate_task_description(workflow)
        
        print(f"\n✨ Generated task description:")
        print(f"   {task_description}")
    
    if args.dry_run:
        print("\n⏸️  Dry run mode - skipping automation execution")
        return 0
    
    # Execute automation
    print(f"\n🚀 Starting browser automation...")
    print(f"   Headless: {args.headless}")
    
    runner = AutomationRunner(headless=args.headless)
    result = await runner.run_task(task_description)
    
    if result["success"]:
        print("\n✅ Automation completed successfully!")
        if args.verbose and result.get("history"):
            print("\n📜 Execution history:")
            for i, step in enumerate(result["history"], 1):
                print(f"   {i}. {step}")
    else:
        print(f"\n❌ Automation failed: {result.get('error', 'Unknown error')}")
        return 1
    
    return 0


def main():
    """Entry point for CLI."""
    try:
        exit_code = asyncio.run(main_async())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
