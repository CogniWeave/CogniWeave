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
    
    async def run_task(self, task_description: str) -> dict:
        """
        Execute a task using browser-use.
        
        Args:
            task_description: Natural language description of the task to perform.
            
        Returns:
            dict with execution results including history and status.
        """
        # Import browser-use components
        try:
            from browser_use import Agent, Browser, ChatGoogle
        except ImportError:
            raise ImportError(
                "browser-use is not installed. Run: pip install browser-use"
            )
        
        # Initialize Gemini LLM using browser-use's ChatGoogle
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is not set. Get one at https://aistudio.google.com/app/apikey")
        
        # Set environment variable for ChatGoogle
        os.environ["GOOGLE_API_KEY"] = api_key
        
        # Initialize main LLM
        llm = ChatGoogle(model=self.llm_model)
        
        # Use gemini-flash-latest for page extraction
        page_extraction_llm = ChatGoogle(model="gemini-flash-latest")
        
        # Initialize browser
        browser = Browser()
        
        # Create and run agent with token optimization settings
        agent = Agent(
            task=task_description,
            llm=llm,
            browser=browser,
            # Vision mode sends screenshots instead of full DOM - more efficient!
            use_vision=True,  
            # Low detail reduces screenshot token usage
            vision_detail_level="low",
            # Use smaller model for page extraction
            page_extraction_llm=page_extraction_llm,
            # Limit actions per step to reduce context accumulation
            max_actions_per_step=3,
            # Limit retries to avoid excessive API calls
            max_failures=2,
        )
        
        try:
            print(f"\n🚀 Starting automation task:")
            print(f"📝 Description: {task_description}")
            print(f"🌐 Headless: {self.headless}")
            print(f"🤖 Model: {self.llm_model}")
            
            history = await agent.run()
            
            print(f"✅ Agent execution finished")
            if hasattr(history, 'all_results'):
                print(f"📊 Results: {len(history.all_results())} actions performed")
            
            # Keep browser open briefly to see results
            await asyncio.sleep(3)
            
            return {
                "success": True,
                "history": history,
                "task": task_description,
            }
        except Exception as e:
            print(f"❌ Automation failed: {e}")
            import traceback
            traceback.print_exc()
            
            # Keep browser open longer on error for debugging
            await asyncio.sleep(5)
            
            return {
                "success": False,
                "error": str(e),
                "task": task_description,
            }
    
    def run_task_sync(self, task_description: str) -> dict:
        """Synchronous wrapper for run_task."""
        return asyncio.run(self.run_task(task_description))


async def run_automation(task_description: str, headless: bool = False) -> dict:
    """Convenience function to run a single automation task."""
    runner = AutomationRunner(headless=headless)
    return await runner.run_task(task_description)
