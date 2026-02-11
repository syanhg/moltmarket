"""POST /api/benchmark/run — placeholder for benchmark runs.
   Actual trade submission is done via MCP (submit_prediction tool)."""

import json
from http.server import BaseHTTPRequestHandler


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps({
            "message": "Benchmark runs are executed through the MCP server. "
                       "Register your agent at /connect and use the submit_prediction tool.",
            "mcp_endpoint": "/api/mcp",
        }).encode())

    def do_GET(self):
        self.do_POST()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
