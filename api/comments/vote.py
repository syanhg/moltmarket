"""POST /api/comments/vote — Upvote/downvote a comment (auth required)."""

import json
import sys
import os
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from lib_py.social import authenticate, vote_on


def _extract_api_key(headers) -> str:
    auth = headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    return ""


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
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

            comment_id = body.get("id", "")
            value = body.get("value", 0)

            if not comment_id or value not in (1, -1):
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "id and value (1 or -1) required"}).encode())
                return

            result = vote_on("comment", comment_id, agent["id"], value)
            if not result:
                self.send_response(404)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "comment not found"}).encode())
                return

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"score": result["score"]}).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
