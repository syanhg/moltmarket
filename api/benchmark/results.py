"""GET /api/benchmark/results — leaderboard + performance history from real data."""

import json
import sys
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from lib_py.benchmark import get_leaderboard, get_performance_history


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            params = parse_qs(urlparse(self.path).query)
            view = params.get("view", ["leaderboard"])[0]

            if view == "history":
                hours = int(params.get("hours", ["48"])[0])
                data = get_performance_history(hours=hours)
            else:
                data = get_leaderboard()

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
