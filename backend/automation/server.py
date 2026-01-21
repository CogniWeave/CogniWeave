"""
FastAPI server for AutoPattern automation.

Provides REST API and WebSocket endpoints for browser automation.
"""

import asyncio
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import config
from .workflow_loader import WorkflowLoader, Workflow, WorkflowEvent
from .llm_client import LLMClient
from .automation_runner import AutomationRunner


# ============================================================================
# Pydantic Models
# ============================================================================

class WorkflowEventModel(BaseModel):
    """Single workflow event from the extension."""
    event: str = Field(alias="event_type", default="unknown")
    timestamp: int = 0
    url: str = ""
    title: str = ""
    data: dict = Field(default_factory=dict)
    raw: dict = Field(default_factory=dict)
    automation: dict = Field(default_factory=dict)

    class Config:
        populate_by_name = True


class AutomateRequest(BaseModel):
    """Request to automate a workflow."""
    workflow_id: str = "1"
    events: list[WorkflowEventModel] = Field(default_factory=list)
    start_url: str = ""
    headless: bool = False
    enable_human_in_loop: bool = False
    # Optional: pre-generated task description (bypasses LLM generation if provided)
    task_description: Optional[str] = None
    # Optional: user-provided input values for form fields (username, password, etc.)
    input_values: Optional[dict[str, str]] = None


class TaskRequest(BaseModel):
    """Request to run automation from a task description."""
    task: str
    headless: bool = False
    enable_human_in_loop: bool = False
    # Optional: user-provided input values for form fields
    input_values: Optional[dict[str, str]] = None


class DescribeRequest(BaseModel):
    """Request to describe/analyze workflow events."""
    events: list[WorkflowEventModel]
    start_url: str = ""


class DescribeResponse(BaseModel):
    """Response from describe endpoint with structured workflow plan."""
    title: str
    description: str
    steps: list[dict]
    required_inputs: list[dict] = Field(default_factory=list)


class AutomateResponse(BaseModel):
    """Response from automation endpoint."""
    success: bool
    task_description: str = ""
    message: str = ""
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "ok"
    version: str = "0.2.0"


class SettingsModel(BaseModel):
    """Application settings."""
    llm_model: str = "gemini-flash-latest"
    analysis_model: str = "gemini-pro-latest"
    headless: bool = False
    enable_human_in_loop: bool = False


class SettingsResponse(BaseModel):
    """Settings response."""
    settings: SettingsModel
    available_models: list[str] = []


# ============================================================================
# WebSocket Manager for Human-in-the-Loop
# ============================================================================

class HumanInputManager:
    """Manages WebSocket connections for human-in-the-loop interactions."""
    
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.pending_questions: dict[str, asyncio.Future] = {}
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
    
    async def ask_human(self, question: str, timeout: float = 300.0) -> str:
        """Ask a question to connected humans and wait for response."""
        if not self.active_connections:
            # Fallback to console input if no WebSocket connections
            loop = asyncio.get_running_loop()
            print(f"\n🤔 Agent needs help: {question}")
            return await loop.run_in_executor(None, input, "> ")
        
        question_id = str(id(question))
        future = asyncio.get_event_loop().create_future()
        self.pending_questions[question_id] = future
        
        # Broadcast question to all connected clients
        message = {"type": "question", "id": question_id, "question": question}
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass
        
        try:
            # Wait for response with timeout
            answer = await asyncio.wait_for(future, timeout=timeout)
            return answer
        except asyncio.TimeoutError:
            return "No response received (timeout)"
        finally:
            self.pending_questions.pop(question_id, None)
    
    def receive_answer(self, question_id: str, answer: str):
        """Receive an answer from a human."""
        if question_id in self.pending_questions:
            self.pending_questions[question_id].set_result(answer)


# Global manager instance
human_input_manager = HumanInputManager()


# ============================================================================
# FastAPI App
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    print("🚀 AutoPattern API server starting...")
    yield
    print("👋 AutoPattern API server shutting down...")


app = FastAPI(
    title="AutoPattern API",
    description="Browser automation powered by AI",
    version="0.2.0",
    lifespan=lifespan,
)

# CORS middleware for extension integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow extension access
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Endpoints
# ============================================================================

@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse()


# Available Gemini models
AVAILABLE_MODELS = [
    "gemini-flash-latest",
    "gemini-pro-latest",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash",
]

# Runtime settings (can be modified via API)
runtime_settings = SettingsModel(
    llm_model=config.llm_model,
    headless=config.headless,
    enable_human_in_loop=config.enable_human_in_loop,
)


@app.get("/api/settings", response_model=SettingsResponse)
async def get_settings():
    """Get current settings."""
    return SettingsResponse(
        settings=runtime_settings,
        available_models=AVAILABLE_MODELS,
    )


@app.put("/api/settings", response_model=SettingsResponse)
async def update_settings(new_settings: SettingsModel):
    """Update settings."""
    global runtime_settings
    runtime_settings = new_settings
    
    # Update config object for components that use it
    config.llm_model = new_settings.llm_model
    config.headless = new_settings.headless
    config.enable_human_in_loop = new_settings.enable_human_in_loop
    
    return SettingsResponse(
        settings=runtime_settings,
        available_models=AVAILABLE_MODELS,
    )


