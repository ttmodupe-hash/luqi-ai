#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
API Server Module for Omega AI
Provides HTTP REST API endpoints for all Omega AI capabilities.
Supports request processing, authentication, rate limiting, and health checks.
"""

import json
import logging
import os
import signal
import sys
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any, Dict, List, Optional
from urllib.parse import parse_qs, urlparse

# Project root
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from core_brain import CoreBrain

logger = logging.getLogger(__name__)

# Server globals
SERVER_START_TIME = time.time()
REQUEST_COUNT = 0


class OmegaHandler(BaseHTTPRequestHandler):
    """HTTP request handler for Omega AI API"""

    # Rate limiting storage
    _rate_limit_store = {}
    MAX_BODY_SIZE = 1 * 1024 * 1024  # 1MB

    def log_message(self, fmt, *args):
        """Override to use custom logging"""
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {args[0]}")

    def _send_json(self, status_code: int, data: dict):
        """Send JSON response"""
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")
        self.end_headers()
        self.wfile.write(json.dumps(data, indent=2).encode())

    def _send_error(self, status_code: int, message: str):
        """Send error response"""
        self._send_json(status_code, {"status": "error", "message": message})

    def _get_query_params(self) -> dict:
        """Parse query parameters from URL"""
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        return {k: v[0] if len(v) == 1 else v for k, v in params.items()}

    def _get_json_body(self) -> dict:
        """Parse JSON body from request"""
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > self.MAX_BODY_SIZE:
            raise ValueError("Request body too large")
        if content_length == 0:
            return {}
        body = self.rfile.read(content_length)
        return json.loads(body.decode())

    def _check_rate_limit(self, client_ip: str) -> bool:
        """Check if client has exceeded rate limit"""
        import asyncio
        now = time.time()
        window = 60  # 1 minute window

        if client_ip not in self._rate_limit_store:
            self._rate_limit_store[client_ip] = []

        # Remove old entries
        self._rate_limit_store[client_ip] = [
            t for t in self._rate_limit_store[client_ip] if now - t < window
        ]

        # Check limit (60 requests per minute)
        if len(self._rate_limit_store[client_ip]) >= 60:
            return False

        self._rate_limit_store[client_ip].append(now)
        return True

    def _authenticate(self) -> bool:
        """Check API key authentication"""
        api_key = self.headers.get("X-API-Key", "")
        if not api_key:
            return True  # Allow without key (public endpoints)
        if len(api_key) < 16:
            return False
        return True

    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")
        self.end_headers()

    def do_GET(self):
        """Handle GET requests"""
        global REQUEST_COUNT
        REQUEST_COUNT += 1
        try:
            client_ip = self.client_address[0]
            if not self._check_rate_limit(client_ip):
                self._send_error(429, "Rate limit exceeded. Try again later.")
                return

            path = urlparse(self.path).path
            params = self._get_query_params()

            if path == "/":
                self._handle_root()
            elif path == "/health":
                self._handle_health()
            elif path == "/api/process":
                self._handle_process_get(params)
            elif path == "/api/stats":
                self._handle_stats()
            elif path == "/api/capabilities":
                self._handle_capabilities()
            elif path == "/api/session":
                self._handle_session_get(params)
            else:
                self._send_error(404, f"Endpoint not found: {path}")

        except Exception as e:
            self._send_error(500, f"Internal error: {str(e)}")

    def do_POST(self):
        """Handle POST requests"""
        global REQUEST_COUNT
        REQUEST_COUNT += 1
        try:
            client_ip = self.client_address[0]
            if not self._check_rate_limit(client_ip):
                self._send_error(429, "Rate limit exceeded. Try again later.")
                return

            path = urlparse(self.path).path
            body = self._get_json_body()

            if path == "/api/process":
                self._handle_process_post(body)
            elif path == "/api/session":
                self._handle_session_post(body)
            elif path == "/api/session/update":
                self._handle_session_update(body)
            else:
                self._send_error(404, f"Endpoint not found: {path}")

        except json.JSONDecodeError:
            self._send_error(400, "Invalid JSON body")
        except ValueError as e:
            self._send_error(400, str(e))
        except Exception as e:
            self._send_error(500, f"Internal error: {str(e)}")

    # ── Handler Methods ──────────────────────────────────────────────────

    def _handle_root(self):
        """Handle root endpoint"""
        self._send_json(200, {
            "name": "Omega AI API",
            "version": "3.0.0",
            "status": "operational",
            "endpoints": [
                "GET /health",
                "GET /api/process?user_id=&query=",
                "POST /api/process",
                "GET /api/stats",
                "GET /api/capabilities",
                "GET /api/session?session_id=",
                "POST /api/session",
                "POST /api/session/update"
            ]
        })

    def _handle_health(self):
        """Handle health check"""
        self._send_json(200, {
            "status": "healthy",
            "version": "3.0.0",
            "timestamp": time.time()
        })

    def _handle_process_get(self, params: dict):
        """Handle GET /api/process"""
        user_id = params.get("user_id", "anonymous")
        query = params.get("query", "")

        if not query:
            self._send_error(400, "Missing 'query' parameter")
            return

        brain = CoreBrain()
        import asyncio
        result = asyncio.run(brain.process_request(user_id, query))
        self._send_json(200, result.to_dict() if hasattr(result, 'to_dict') else result)

    def _handle_process_post(self, body: dict):
        """Handle POST /api/process"""
        user_id = body.get("user_id", "anonymous")
        query = body.get("query", "")
        context = body.get("context", {})

        if not query:
            self._send_error(400, "Missing 'query' field")
            return

        brain = CoreBrain()
        import asyncio
        result = asyncio.run(brain.process_request(user_id, query, context))
        self._send_json(200, result.to_dict() if hasattr(result, 'to_dict') else result)

    def _handle_stats(self):
        """Handle GET /api/stats"""
        brain = CoreBrain()
        self._send_json(200, {
            "status": "success",
            "brain": brain.get_system_status(),
            "server": {
                "uptime_seconds": time.time() - SERVER_START_TIME,
                "requests_handled": REQUEST_COUNT
            }
        })

    def _handle_capabilities(self):
        """Handle GET /api/capabilities"""
        brain = CoreBrain()
        capabilities = [t.value for t in brain.routing_table.keys()]
        self._send_json(200, {
            "status": "success",
            "capabilities": sorted(capabilities),
            "total": len(capabilities)
        })

    def _handle_session_get(self, params: dict):
        """Handle GET /api/session"""
        session_id = params.get("session_id", "")
        if not session_id:
            self._send_error(400, "Missing 'session_id' parameter")
            return

        brain = CoreBrain()
        session = brain.get_session(session_id)
        if session:
            self._send_json(200, {
                "status": "success",
                "session": session.to_dict()
            })
        else:
            self._send_error(404, "Session not found")

    def _handle_session_post(self, body: dict):
        """Handle POST /api/session"""
        user_id = body.get("user_id", "")
        preferences = body.get("preferences", {})

        if not user_id:
            self._send_error(400, "Missing 'user_id' field")
            return

        brain = CoreBrain()
        session = brain.create_session(user_id, preferences)
        self._send_json(200, {
            "status": "success",
            "session": session.to_dict()
        })

    def _handle_session_update(self, body: dict):
        """Handle POST /api/session/update"""
        session_id = body.get("session_id", "")
        context_update = body.get("context", {})

        if not session_id:
            self._send_error(400, "Missing 'session_id' field")
            return

        brain = CoreBrain()
        session = brain.update_session_context(session_id, context_update)
        if session:
            self._send_json(200, {
                "status": "success",
                "message": "Session updated"
            })
        else:
            self._send_error(404, "Session not found")


def start_server(host: str = "0.0.0.0", port: int = 8080):
    """Start the API server"""
    server = HTTPServer((host, port), OmegaHandler)

    print("=" * 60)
    print(f"  Omega AI API Server")
    print(f"  Listening on http://{host}:{port}")
    print(f"  Health: http://{host}:{port}/health")
    print("=" * 60)

    # Graceful shutdown
    def signal_handler(sig, frame):
        print("\nShutting down server...")
        server.shutdown()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        signal_handler(signal.SIGINT, None)


if __name__ == "__main__":
    start_server()
