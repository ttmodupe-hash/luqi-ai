"""Omega Capabilities - Advanced AI capabilities for LUQI AI v29.1.0"""
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum


class CapabilityType(Enum):
    REASONING = "reasoning"
    CODING = "coding"
    VISION = "vision"
    AUDIO = "audio"
    MULTIMODAL = "multimodal"
    AGENT = "agent"
    MEMORY = "memory"
    TOOLS = "tools"


@dataclass
class Capability:
    name: str
    capability_type: CapabilityType
    description: str
    enabled: bool = True
    config: Dict[str, Any] = None
    version: str = "1.0"

    def __post_init__(self):
        if self.config is None:
            self.config = {}


class OmegaCapabilities:
    """Manages advanced AI capabilities for LUQI AI."""

    def __init__(self):
        self.capabilities: Dict[str, Capability] = {}
        self._register_default_capabilities()

    def _register_default_capabilities(self):
        """Register default capabilities."""
        defaults = [
            Capability(
                name="advanced_reasoning",
                capability_type=CapabilityType.REASONING,
                description="Chain-of-thought and multi-step reasoning",
                config={"max_steps": 10, "temperature": 0.3},
            ),
            Capability(
                name="code_generation",
                capability_type=CapabilityType.CODING,
                description="Generate and edit code in multiple languages",
                config={"languages": ["python", "javascript", "typescript", "go", "rust"]},
            ),
            Capability(
                name="image_understanding",
                capability_type=CapabilityType.VISION,
                description="Analyze and describe images",
                config={"max_resolution": 4096, "supported_formats": ["png", "jpg", "webp"]},
            ),
            Capability(
                name="speech_recognition",
                capability_type=CapabilityType.AUDIO,
                description="Transcribe and understand speech",
                config={"languages": ["en", "es", "fr", "de", "zh"]},
            ),
            Capability(
                name="multimodal_fusion",
                capability_type=CapabilityType.MULTIMODAL,
                description="Combine text, image, and audio inputs",
                config={"fusion_mode": "attention"},
            ),
            Capability(
                name="autonomous_agent",
                capability_type=CapabilityType.AGENT,
                description="Self-directed task execution with planning",
                config={"max_iterations": 50, "tool_timeout": 30},
            ),
            Capability(
                name="long_term_memory",
                capability_type=CapabilityType.MEMORY,
                description="Persistent memory across conversations",
                config={"storage": "vector_db", "retrieval_k": 5},
            ),
            Capability(
                name="tool_orchestration",
                capability_type=CapabilityType.TOOLS,
                description="Dynamic tool selection and execution",
                config={"max_tools_per_call": 10, "retry_attempts": 3},
            ),
        ]
        for cap in defaults:
            self.capabilities[cap.name] = cap

    def get(self, name: str) -> Optional[Capability]:
        """Get a capability by name."""
        return self.capabilities.get(name)

    def list_all(self) -> List[Capability]:
        """List all capabilities."""
        return list(self.capabilities.values())

    def list_enabled(self) -> List[Capability]:
        """List enabled capabilities."""
        return [c for c in self.capabilities.values() if c.enabled]

    def enable(self, name: str) -> bool:
        """Enable a capability."""
        cap = self.capabilities.get(name)
        if cap:
            cap.enabled = True
            return True
        return False

    def disable(self, name: str) -> bool:
        """Disable a capability."""
        cap = self.capabilities.get(name)
        if cap:
            cap.enabled = False
            return True
        return False

    def update_config(self, name: str, config: Dict[str, Any]) -> bool:
        """Update capability configuration."""
        cap = self.capabilities.get(name)
        if cap:
            cap.config.update(config)
            return True
        return False

    def get_by_type(self, cap_type: CapabilityType) -> List[Capability]:
        """Get capabilities by type."""
        return [c for c in self.capabilities.values() if c.capability_type == cap_type]


# Global instance
omega_capabilities = OmegaCapabilities()
