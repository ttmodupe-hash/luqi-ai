#!/usr/bin/env python3
"""Quick smoke test for luqi_unified.py"""
import sys, os, tempfile
sys.path.insert(0, '/mnt/agents/output')

from backend.luqi_unified import LuqiAgent, MemoryEngine, ToolRegistry, VoiceEngine, system_info

print("1. Imports OK")

# MemoryEngine
db_fd, db_path = tempfile.mkstemp(suffix='.db')
os.close(db_fd)
m = MemoryEngine(db_path=db_path)
m.save_message("user", "Hello", session_id="test")
assert len(m.get_recent(session_id="test")) == 1
m.store_fact("key", "val")
assert len(m.get_facts()) == 1
stats = m.get_stats()
assert stats["total_messages"] >= 1
print(f"2. MemoryEngine OK (msgs={stats['total_messages']}, facts={stats['total_facts']})")

# ToolRegistry
r = ToolRegistry(memory=m)
def fn(x=""): return f"result: {x}"
r.register("test", fn, {"description": "d", "parameters": {"type": "object", "properties": {}}})
result = r.invoke("test", {"x": "hi"})
assert "result: hi" in result
assert "not found" in r.invoke("missing", {})
print("3. ToolRegistry OK")

# VoiceEngine
v = VoiceEngine()
c = v._clean_for_speech("**test** `code` https://x.com")
assert "**" not in c
assert "https://" not in c
print("4. VoiceEngine OK")

# system_info
info = system_info()
assert "platform" in info
print("5. system_info OK")

# LuqiAgent init (no OpenAI)
agent = LuqiAgent()
assert len(agent.tools.list()) == 7
print(f"6. LuqiAgent OK ({len(agent.tools.list())} tools)")
agent.cleanup()

os.unlink(db_path)
print("\nAll unified module checks passed!")