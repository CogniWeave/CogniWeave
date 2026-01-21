"""
Automation Runner module.
Uses browser-use to execute tasks based on LLM-generated descriptions.
"""

import asyncio
import os
from typing import Optional, Callable, Awaitable

from .config import config


class AutomationRunner:
    """Runs browser automation using browser-use library."""
    
    def __init__(
        self,
        headless: Optional[bool] = None,
        llm_model: Optional[str] = None,
        enable_human_in_loop: Optional[bool] = None,
        human_input_callback: Optional[Callable[[str], Awaitable[str]]] = None,
    ):
        self.headless = headless if headless is not None else config.headless
        self.llm_model = llm_model or config.llm_model
        self.enable_human_in_loop = enable_human_in_loop if enable_human_in_loop is not None else config.enable_human_in_loop
        self.human_input_callback = human_input_callback
    
    def _create_browser(self):
        """Create browser instance."""
        from browser_use import Browser
        return Browser(headless=self.headless)
    
    def _create_tools(self):
        """Create tools registry with optional human-in-the-loop."""
        from browser_use import Tools, ActionResult
        
        tools = Tools()
        
        if self.enable_human_in_loop:
            # Create the human input callback
            callback = self.human_input_callback
            
            @tools.action('Ask human for help with a question. Use this when you need user input, clarification, or approval.')
            async def ask_human(question: str) -> ActionResult:
                """Ask the human operator for help or clarification."""
                if callback:
                    # Use provided callback (e.g., WebSocket for server mode)
                    answer = await callback(question)
                else:
                    # Fallback to console input (non-blocking)
                    print(f"\n🤔 Agent needs help:")
                    print(f"   Question: {question}")
                    
                    # Run input() in a separate thread to avoid blocking the async event loop
                    loop = asyncio.get_running_loop()
                    answer = await loop.run_in_executor(None, input, "   Your answer > ")
                
                return ActionResult(
                    extracted_content=f"Human responded: {answer}",
                )
            
            print("👤 Human-in-the-loop enabled")
        
        return tools
    
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
        
        # Create tools (with optional human-in-the-loop)
        tools = self._create_tools()
        
        # Create and run agent with token optimization settings
        agent = Agent(
            task=task_description,
            llm=llm,
            flash_mode=True,
            browser=browser,
            tools=tools,
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
            print(f"   Description: {task_description}")
            print(f"   Headless: {self.headless}")
            print(f"   Model: {self.llm_model}")
            print(f"   Human-in-Loop: {self.enable_human_in_loop}")
            
            history = await agent.run()
            
            print(f"✅ Agent execution finished")
            if hasattr(history, 'all_results'):
                print(f"   Results: {len(history.all_results())} actions performed")
            
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


async def run_automation(
    task_description: str,
    headless: bool = False,
    enable_human_in_loop: bool = False,
) -> dict:
    """Convenience function to run a single automation task."""
    runner = AutomationRunner(
        headless=headless,
        enable_human_in_loop=enable_human_in_loop,
    )
    return await runner.run_task(task_description)

