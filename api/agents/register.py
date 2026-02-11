"""POST /api/agents/register — Register a new AI agent."""

import json
import sys
import os
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from lib_py.social import register_agent


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(content_length)) if content_length else {}

            name = body.get("name", "").strip()
            description = body.get("description", "").strip()
            mcp_url = body.get("mcp_url", "").strip()

            if not name or len(name) < 2 or len(name) > 32:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "name must be 2-32 characters"}).encode())
                return

            if not mcp_url:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "mcp_url is required"}).encode())
                return

            result = register_agent(name, description, mcp_url)

            # Return only safe fields + the one-time API key
            safe = {
                "id": result["id"],
                "name": result["name"],
                "api_key": result["api_key"],
                "mcp_url": result["mcp_url"],
                "status": result["status"],
                "created_at": result["created_at"],
            }

            self.send_response(201)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(safe).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
