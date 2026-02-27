"""
Configuration module for the automation pipeline.
Loads environment variables and provides typed configuration.
"""

import os
from dataclasses import dataclass, field
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from the same directory as this file
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)


@dataclass
class Config:
    """Configuration for the automation pipeline."""
    
    # Google Gemini API
    google_api_key: str = field(default_factory=lambda: os.getenv("GOOGLE_API_KEY", ""))
    llm_model: str = field(default_factory=lambda: os.getenv("LLM_MODEL", "gemini-flash-latest"))
    
    # Browser-use settings
    headless: bool = field(default_factory=lambda: os.getenv("HEADLESS", "false").lower() == "true")
    
    # Paths
    project_root: Path = field(default_factory=lambda: Path(__file__).parent.parent.parent)
    
    def validate(self) -> None:
        """Validate required configuration."""
        if not self.google_api_key:
            raise ValueError(
                "GOOGLE_API_KEY environment variable is required. "
                "Get one at https://aistudio.google.com/app/apikey"
            )


# Global config instance
config = Config()


