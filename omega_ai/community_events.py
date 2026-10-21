"""Existing in-memory LUQI event discovery API under omega_ai namespace.

Source: LUQI root community_events.py. No persistence, scheduled events feed,
real-time discovery, or authenticated access is provided by this adapter.
"""

from community_events import CommunityEvents

__all__ = ["CommunityEvents"]
