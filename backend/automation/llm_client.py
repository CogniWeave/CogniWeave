"""
LLM Client module.
Uses Google Gemini to convert workflow events into natural language task descriptions.
"""

import os
from typing import Optional
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from .config import config
from .workflow_loader import Workflow


SYSTEM_PROMPT = """You are a task description generator. Given a sequence of user actions recorded from a browser session, generate a clear, concise natural language description of what the user was trying to accomplish.

The description should be actionable and suitable for instructing an AI browser automation agent to perform the same task.

Guidelines:
- Focus on the high-level goal, not individual clicks
- Include specific details like URLs, form field values (if available), and button names
- Use imperative mood (e.g., "Go to...", "Fill in...", "Click...")
- Keep it concise but complete
- If the workflow seems incomplete, describe what was done so far

Output format:
Just the task description, nothing else. No explanations or preamble."""


class LLMClient:
    """Client for generating task descriptions using Gemini."""
    
    def __init__(
        self,
        model: Optional[str] = None,
    ):
        self.model = model or config.llm_model
        
        # Initialize Gemini
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY is required. Get one at https://aistudio.google.com/app/apikey")
        
        self.llm = ChatGoogleGenerativeAI(model=self.model, google_api_key=api_key)
    
    def generate_task_description(self, workflow: Workflow) -> str:
        """Generate a natural language task description from a workflow."""
        
        user_prompt = f"""Here is a recorded browser workflow:

Starting URL: {workflow.start_url}

Actions performed:
{workflow.summary}

Generate a task description for an AI browser agent to replicate this workflow."""
        
        return self._generate(user_prompt)

    def generate_from_summary(self, summary: str, start_url: str = "") -> str:
        """Generate a task description from a plain text summary."""
        
        user_prompt = f"""Here is a recorded browser workflow:

Starting URL: {start_url}

Actions performed:
{summary}

Generate a task description for an AI browser agent to replicate this workflow."""
        
        return self._generate(user_prompt)

    def _generate(self, prompt: str) -> str:
        """Internal generation logic using Gemini."""
        
        try:
            response = self.llm.invoke([
                SystemMessage(content=SYSTEM_PROMPT),
                HumanMessage(content=prompt)
            ])
            content = response.content
            if isinstance(content, list):
                content = " ".join([str(c) for c in content])
            return str(content).strip()
        except Exception as e:
            # If generation fails, return a safe fallback
            print(f"Gemini generation failed: {e}")
            print(f"Falling back to raw workflow summary")
            # Extract a simple description from the prompt
            return f"Perform the task based on: {prompt[:200]}..."
