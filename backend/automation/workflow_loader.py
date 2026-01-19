"""
Workflow Loader module.
Parses CSV exports from the Task Mining extension and extracts workflow data.
"""

import csv
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class WorkflowEvent:
    """Represents a single event in a workflow."""
    
    event_type: str
    timestamp: int
    url: str
    title: str
    data: dict = field(default_factory=dict)
    
    @property
    def description(self) -> str:
        """Generate a human-readable description of this event."""
        if self.event_type == "click":
            element = self.data.get("element_type", "element")
            text = self.data.get("text", "")[:50] if self.data.get("text") else ""
            if text:
                return f"Clicked on {element} with text '{text}'"
            return f"Clicked on {element}"
        
        elif self.event_type == "input":
            field_name = self.data.get("field_name", "field")
            return f"Typed in {field_name}"
        
        elif self.event_type == "navigation" or self.event_type == "page_visit":
            return f"Navigated to {self.url}"
        
        elif self.event_type == "scroll":
            return "Scrolled on page"
        
        elif self.event_type == "focus":
            element = self.data.get("element_type", "element")
            return f"Focused on {element}"
        
        return f"Performed {self.event_type}"


@dataclass
class Workflow:
    """Represents a complete workflow session."""
    
    workflow_id: str
    events: list[WorkflowEvent] = field(default_factory=list)
    
    @property
    def start_url(self) -> str:
        """Get the starting URL of this workflow."""
        for event in self.events:
            if event.url:
                return event.url
        return ""
    
    @property
    def summary(self) -> str:
        """Generate a summary of the workflow actions."""
        # Filter out noise events
        significant_events = [
            e for e in self.events 
            if e.event_type in ("click", "input", "navigation", "page_visit")
        ]
        
        descriptions = [e.description for e in significant_events[:20]]  # Limit to 20 actions
        return "\n".join(f"{i+1}. {desc}" for i, desc in enumerate(descriptions))


class WorkflowLoader:
    """Loads and parses workflow data from CSV exports."""
    
    def __init__(self, csv_path: Path | str):
        self.csv_path = Path(csv_path)
        if not self.csv_path.exists():
            raise FileNotFoundError(f"CSV file not found: {self.csv_path}")
    
    def _unflatten_row(self, row: dict) -> dict:
        """Convert flattened dot-notation keys back to nested structure.
        
        The extension exports with flattened keys like 'data.element_type'.
        This converts them back to nested dicts like {'data': {'element_type': ...}}.
        """
        result = {}
        data = {}
        
        for key, value in row.items():
            # Skip None or empty keys
            if not key:
                continue
                
            if key.startswith("data."):
                # Extract the nested key
                nested_key = key[5:]  # Remove 'data.' prefix
                if "." in nested_key:
                    # Handle deeper nesting like data.dom_context.parent
                    parts = nested_key.split(".", 1)
                    if parts[0] not in data:
                        data[parts[0]] = {}
                    if isinstance(data[parts[0]], dict):
                        data[parts[0]][parts[1]] = value
                else:
                    data[nested_key] = value
            elif key.startswith("viewport."):
                # Handle viewport separately
                if "viewport" not in result:
                    result["viewport"] = {}
                result["viewport"][key[9:]] = value
            else:
                result[key] = value
        
        # Add data dict if it has content
        if data:
            result["data"] = data
        
        return result
    
    def load(self) -> list[Workflow]:
        """Load all workflows from the CSV file."""
        events_by_workflow: dict[str, list[WorkflowEvent]] = {}
        
        with open(self.csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                # Unflatten the row if it has dot-notation keys
                has_dot_keys = any("." in k for k in row.keys())
                if has_dot_keys:
                    row = self._unflatten_row(row)
                
                # Get workflow ID - extension uses numeric IDs like "1", "2"
                workflow_id = str(row.get("workflow_id", "default"))
                
                # Parse the data field if it's still a JSON string
                data = row.get("data", {})
                if isinstance(data, str):
                    try:
                        data = json.loads(data) if data else {}
                    except json.JSONDecodeError:
                        data = {}
                
                # Handle timestamp - might be string or int
                timestamp_val = row.get("timestamp", 0)
                try:
                    timestamp = int(float(timestamp_val)) if timestamp_val else 0
                except (ValueError, TypeError):
                    timestamp = 0
                
                event = WorkflowEvent(
                    event_type=row.get("event", row.get("event_type", "unknown")),
                    timestamp=timestamp,
                    url=row.get("url", ""),
                    title=row.get("title", ""),
                    data=data if isinstance(data, dict) else {},
                )
                
                if workflow_id not in events_by_workflow:
                    events_by_workflow[workflow_id] = []
                events_by_workflow[workflow_id].append(event)
        
        # Create Workflow objects
        workflows = []
        for wf_id, events in events_by_workflow.items():
            # Sort events by timestamp
            events.sort(key=lambda e: e.timestamp)
            workflows.append(Workflow(workflow_id=wf_id, events=events))
        
        return workflows
    
    def load_single(self, workflow_id: Optional[str] = None) -> Workflow:
        """Load a single workflow. If workflow_id is None, returns the first workflow."""
        workflows = self.load()
        
        if not workflows:
            raise ValueError("No workflows found in CSV file")
        
        if workflow_id:
            for wf in workflows:
                if wf.workflow_id == workflow_id:
                    return wf
            raise ValueError(f"Workflow with ID '{workflow_id}' not found")
        
        return workflows[0]
