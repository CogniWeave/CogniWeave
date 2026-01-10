"""
Configuration module for the automation pipeline.
Loads environment variables and provides typed configuration.
"""

import os
from dataclasses import dataclass, field
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root
load_dotenv()


@dataclass
class Config:
    """Configuration for the automation pipeline."""
    
    # GitHub Models API
    github_pat: str = field(default_factory=lambda: os.getenv("GITHUB_PAT", ""))
    github_models_endpoint: str = "https://models.github.ai/inference/chat/completions"
    llm_model: str = field(default_factory=lambda: os.getenv("LLM_MODEL", "openai/gpt-4o"))
    
    # Browser-use settings
    headless: bool = field(default_factory=lambda: os.getenv("HEADLESS", "false").lower() == "true")
    
    # Paths
    project_root: Path = field(default_factory=lambda: Path(__file__).parent.parent.parent)
    
    def validate(self) -> None:
        """Validate required configuration."""
        if not self.github_pat:
            raise ValueError(
                "GITHUB_PAT environment variable is required. "
                "Generate a PAT with 'models' scope at https://github.com/settings/tokens"
            )


# Global config instance
config = Config()
