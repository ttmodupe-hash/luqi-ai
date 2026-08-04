#!/usr/bin/env python3
"""
LUQI AI v29.12.0 - Unified Master Engine (omega.py)

Distribution note: the engine ships split across .omega_parts/ (the 427 KB
engine is stored as 12 verified byte-parts - no oversized file ever travels
the upload channel, and tampering is detectable part-by-part). Running
`py -3.11 omega.py` (or `python3 omega.py`) assembles the exact single-file
engine in memory and executes it - behavior is identical to the monolithic
omega.py: same CLI, same one-shot mode, same --selftest, same REPL, same
multiprocessing sandbox.

Python 3.11, standard library only.
"""

import hashlib
import os
import sys

ENGINE_VERSION = "29.12.0"
EXPECTED_SIZE = 427038
EXPECTED_SHA256 = "cbcd3689837d6f3fdf20b275b73fada862652c6e22dd12d1e9bb1f6c35d49320"


def _assemble() -> str:
    """Read .omega_parts/part_* and return the verified engine source."""
    here = os.path.dirname(os.path.abspath(__file__))
    parts_dir = os.path.join(here, ".omega_parts")
    blobs = []
    try:
        names = sorted(os.listdir(parts_dir))
    except Exception:
        names = []
    for name in names:
        if not name.startswith("part_"):
            continue
        try:
            with open(os.path.join(parts_dir, name), "rb") as handle:
                blobs.append(handle.read())
        except Exception:
            pass
    source = b"".join(blobs)
    if len(source) != EXPECTED_SIZE or \
            hashlib.sha256(source).hexdigest() != EXPECTED_SHA256:
        sys.stderr.write(
            "LUQI AI v%s: engine parts missing or corrupt in .omega_parts/ "
            "(got %d bytes). Re-clone the repository and try again.\n"
            % (ENGINE_VERSION, len(source)))
        sys.exit(1)
    return source.decode("ascii")


def main() -> None:
    source = _assemble()
    # Execute inside THIS module's globals so multiprocessing 'spawn'
    # children (which re-import omega.py as __mp_main__) resolve engine
    # symbols exactly as they would for the monolithic file.
    globals_dict = globals()
    exec(compile(source, "omega_engine.py", "exec"), globals_dict)


main()
