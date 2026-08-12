"""Nemotron Provider - NVIDIA Nemotron model integration for LUQI AI v29.1.0"""
import os
import json
import asyncio
from typing import List, Dict, Any, Optional, AsyncGenerator
from dataclasses import dataclass
from datetime import datetime


@dataclass
class NemotronConfig:
    model_name: str = "nvidia/nemotron-4-340b-instruct"
    api_key: str = ""
    base_url: str = "https://integrate.api.nvidia.com/v1"
    max_tokens: int = 1024
    temperature: float = 0.7
    top_p: float = 0.9
    timeout: int = 60


class NemotronProvider:
    """Provider for NVIDIA Nemotron models via NVIDIA API."""

    def __init__(self, config: Optional[NemotronConfig] = None):
        self.config = config or NemotronConfig()
        self.config.api_key = self.config.api_key or os.environ.get("NVIDIA_API_KEY", "")
        self._session = None
        self._usage_stats = {
            "total_requests": 0,
            "total_tokens": 0,
            "errors": 0,
            "last_request": None,
        }

    async def _get_session(self):
        if self._session is None:
            import aiohttp
            self._session = aiohttp.ClientSession(
                headers={
                    "Authorization": f"Bearer {self.config.api_key}",
                    "Content-Type": "application/json",
                },
                timeout=aiohttp.ClientTimeout(total=self.config.timeout),
            )
        return self._session

    async def generate(
        self,
        messages: List[Dict[str, str]],
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        stream: bool = False,
    ) -> Dict[str, Any]:
        """Generate a completion using Nemotron."""
        session = await self._get_session()
        
        payload = {
            "model": self.config.model_name,
            "messages": messages,
            "max_tokens": max_tokens or self.config.max_tokens,
            "temperature": temperature or self.config.temperature,
            "top_p": self.config.top_p,
            "stream": stream,
        }
        
        try:
            async with session.post(
                f"{self.config.base_url}/chat/completions",
                json=payload,
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    self._usage_stats["errors"] += 1
                    return {
                        "success": False,
                        "error": f"API error {response.status}: {error_text}",
                    }
                
                data = await response.json()
                self._usage_stats["total_requests"] += 1
                self._usage_stats["last_request"] = datetime.utcnow().isoformat()
                
                if "usage" in data:
                    self._usage_stats["total_tokens"] += data["usage"].get("total_tokens", 0)
                
                return {
                    "success": True,
                    "content": data["choices"][0]["message"]["content"],
                    "usage": data.get("usage", {}),
                    "model": data.get("model", self.config.model_name),
                }
        except Exception as e:
            self._usage_stats["errors"] += 1
            return {"success": False, "error": str(e)}

    async def stream_generate(
        self,
        messages: List[Dict[str, str]],
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
    ) -> AsyncGenerator[str, None]:
        """Stream a completion using Nemotron."""
        session = await self._get_session()
        
        payload = {
            "model": self.config.model_name,
            "messages": messages,
            "max_tokens": max_tokens or self.config.max_tokens,
            "temperature": temperature or self.config.temperature,
            "top_p": self.config.top_p,
            "stream": True,
        }
        
        try:
            async with session.post(
                f"{self.config.base_url}/chat/completions",
                json=payload,
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    yield json.dumps({"error": f"API error {response.status}: {error_text}"})
                    return
                
                async for line in response.content:
                    line = line.decode("utf-8").strip()
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            if "choices" in data and data["choices"]:
                                delta = data["choices"][0].get("delta", {})
                                if "content" in delta:
                                    yield delta["content"]
                        except json.JSONDecodeError:
                            pass
        except Exception as e:
            yield json.dumps({"error": str(e)})

    async def embed(self, texts: List[str]) -> Dict[str, Any]:
        """Generate embeddings for texts."""
        session = await self._get_session()
        
        payload = {
            "input": texts,
            "model": "nvidia/nv-embedqa-e5-v5",
        }
        
        try:
            async with session.post(
                f"{self.config.base_url}/embeddings",
                json=payload,
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    return {"success": False, "error": f"API error {response.status}: {error_text}"}
                
                data = await response.json()
                return {
                    "success": True,
                    "embeddings": [item["embedding"] for item in data["data"]],
                    "usage": data.get("usage", {}),
                }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_stats(self) -> Dict[str, Any]:
        """Get usage statistics."""
        return self._usage_stats.copy()

    async def close(self):
        """Close the HTTP session."""
        if self._session:
            await self._session.close()
            self._session = None


# Global provider instance
nemotron_provider = NemotronProvider()
