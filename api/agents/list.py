"""GET /api/agents/list — List all registered agents (public)."""

import json
import sys
import os
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from lib_py.social import list_agents


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            agents = list_agents()

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(agents).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
