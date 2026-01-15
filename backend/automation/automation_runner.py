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
        try:
            from browser_use import Agent, Browser
            from langchain_openai import ChatOpenAI
        except ImportError:
            raise ImportError(
                "browser-use is not installed. Run: pip install browser-use"
            )
        
        # Set up environment for OpenAI-compatible endpoint (GitHub Models)
        # browser-use's ChatOpenAI reads from OPENAI_API_KEY and OPENAI_BASE_URL
        os.environ["OPENAI_API_KEY"] = config.github_pat
        os.environ["OPENAI_BASE_URL"] = "https://models.github.ai/inference"
        
        # Initialize LLM using browser-use's ChatOpenAI wrapper
        llm = ChatOpenAI(model=self.llm_model)
        
        # Initialize browser
        browser = Browser()
        
        # Create and run agent
        agent = Agent(
            task=task_description,
            llm=llm,
            browser=browser,
        )
        
        try:
            history = await agent.run()
            return {
                "success": True,
                "history": history,
                "task": task_description,
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "task": task_description,
            }
        finally:
            await browser.close()
    
    def run_task_sync(self, task_description: str) -> dict:
        """Synchronous wrapper for run_task."""
        return asyncio.run(self.run_task(task_description))


async def run_automation(task_description: str, headless: bool = False) -> dict:
    """Convenience function to run a single automation task."""
    runner = AutomationRunner(headless=headless)
    return await runner.run_task(task_description)
