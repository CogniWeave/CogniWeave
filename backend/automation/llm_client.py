"""
LLM Client module.
Uses Google Gemini to convert workflow events into natural language task descriptions.
"""

import os
import json
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


WORKFLOW_STEPS_PROMPT = """You are a workflow analyzer for browser automation. Given a sequence of user actions recorded from a browser session, generate a structured step-by-step plan optimized for an AI browser automation agent (browser-use).

Your output MUST be valid JSON with this exact structure:
{
  "title": "A short, catchy 3-5 word title (e.g., 'Amazon Shoe Search', 'GitHub Login Flow')",
  "description": "A detailed task description written as instructions for a browser automation agent. Be specific and actionable.",
  "steps": [
    {"id": 1, "label": "Step description with specific details"},
    {"id": 2, "label": "Step description with specific details"}
  ],
  "required_inputs": [
    {"key": "unique_key", "label": "Human-readable label", "type": "text|password|email|code", "field_hint": "original field name/placeholder from recording"}
  ]
}

Guidelines for title:
- Keep it very short and memorable (3-5 words maximum)
- Capture the essence of what was done (e.g., "YouTube Video Search", "Twitter Profile Update")
- Use title case (capitalize main words)

Guidelines for description:
- Write as DIRECT INSTRUCTIONS for a browser automation agent
- Start with the URL to navigate to (e.g., "Go to https://example.com")
- Be specific about what to click, what to type, what to look for
- Use action verbs: "Navigate to", "Click on", "Enter", "Type", "Select", "Wait for"
- Include exact text of buttons/links when available
- For login flows: say "Enter the provided username in the email/username field" and "Enter the provided password in the password field"
- Reference input placeholders like {{username}}, {{password}}, {{auth_code}} for any user inputs

Guidelines for steps:
- Each step should be a clear, actionable instruction
- Include exact names of links, buttons, or menu items
- Use imperative mood (e.g., "Navigate to...", "Click on...", "Enter...")
- For input fields, reference the placeholder (e.g., "Enter {{username}} in the email field")

Guidelines for required_inputs (CRITICAL):
- Scan ALL events for input/form interactions
- Detect fields by looking at: field names, input types, placeholders, and entered values
- Common patterns to detect:
  * Email/username fields: type="email", name contains "email/user/login", placeholder contains "email/username"
  * Password fields: type="password", name contains "pass/pwd"
  * 2FA/OTP fields: name contains "otp/code/2fa/totp/authenticator", usually 6-digit inputs
  * Phone fields: type="tel", name contains "phone/mobile"
  * Search fields: type="search", name contains "search/query"
- EXCLUDE only Google.com search box from required_inputs (use the recorded search term directly)
- For EACH detected input field, create an entry in required_inputs with:
  * "key": a unique snake_case identifier (e.g., "login_email", "login_password", "auth_code")
  * "label": human-readable label (e.g., "Email Address", "Password", "2FA Code")
  * "type": one of "text", "password", "email", "code" (use "password" for passwords, "code" for OTP/2FA)
  * "field_hint": the original field name/placeholder from the recording to help identify it

Output ONLY the JSON object, no markdown code blocks, no explanations."""


