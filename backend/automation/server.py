"""
Backend API server for the automation pipeline.
Provides HTTP endpoints for the extension to trigger automation.
"""

import json
import asyncio
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Optional
from concurrent.futures import ThreadPoolExecutor
import threading

from .config import config
from .llm_client import LLMClient
from .automation_runner import AutomationRunner
from .workflow_loader import Workflow, WorkflowEvent


class AutomationAPIHandler(BaseHTTPRequestHandler):
    """HTTP request handler for automation API."""
    
    def _send_json_response(self, status_code: int, data: dict):
        """Send a JSON response."""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests."""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        """Handle GET requests."""
        if self.path == '/health':
            self._send_json_response(200, {'status': 'ok', 'service': 'autopattern'})
        else:
            self._send_json_response(404, {'error': 'Not found'})
    
    def do_POST(self):
        """Handle POST requests."""
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')
        
        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            self._send_json_response(400, {'error': 'Invalid JSON'})
            return
        
        if self.path == '/automate-workflow':
            self._handle_automate_workflow(data)
        elif self.path == '/optimize-workflow':
            self._handle_optimize_workflow(data)
        elif self.path == '/generate-description':
            self._handle_generate_description(data)
        else:
            self._send_json_response(404, {'error': 'Endpoint not found'})
    
    def _handle_automate_workflow(self, data: dict):
        """Handle workflow automation request."""
        events_data = data.get('events', [])
        workflow_id = data.get('workflowId', 'unknown')
        
        if not events_data:
            self._send_json_response(400, {'error': 'No events provided'})
            return
        
        try:
            # Convert events to WorkflowEvent objects
            events = []
            for e in events_data:
                # Map extension format (automation/raw) to backend format (data)
                automation = e.get('automation', {})
                raw = e.get('raw', {})
                mapped_data = {
                    'element_type': automation.get('tag', 'element'),
                    'text': raw.get('text', ''),
                    'value': raw.get('value', ''),
                    'selector': automation.get('selector'),
                    'xpath': automation.get('xpath'),
                    'field_name': raw.get('fieldName') or automation.get('selector') or automation.get('tag'),
                }
                events.append(WorkflowEvent(
                    event_type=e.get('event', 'unknown'),
                    timestamp=e.get('timestamp', 0),
                    url=e.get('url', ''),
                    title=e.get('title', ''),
                    data=mapped_data,
                ))
            
            workflow = Workflow(workflow_id=str(workflow_id), events=events)
            
            print(f"📥 Received {len(events)} events for workflow {workflow_id}")
            if events:
                print(f"🔍 First event type: {events[0].event_type}, data keys: {list(events[0].data.keys())}")
            
            # Generate task description
            try:
                config.validate()
                llm_client = LLMClient()
                task_description = llm_client.generate_task_description(workflow)
            except Exception as e:
                print(f"⚠️ LLM task generation failed: {e}")
                print(f"🔄 Falling back to raw workflow summary")
                task_description = f"Perform the high-level task represented by these actions: {workflow.summary}"
            
            # Run automation in a separate thread to avoid event loop conflicts
            def run_in_thread():
                """Run async code in a separate thread with its own event loop."""
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    runner = AutomationRunner()
                    return loop.run_until_complete(runner.run_task(task_description))
                finally:
                    loop.close()
            
            # Execute in thread pool
            print(f"\n🎯 Executing automation for workflow: {workflow_id}")
            print(f"📝 Task description: {task_description}")
            
            with ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(run_in_thread)
                result = future.result(timeout=300)  # 5 minute timeout
            
            print(f"\n✅ Automation result: Success={result['success']}")
            if result.get('error'):
                print(f"❌ Error: {result['error']}")
            
            # Convert history to string if it's not JSON serializable
            history = result.get('history')
            if history is not None:
                try:
                    json.dumps(history)  # Test if serializable
                except (TypeError, ValueError):
                    history = str(history)  # Convert to string if not
            
            self._send_json_response(200, {
                'success': result['success'],
                'task_description': task_description,
                'error': result.get('error'),
                'history': history,
            })
            
        except Exception as e:
            import traceback
            error_traceback = traceback.format_exc()
            print(f"❌ Error in automate_workflow: {e}")
            print(error_traceback)
            self._send_json_response(500, {
                'success': False,
                'error': str(e),
                'traceback': error_traceback,
            })
    
    def _handle_optimize_workflow(self, data: dict):
        """Handle workflow optimization request (placeholder)."""
        # This is already handled by existing code
        self._send_json_response(200, {
            'goal': 'Workflow optimization',
            'originalSteps': [],
            'optimizedSteps': [],
            'explanation': 'Optimization endpoint - requires LLM configuration',
            'confidence': 0,
        })
    
    def _handle_generate_description(self, data: dict):
        """Generate a task description without running automation."""
        events_data = data.get('events', [])
        workflow_id = data.get('workflowId', 'unknown')
        
        if not events_data:
            self._send_json_response(400, {'error': 'No events provided'})
            return
        
        try:
            events = []
            for e in events_data:
                # Map extension format (automation/raw) to backend format (data)
                automation = e.get('automation', {})
                raw = e.get('raw', {})
                mapped_data = {
                    'element_type': automation.get('tag', 'element'),
                    'text': raw.get('text', ''),
                    'value': raw.get('value', ''),
                    'selector': automation.get('selector'),
                    'xpath': automation.get('xpath'),
                    'field_name': raw.get('fieldName') or automation.get('selector') or automation.get('tag'),
                }
                events.append(WorkflowEvent(
                    event_type=e.get('event', 'unknown'),
                    timestamp=e.get('timestamp', 0),
                    url=e.get('url', ''),
                    title=e.get('title', ''),
                    data=mapped_data,
                ))
            
            workflow = Workflow(workflow_id=str(workflow_id), events=events)
            
            config.validate()
            llm_client = LLMClient()
            task_description = llm_client.generate_task_description(workflow)
            
            self._send_json_response(200, {
                'success': True,
                'task_description': task_description,
            })
            
        except Exception as e:
            self._send_json_response(500, {
                'success': False,
                'error': str(e),
            })
    
    def log_message(self, format, *args):
        """Custom log format."""
        print(f"[API] {self.address_string()} - {format % args}")


def run_server(host: str = 'localhost', port: int = 5001):
    """Run the API server."""
    server = HTTPServer((host, port), AutomationAPIHandler)
    print(f"\n🚀 Automation API server running at http://{host}:{port}")
    print(f"   Endpoints:")
    print(f"   - POST /automate-workflow")
    print(f"   - POST /generate-description")
    print(f"   - POST /optimize-workflow")
    print(f"\n   Press Ctrl+C to stop\n")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\n⚠️  Server stopped")
        server.shutdown()


if __name__ == '__main__':
    run_server()