@app.post("/api/describe", response_model=DescribeResponse)
async def describe_workflow(request: DescribeRequest):
    """
    Analyze workflow events and generate a structured description.
    
    Uses gemini-pro for high reasoning capability to convert raw events
    into a human-readable step-by-step plan that can be edited before execution.
    Also detects required input fields (username, password, 2FA, etc.).
    """
    try:
        # Convert events to dict format with all available data
        # Merge data and raw fields for backwards compatibility
        events = []
        for e in request.events:
            # Combine data and raw - raw takes precedence as it's the new format
            combined_data = {**e.data, **e.raw}
            events.append({
                "event_type": e.event,
                "timestamp": e.timestamp,
                "url": e.url,
                "title": e.title,
                "data": combined_data,
                "raw": e.raw,
                "automation": e.automation,
            })
        
        # Generate structured workflow steps using current settings
        llm_client = LLMClient(
            model=runtime_settings.llm_model,
            analysis_model=runtime_settings.analysis_model
        )
        result = llm_client.generate_workflow_steps(events, request.start_url)
        
        return DescribeResponse(
            title=result.get("title", "Workflow"),
            description=result.get("description", ""),
            steps=result.get("steps", []),
            required_inputs=result.get("required_inputs", [])
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/automate", response_model=AutomateResponse)
async def automate_workflow(request: AutomateRequest, background_tasks: BackgroundTasks):
    """
    Automate a workflow from recorded events.
    
    If task_description is provided, uses it directly.
    Otherwise, converts workflow events to a task description using LLM,
    then executes the automation using browser-use.
    
    input_values can contain user-provided credentials that will be passed
    to browser-use as sensitive_data for automatic form filling.
    """
    try:
        # If task_description is provided, use it directly (Human-in-the-Middle flow)
        if request.task_description:
            task_description = request.task_description
        else:
            # Convert request events to Workflow object
            events = [
                WorkflowEvent(
                    event_type=e.event,
                    timestamp=e.timestamp,
                    url=e.url,
                    title=e.title,
                    data=e.data,
                )
                for e in request.events
            ]
            
            workflow = Workflow(workflow_id=request.workflow_id, events=events)
            
            # Override start_url if provided
            if request.start_url:
                # Insert a navigation event at the start
                events.insert(0, WorkflowEvent(
                    event_type="navigation",
                    timestamp=0,
                    url=request.start_url,
                    title="",
                    data={},
                ))
            
            # Generate task description using LLM with current settings
            llm_client = LLMClient(
                model=runtime_settings.llm_model,
                analysis_model=runtime_settings.analysis_model
            )
            task_description = llm_client.generate_task_description(workflow)
        
        # Prepare sensitive_data from input_values if provided
        sensitive_data = None
        if request.input_values:
            sensitive_data = request.input_values
            # Also inject values into task description using placeholders
            for key, value in request.input_values.items():
                placeholder = "{{" + key + "}}"
                # Use a safe placeholder format that browser-use understands
                task_description = task_description.replace(placeholder, f"<secret>{key}</secret>")
        
        # Run automation with current settings and sensitive data
        runner = AutomationRunner(
            headless=request.headless if request.headless else runtime_settings.headless,
            enable_human_in_loop=request.enable_human_in_loop if request.enable_human_in_loop else runtime_settings.enable_human_in_loop,
            human_input_callback=human_input_manager.ask_human if (request.enable_human_in_loop or runtime_settings.enable_human_in_loop) else None,
        )
        
        result = await runner.run_task(task_description, sensitive_data=sensitive_data)
        
        return AutomateResponse(
            success=result["success"],
            task_description=task_description,
            message="Automation completed" if result["success"] else "Automation failed",
            error=result.get("error"),
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/automate/task", response_model=AutomateResponse)
async def automate_task(request: TaskRequest):
    """
    Run automation directly from a task description.
    
    Skips the LLM task generation step and executes the provided task directly.
    """
    try:
        # Use request settings with fallback to runtime settings
        use_headless = request.headless if request.headless else runtime_settings.headless
        use_human_loop = request.enable_human_in_loop if request.enable_human_in_loop else runtime_settings.enable_human_in_loop
        
        runner = AutomationRunner(
            headless=use_headless,
            enable_human_in_loop=use_human_loop,
            human_input_callback=human_input_manager.ask_human if use_human_loop else None,
        )
        
        result = await runner.run_task(request.task)
        
        return AutomateResponse(
            success=result["success"],
            task_description=request.task,
            message="Automation completed" if result["success"] else "Automation failed",
            error=result.get("error"),
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/ws/automation")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for human-in-the-loop interactions.
    
    Connects clients to receive questions from the automation agent
    and send back human responses.
    """
    await human_input_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "answer":
                question_id = data.get("id")
                answer = data.get("answer", "")
                human_input_manager.receive_answer(question_id, answer)
                
    except WebSocketDisconnect:
        human_input_manager.disconnect(websocket)


# ============================================================================
# Server Runner
# ============================================================================

def run_server(host: str = "0.0.0.0", port: int = 5001):
    """Run the FastAPI server."""
    import uvicorn
    uvicorn.run(app, host=host, port=port)
