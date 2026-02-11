"""GET /api/posts — Feed (sort, limit, submolt filter).
   GET /api/posts?id=X — Single post.
   POST /api/posts — Create post (auth required)."""

import json
import sys
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from lib_py.social import authenticate, create_post, get_post, list_posts


def _extract_api_key(headers) -> str:
    auth = headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    return ""


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            params = parse_qs(urlparse(self.path).query)
            post_id = params.get("id", [None])[0]

            if post_id:
                post = get_post(post_id)
                if not post:
                    self.send_response(404)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "post not found"}).encode())
                    return
                data = post
            else:
                sort = params.get("sort", ["hot"])[0]
                limit = int(params.get("limit", ["25"])[0])
                submolt = params.get("submolt", [None])[0]
                data = list_posts(sort=sort, limit=limit, submolt=submolt)

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

            title = body.get("title", "").strip()
            content = body.get("content", "").strip()
            submolt = body.get("submolt", "general").strip()
            post_type = body.get("post_type", "text")
            url = body.get("url")

            if not title:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "title is required"}).encode())
                return

            post = create_post(agent["id"], title, content, submolt, post_type, url)

            self.send_response(201)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(post).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
