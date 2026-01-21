"""
Automation Runner module.
Uses browser-use to execute tasks based on LLM-generated descriptions.
"""

import asyncio
import os
from typing import Optional, Callable, Awaitable

from .config import config


# System prompt for human-in-the-loop mode
HUMAN_IN_LOOP_SYSTEM_PROMPT = """IMPORTANT: You have access to a tool called 'ask_human' that allows you to request input from a human operator.

You MUST use the 'ask_human' tool in the following situations:
1. When you encounter a login form or need to enter a username/email
2. When you need to enter a password
3. When you encounter 2FA/MFA, OTP, or authenticator code inputs
4. When you need to enter any sensitive information (credit card, SSN, etc.)
5. When you encounter a CAPTCHA that requires human verification
6. When you're unsure about what action to take
7. When you need confirmation before proceeding with a critical action

NEVER try to guess or skip credential fields. ALWAYS ask the human for:
- Usernames and emails
- Passwords
- Authentication codes (2FA, OTP, authenticator apps)
- Security questions
- Any verification codes

When asking for input, be specific about what field you need filled. For example:
- "I found a username/email field on the login page. Please provide the username or email to enter."
- "I found a password field. Please provide the password to enter."
- "There is a 2FA/authenticator code field. Please provide the 6-digit code from your authenticator app."
"""


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
            
            @tools.action(
                'Ask human for input. MUST be used for login credentials, passwords, 2FA codes, authenticator codes, '
                'and any sensitive information. Also use when you need clarification or approval.'
            )
            async def ask_human(question: str) -> ActionResult:
                """
                Ask the human operator for input or help.
                
                Args:
                    question: The question to ask. Be specific about what field/input you need.
                             Examples: "Please provide the username for the login form"
                                      "Please provide the password"
                                      "Please provide the 2FA code from your authenticator app"
                """
                if callback:
                    # Use provided callback (e.g., WebSocket for server mode)
                    print(f"\n🤔 Asking human via WebSocket: {question}")
                    answer = await callback(question)
                    print(f"   Human responded with {len(answer)} characters")
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
            
            print("👤 Human-in-the-loop enabled - agent will ask for credentials and sensitive input")
        
        return tools
    
    def _enhance_task_for_human_loop(self, task_description: str) -> str:
        """Add human-in-loop instructions to the task description."""
        if not self.enable_human_in_loop:
            return task_description
        
        human_loop_instructions = """

IMPORTANT INSTRUCTIONS FOR THIS TASK:
- When you encounter login forms, username fields, email fields, password fields, 2FA/OTP inputs, or authenticator code fields, you MUST use the 'ask_human' tool to get the values from the human operator.
- Do NOT skip or guess any credential fields.
- Do NOT try to bypass authentication.
- For each sensitive field, ask the human specifically what value to enter.
- Wait for the human response before proceeding.
"""
        return task_description + human_loop_instructions
    
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
        
        # Create tools (with optional human-in-the-loop)
        tools = self._create_tools()
        
        # Enhance task description with human-in-loop instructions (only if no sensitive_data provided)
        if not sensitive_data:
            enhanced_task = self._enhance_task_for_human_loop(task_description)
        else:
            enhanced_task = task_description
        
        # Build extend_system_message for human-in-loop mode
        extend_system_message = None
        if self.enable_human_in_loop and not sensitive_data:
            extend_system_message = HUMAN_IN_LOOP_SYSTEM_PROMPT
        
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
            # Add system message extension for human-in-loop instructions
            extend_system_message=extend_system_message,
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
            print(f"   Human-in-Loop: {self.enable_human_in_loop}")
            print(f"   Sensitive Data: {'Yes - ' + str(len(sensitive_data)) + ' values' if sensitive_data else 'No'}")
            if self.enable_human_in_loop and not sensitive_data:
                print(f"   ℹ️  Agent will prompt for credentials via WebSocket/console")
            
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
    enable_human_in_loop: bool = False,
) -> dict:
    """Convenience function to run a single automation task."""
    runner = AutomationRunner(
        headless=headless,
        enable_human_in_loop=enable_human_in_loop,
    )
    return await runner.run_task(task_description)

