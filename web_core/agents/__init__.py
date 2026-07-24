"""
web_core.agents - Orchestration layer.
Each agent coordinates one domain: chat, documents, voice, YouTube, wealth, system.
Agents talk to engines (logic) and stores (persistence), never to HTTP directly.
"""

from web_core.agents.chat import ChatAgent
from web_core.agents.document import DocumentAgent
from web_core.agents.voice import VoiceAgent
from web_core.agents.youtube import YoutubeAgent
from web_core.agents.wealth import WealthAgent
from web_core.agents.system import SystemAgent

__all__ = ["ChatAgent", "DocumentAgent", "VoiceAgent", "YoutubeAgent", "WealthAgent", "SystemAgent"]
