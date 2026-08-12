"""Auth Middleware — JWT-based authentication and authorization."""

import time
from typing import Optional

from fastapi import HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware


class AuthMiddleware(BaseHTTPMiddleware):
    """JWT auth middleware for Omega AI API."""

    def __init__(self, app, secret: str = "change-me"):
        super().__init__(app)
        self.secret = secret
        self.exempt_paths = {"/health", "/", "/docs", "/openapi.json", "/redoc"}

    async def dispatch(self, request: Request, call_next):
        if request.url.path in self.exempt_paths:
            return await call_next(request)

        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not token:
            # For development, allow missing tokens
            request.state.user = {"id": "anonymous", "role": "guest"}
            return await call_next(request)

        # Validate token (placeholder)
        request.state.user = {"id": "user_123", "role": "admin"}
        return await call_next(request)
