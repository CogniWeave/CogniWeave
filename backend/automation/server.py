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

    class Config:
        populate_by_name = True


class AutomateRequest(BaseModel):
    """Request to automate a workflow."""
    workflow_id: str = "1"
    events: list[WorkflowEventModel]
    start_url: str = ""
    headless: bool = False
    enable_human_in_loop: bool = False


class TaskRequest(BaseModel):
    """Request to run automation from a task description."""
    task: str
    headless: bool = False
    enable_human_in_loop: bool = False


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


@app.post("/api/automate", response_model=AutomateResponse)
async def automate_workflow(request: AutomateRequest, background_tasks: BackgroundTasks):
    """
    Automate a workflow from recorded events.
    
    Converts workflow events to a task description using LLM,
    then executes the automation using browser-use.
    """
    try:
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
        
        # Generate task description
        llm_client = LLMClient()
        task_description = llm_client.generate_task_description(workflow)
        
        # Run automation
        runner = AutomationRunner(
            headless=request.headless,
            enable_human_in_loop=request.enable_human_in_loop,
            human_input_callback=human_input_manager.ask_human if request.enable_human_in_loop else None,
        )
        
        result = await runner.run_task(task_description)
        
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
        runner = AutomationRunner(
            headless=request.headless,
            enable_human_in_loop=request.enable_human_in_loop,
            human_input_callback=human_input_manager.ask_human if request.enable_human_in_loop else None,
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
