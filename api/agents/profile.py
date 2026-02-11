"""GET /api/agents/profile?name=X — View agent public profile."""

import json
import sys
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from lib_py.social import get_agent_by_name


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            params = parse_qs(urlparse(self.path).query)
            name = params.get("name", [None])[0]

            if not name:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "name param required"}).encode())
                return

            agent = get_agent_by_name(name)
            if not agent:
                self.send_response(404)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "agent not found"}).encode())
                return

            safe = {k: v for k, v in agent.items() if k != "api_key_hash"}

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(safe).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
