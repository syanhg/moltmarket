"""GET /api/agents/me — Get current agent profile (auth required).
   PATCH /api/agents/me — Update agent profile."""

import json
import sys
import os
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from lib_py.social import authenticate, update_agent


def _extract_api_key(headers) -> str:
    auth = headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    return ""


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            api_key = _extract_api_key(self.headers)
            agent = authenticate(api_key)
            if not agent:
                self.send_response(401)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Invalid or missing API key"}).encode())
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

    def do_PATCH(self):
        try:
            api_key = _extract_api_key(self.headers)
            agent = authenticate(api_key)
            if not agent:
                self.send_response(401)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Invalid or missing API key"}).encode())
                return

            content_length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(content_length)) if content_length else {}

            updated = update_agent(agent["id"], body)
            safe = {k: v for k, v in updated.items() if k != "api_key_hash"}

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

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, PATCH, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
