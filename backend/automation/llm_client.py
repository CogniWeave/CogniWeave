"""
LLM Client module.
Uses GitHub Models API to convert workflow events into natural language task descriptions.
"""

import requests
from typing import Optional

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
    """Client for GitHub Models API to generate task descriptions."""
    
    def __init__(
        self,
        github_pat: Optional[str] = None,
        model: Optional[str] = None,
        endpoint: Optional[str] = None,
    ):
        self.github_pat = github_pat or config.github_pat
        self.model = model or config.llm_model
        self.endpoint = endpoint or config.github_models_endpoint
        
        if not self.github_pat:
            raise ValueError(
                "GitHub PAT is required. Set GITHUB_PAT environment variable or pass github_pat parameter."
            )
    
    def generate_task_description(self, workflow: Workflow) -> str:
        """Generate a natural language task description from a workflow."""
        
        # Build the user prompt from workflow summary
        user_prompt = f"""Here is a recorded browser workflow:

Starting URL: {workflow.start_url}

Actions performed:
{workflow.summary}

Generate a task description for an AI browser agent to replicate this workflow."""
        
        # Make API request
        headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {self.github_pat}",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
        }
        
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.3,  # Lower temperature for more consistent output
            "max_tokens": 500,
        }
        
        response = requests.post(
            self.endpoint,
            headers=headers,
            json=payload,
            timeout=30,
        )
        
        if response.status_code != 200:
            raise RuntimeError(
                f"GitHub Models API error: {response.status_code} - {response.text}"
            )
        
        result = response.json()
        
        # Extract the generated text
        choices = result.get("choices", [])
        if not choices:
            raise RuntimeError("No response generated from LLM")
        
        return choices[0]["message"]["content"].strip()
    
    def generate_from_summary(self, summary: str, start_url: str = "") -> str:
        """Generate a task description from a plain text summary."""
        
        user_prompt = f"""Here is a recorded browser workflow:

Starting URL: {start_url}

Actions performed:
{summary}

Generate a task description for an AI browser agent to replicate this workflow."""
        
        headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {self.github_pat}",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
        }
        
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.3,
            "max_tokens": 500,
        }
        
        response = requests.post(
            self.endpoint,
            headers=headers,
            json=payload,
            timeout=30,
        )
        
        if response.status_code != 200:
            raise RuntimeError(
                f"GitHub Models API error: {response.status_code} - {response.text}"
            )
        
        result = response.json()
        choices = result.get("choices", [])
        if not choices:
            raise RuntimeError("No response generated from LLM")
        
        return choices[0]["message"]["content"].strip()
