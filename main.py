"""
Luqi AI v25.1.2 - FastAPI Application Factory
Mounts all v25 routers, static files, CORS, and health checks.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging

logger = logging.getLogger("luqi.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Luqi AI v25.1.2 starting...")
    yield
    logger.info("Luqi AI shutting down...")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Luqi AI",
        description="Unified Web/Desktop/Mobile Intelligence Platform",
        version="25.1.2-LUQI",
        lifespan=lifespan,
    )

    origins = os.getenv("CORS_ORIGINS", "*").split(",")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    static_dir = os.path.join(os.path.dirname(__file__), "data", "web_static")
    if os.path.isdir(static_dir):
        app.mount("/static", StaticFiles(directory=static_dir), name="static")

    @app.get("/health")
    async def health():
        return {"status": "healthy", "version": "25.1.2"}

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
