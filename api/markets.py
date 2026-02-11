"""GET /api/markets — proxy to Polymarket CLOB markets list."""

import json
import sys
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Add lib_py to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from lib_py.polymarket import list_markets, get_market


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            params = parse_qs(urlparse(self.path).query)
            condition_id = params.get("id", [None])[0]

            if condition_id:
                data = get_market(condition_id)
            else:
                limit = int(params.get("limit", ["20"])[0])
                offset = int(params.get("offset", ["0"])[0])
                data = list_markets(limit=limit, offset=offset)

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
