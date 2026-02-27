"""
Automation Runner module.
Uses browser-use to execute tasks based on LLM-generated descriptions.
"""

import asyncio
import os
from typing import Optional

from .config import config


class AutomationRunner:
    """Runs browser automation using browser-use library."""
    
    def __init__(
        self,
        headless: Optional[bool] = None,
        llm_model: Optional[str] = None,
    ):
        self.headless = headless if headless is not None else config.headless
        self.llm_model = llm_model or config.llm_model
    
    def _create_browser(self):
        """Create browser instance."""
        from browser_use import Browser
        return Browser(headless=self.headless)
    
    def _create_tools(self):
        """Create tools registry."""
        from browser_use import Tools
        return Tools()
    
    async def run_task(self, task_description: str, sensitive_data: dict = None) -> dict:
        """
        Execute a task using browser-use.
        
        Args:
            task_description: Natural language description of the task to perform.
            sensitive_data: Optional dict of sensitive values (credentials, etc.) to pass to browser-use.
                           Keys should match placeholders in the task description.
            
        Returns:
            dict with execution results including history and status.
        """
        # Import browser-use components
        try:
            from browser_use import Agent, ChatGoogle
        except ImportError:
            raise ImportError(
                "browser-use is not installed. Run: uv pip install browser-use"
            )
        
        # Initialize Gemini LLM using browser-use's ChatGoogle
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is not set. Get one at https://aistudio.google.com/app/apikey")
        
        # Set environment variable for ChatGoogle
        os.environ["GOOGLE_API_KEY"] = api_key
        
        # Initialize main LLM
        llm = ChatGoogle(model=self.llm_model)
        
        # Use gemini-flash-lite for page extraction (faster, cheaper)
        page_extraction_llm = ChatGoogle(model="gemini-flash-lite-latest")
        
        # Initialize browser
        browser = self._create_browser()
        
        # Create tools
        tools = self._create_tools()
        
        enhanced_task = task_description
        
        # If sensitive_data provided, add instructions for using the credentials
        if sensitive_data:
            credential_instructions = "\n\nIMPORTANT: User has provided the following credentials to use:\n"
            for key in sensitive_data.keys():
                credential_instructions += f"- {key}: Use the value referenced as <secret>{key}</secret>\n"
            credential_instructions += "\nUse these values when filling in the corresponding form fields."
            enhanced_task = enhanced_task + credential_instructions
        
        # Create and run agent with token optimization settings
        agent = Agent(
            task=enhanced_task,
            llm=llm,
            flash_mode=True,
            browser=browser,
            tools=tools,
            # Pass sensitive data for secure credential handling
            sensitive_data=sensitive_data,
            # Disable vision mode - use DOM-based navigation
            use_vision=False,
            # Use smaller model for page extraction
            page_extraction_llm=page_extraction_llm,
            # Limit actions per step to reduce context accumulation
            max_actions_per_step=3,
            # Limit retries to avoid excessive API calls
            max_failures=2,
        )
        
        try:
            print(f"\n🚀 Starting automation task:")
            print(f"   Original task: {task_description[:100]}...")
            print(f"   Headless: {self.headless}")
            print(f"   Model: {self.llm_model}")
            print(f"   Sensitive Data: {'Yes - ' + str(len(sensitive_data)) + ' values' if sensitive_data else 'No'}")
            
            history = await agent.run()
            
            print(f"✅ Agent execution finished")
            if hasattr(history, 'all_results'):
                print(f"   Results: {len(history.all_results())} actions performed")
            
            # NOTE: Browser stays open after automation - user can close manually
            print(f"   Browser window kept open for review")
            
            return {
                "success": True,
                "history": history,
                "task": task_description,
            }
        except Exception as e:
            print(f"❌ Automation failed: {e}")
            import traceback
            traceback.print_exc()
            
            # NOTE: Browser stays open after error for debugging - user can close manually
            print(f"   Browser window kept open for debugging")
            
            return {
                "success": False,
                "error": str(e),
                "task": task_description,
            }
    
    def run_task_sync(self, task_description: str) -> dict:
        """Synchronous wrapper for run_task."""
        return asyncio.run(self.run_task(task_description))


async def run_automation(
    task_description: str,
    headless: bool = False,
) -> dict:
    """Convenience function to run a single automation task."""
    runner = AutomationRunner(
        headless=headless,
    )
    return await runner.run_task(task_description)