class LLMClient:
    """Client for generating task descriptions using Gemini."""
    
    def __init__(
        self,
        model: Optional[str] = None,
        analysis_model: Optional[str] = None,
    ):
        self.model = model or config.llm_model
        self.analysis_model = analysis_model or "gemini-pro-latest"
        
        # Initialize Gemini
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY is required. Get one at https://aistudio.google.com/app/apikey")
        
        self.llm = ChatGoogleGenerativeAI(model=self.model, google_api_key=api_key)
        
        # Initialize a separate client for workflow step generation (uses the analysis model)
        self.llm_pro = ChatGoogleGenerativeAI(model=self.analysis_model, google_api_key=api_key)
    
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

    def generate_workflow_steps(self, events: list[dict], start_url: str = "") -> dict:
        """
        Generate a structured workflow description with steps from raw events.
        
        Uses gemini-pro for higher reasoning capability.
        
        Args:
            events: List of raw event dictionaries from the browser recording
            start_url: Optional starting URL
            
        Returns:
            dict with 'title', 'description', 'steps', and 'required_inputs' keys
        """
        # Format events for the prompt - include ALL details for input field detection
        events_summary = []
        input_fields_detected = []  # Track input fields for fallback
        
        for i, event in enumerate(events, 1):
            event_type = event.get('event_type', event.get('event', 'unknown'))
            url = event.get('url', '')
            title = event.get('title', '')
            data = event.get('data', {})
            raw = event.get('raw', {})
            automation = event.get('automation', {})
            
            # Build a readable event description with all available details
            if event_type in ['navigation', 'page_visit']:
                events_summary.append(f"{i}. Navigated to: {url} (Page: {title})")
            elif event_type == 'click':
                target_text = (
                    raw.get('text') or 
                    data.get('text') or 
                    data.get('target') or 
                    automation.get('tag', 'element')
                )
                xpath = automation.get('xpath', '')
                tag = automation.get('tag', '')
                events_summary.append(f"{i}. Clicked on: '{target_text}' ({tag} element) on page: {url}")
            elif event_type == 'input':
                # Extract detailed field information for input detection
                field_name = (
                    raw.get('fieldName') or 
                    data.get('fieldName') or
                    data.get('field') or 
                    data.get('target') or 
                    raw.get('field') or 
                    automation.get('selector', '') or
                    'unknown_field'
                )
                input_type = automation.get('inputType', data.get('type', raw.get('type', 'text')))
                value = data.get('value', raw.get('value', '[text entered]'))
                value_length = raw.get('length', len(str(value)) if value else 0)
                
                # Mask sensitive values in summary but note the field type
                is_password = input_type == 'password' or 'pass' in field_name.lower()
                is_email = input_type == 'email' or 'email' in field_name.lower() or '@' in str(value)
                is_otp = any(x in field_name.lower() for x in ['otp', 'code', '2fa', 'totp', 'auth', 'verify'])
                
                display_value = '[MASKED]' if is_password else value
                
                # Track this input field for fallback detection
                input_fields_detected.append({
                    'field_name': field_name,
                    'input_type': input_type,
                    'is_password': is_password,
                    'is_email': is_email,
                    'is_otp': is_otp,
                    'value_length': value_length,
                    'url': url
                })
                
                field_type_hint = ""
                if is_password:
                    field_type_hint = " [PASSWORD FIELD]"
                elif is_otp:
                    field_type_hint = " [2FA/OTP CODE FIELD]"
                elif is_email:
                    field_type_hint = " [EMAIL FIELD]"
                
                events_summary.append(
                    f"{i}. INPUT{field_type_hint}: Entered '{display_value}' "
                    f"(length: {value_length}) in field '{field_name}' "
                    f"(type: {input_type}) on page: {url}"
                )
            elif event_type == 'scroll':
                scroll_y = raw.get('y', data.get('y', 0))
                events_summary.append(f"{i}. Scrolled to position {scroll_y}px on page: {url} ({title})")
            elif event_type == 'keypress':
                key = raw.get('key', data.get('key', 'key'))
                events_summary.append(f"{i}. Pressed key: {key}")
            else:
                all_data = {**data, **raw}
                events_summary.append(f"{i}. {event_type} on {url}: {all_data}")
        
        events_text = "\n".join(events_summary) if events_summary else "No events recorded"
        
        user_prompt = f"""Here is a recorded browser workflow:

Starting URL: {start_url}

Detailed events (pay special attention to INPUT events marked with [PASSWORD FIELD], [EMAIL FIELD], [2FA/OTP CODE FIELD]):
{events_text}

IMPORTANT: 
1. Analyze these events carefully and detect ALL input fields that need user values.
2. For login/authentication flows, make sure to include username/email, password, and any 2FA fields in required_inputs.
3. Generate a description that uses placeholders like {{username}}, {{password}}, {{auth_code}} for the detected inputs.
4. The steps should reference these placeholders where values need to be entered.

Generate a structured workflow plan optimized for browser automation."""

        try:
            response = self.llm_pro.invoke([
                SystemMessage(content=WORKFLOW_STEPS_PROMPT),
                HumanMessage(content=user_prompt)
            ])
            content = response.content
            if isinstance(content, list):
                content = " ".join([str(c) for c in content])
            
            # Parse the JSON response
            content = str(content).strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
            
            result = json.loads(content)
            
            # Validate structure
            if "title" not in result:
                result["title"] = "Workflow"
            if "description" not in result:
                result["description"] = "Recorded workflow"
            if "steps" not in result:
                result["steps"] = []
            if "required_inputs" not in result:
                result["required_inputs"] = []
            
            # Ensure step IDs are sequential
            for i, step in enumerate(result["steps"], 1):
                step["id"] = i
                if "label" not in step:
                    step["label"] = f"Step {i}"
            
            # Fallback: If no required_inputs detected but we found input fields, add them
            if not result["required_inputs"] and input_fields_detected:
                result["required_inputs"] = self._generate_fallback_inputs(input_fields_detected)
            
            return result
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse workflow steps JSON: {e}")
            print(f"Raw response: {content}")
            # Return a fallback structure with detected inputs
            return {
                "title": "Workflow",
                "description": "Recorded workflow (AI analysis failed)",
                "steps": [{"id": i+1, "label": line} for i, line in enumerate(events_summary[:10])],
                "required_inputs": self._generate_fallback_inputs(input_fields_detected)
            }
        except Exception as e:
            print(f"Workflow steps generation failed: {e}")
            return {
                "title": "Workflow",
                "description": "Recorded workflow (AI analysis failed)",
                "steps": [{"id": i+1, "label": line} for i, line in enumerate(events_summary[:10])],
                "required_inputs": self._generate_fallback_inputs(input_fields_detected)
            }
    
    def _generate_fallback_inputs(self, input_fields: list[dict]) -> list[dict]:
        """Generate required_inputs from detected input fields as fallback."""
        required_inputs = []
        seen_keys = set()
        
        for field in input_fields:
            field_name = field['field_name'].lower()
            url = field.get('url', '').lower()
            
            # Skip only Google search fields (use recorded value directly)
            if 'google.com' in url and field.get('input_type') == 'search':
                continue
            if 'google' in field_name and 'search' in field_name:
                continue
            
            # Determine the key and label based on field characteristics
            if field['is_password']:
                key = 'password'
                label = 'Password'
                input_type = 'password'
            elif field['is_otp']:
                key = 'auth_code'
                label = '2FA / Authenticator Code'
                input_type = 'code'
            elif field['is_email'] or 'user' in field_name or 'login' in field_name:
                key = 'username'
                label = 'Username / Email'
                input_type = 'email'
            else:
                # Generic input field
                key = field_name.replace(' ', '_').replace('-', '_')[:20]
                label = field['field_name'].title()
                input_type = 'text'
            
            # Avoid duplicates
            if key not in seen_keys:
                seen_keys.add(key)
                required_inputs.append({
                    'key': key,
                    'label': label,
                    'type': input_type,
                    'field_hint': field['field_name']
                })
        
        return required_inputs
