"""Omega AI v3.7.0 — Cryptographic Utilities
AES-256-GCM encryption for sensitive data at rest.
Uses only Python standard library (hashlib, secrets, hmac).
Falls back to a pure-Python AES implementation when cryptography is unavailable.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import struct
from pathlib import Path
from typing import Any


# ── Try cryptography (best), fall back to pure Python ──
try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    _HAS_CRYPTOGRAPHY = True
except ImportError:
    _HAS_CRYPTOGRAPHY = False


# ═══════════════════════════════════════════════════════════════════════════════
# PURE-PYTHON AES-256 (minimal, for stdlib-only environments)
# Based on public-domain AES implementation
# ═══════════════════════════════════════════════════════════════════════════════

class _PureAES:
    """Minimal AES-256 implementation using only Python stdlib.
    Slower than cryptography but requires zero dependencies."""

    def __init__(self, key: bytes) -> None:
        if len(key) != 32:
            raise ValueError("AES-256 requires 32-byte key")
        self._key = key
        self._round_keys = self._expand_key(key)

    # AES S-box
    _SBOX = bytes([
        0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
        0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
        0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
        0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
        0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
        0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
        0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
        0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
        0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
        0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
        0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
        0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
        0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
        0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
        0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
        0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16,
    ])

    def _expand_key(self, key: bytes) -> list[list[int]]:
        """Expand 32-byte key into 15 round keys (60 words)."""
        RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80]
        Nk, Nr = 8, 14
        w: list[list[int]] = [list(key[i*4:(i+1)*4]) for i in range(Nk)]
        for i in range(Nk, 4*(Nr+1)):
            temp = list(w[i-1])
            if i % Nk == 0:
                temp = [self._SBOX[temp[(j+1)%4]] ^ RCON[(i//Nk)-1] if j == 0 else self._SBOX[temp[(j+1)%4]] for j in range(4)]
            elif Nk > 6 and i % Nk == 4:
                temp = [self._SBOX[b] for b in temp]
            w.append([w[i-Nk][j] ^ temp[j] for j in range(4)])
        return [w[i:i+4] for i in range(0, len(w), 4)]

    def _sub_bytes(self, state: list[list[int]]) -> None:
        for r in range(4):
            for c in range(4):
                state[r][c] = self._SBOX[state[r][c]]

    def _shift_rows(self, state: list[list[int]]) -> None:
        state[1] = state[1][1:] + state[1][:1]
        state[2] = state[2][2:] + state[2][:2]
        state[3] = state[3][3:] + state[3][:3]

    def _mix_columns(self, state: list[list[int]]) -> None:
        for c in range(4):
            a = [state[r][c] for r in range(4)]
            state[0][c] = self._gf_mul(a[0],2) ^ self._gf_mul(a[1],3) ^ a[2] ^ a[3]
            state[1][c] = a[0] ^ self._gf_mul(a[1],2) ^ self._gf_mul(a[2],3) ^ a[3]
            state[2][c] = a[0] ^ a[1] ^ self._gf_mul(a[2],2) ^ self._gf_mul(a[3],3)
            state[3][c] = self._gf_mul(a[0],3) ^ a[1] ^ a[2] ^ self._gf_mul(a[3],2)

    @staticmethod
    def _gf_mul(a: int, b: int) -> int:
        p = 0
        for _ in range(8):
            if b & 1: p ^= a
            hi = a & 0x80
            a = (a << 1) & 0xff
            if hi: a ^= 0x1b
            b >>= 1
        return p

    def _add_round_key(self, state: list[list[int]], rk: list[list[int]]) -> None:
        for r in range(4):
            for c in range(4):
                state[r][c] ^= rk[r][c]

    def encrypt_block(self, block: bytes) -> bytes:
        state = [[block[r + c*4] for c in range(4)] for r in range(4)]
        self._add_round_key(state, self._round_keys[0])
        for i in range(1, 14):
            self._sub_bytes(state)
            self._shift_rows(state)
            self._mix_columns(state)
            self._add_round_key(state, self._round_keys[i])
        self._sub_bytes(state)
        self._shift_rows(state)
        self._add_round_key(state, self._round_keys[14])
        return bytes(state[r][c] for c in range(4) for r in range(4))


# ═══════════════════════════════════════════════════════════════════════════════
# ENCRYPTED STORE — AES-256-GCM
# ═══════════════════════════════════════════════════════════════════════════════

class EncryptedStore:
    """AES-256-GCM encrypted file storage. Secure by default, graceful fallback."""

    def __init__(self, key: bytes | None = None, key_file: str | None = None) -> None:
        """Initialize with a 32-byte key, or load/generate from key_file."""
        if key:
            self._key = key if isinstance(key, bytes) else key.encode()
        elif key_file:
            self._key = self._load_or_generate_key(key_file)
        else:
            self._key = self._derive_key_from_env()
        if len(self._key) != 32:
            self._key = hashlib.sha256(self._key).digest()

    def _load_or_generate_key(self, key_file: str) -> bytes:
        path = Path(key_file)
        if path.exists() and path.stat().st_size == 32:
            return path.read_bytes()
        key = secrets.token_bytes(32)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(key)
        os.chmod(path, 0o600)
        return key

    def _derive_key_from_env(self) -> bytes:
        env_key = os.environ.get("OMEGA_MASTER_KEY", "")
        if env_key:
            return hashlib.sha256(env_key.encode()).digest()
        # Derive from config + machine ID (deterministic per machine)
        machine_id = self._get_machine_id()
        return hashlib.sha256(f"luqi-ai-v3.7.0-{machine_id}".encode()).digest()

    @staticmethod
    def _get_machine_id() -> str:
        """Get a stable machine identifier."""
        for path in ["/etc/machine-id", "/var/lib/dbus/machine-id"]:
            if os.path.isfile(path):
                return Path(path).read_text().strip()[:32]
        return "default-machine-id"

    def encrypt(self, plaintext: str | bytes) -> str:
        """Encrypt plaintext, return base64-encoded ciphertext."""
        data = plaintext.encode() if isinstance(plaintext, str) else plaintext
        nonce = secrets.token_bytes(12)
        if _HAS_CRYPTOGRAPHY:
            aesgcm = AESGCM(self._key)
            ciphertext = aesgcm.encrypt(nonce, data, None)
        else:
            ciphertext = self._aes_gcm_encrypt(nonce, data)
        # Format: [4-byte nonce len][nonce][ciphertext]
        blob = struct.pack("<I", len(nonce)) + nonce + ciphertext
        return base64.b64encode(blob).decode()

    def decrypt(self, ciphertext_b64: str) -> str:
        """Decrypt base64-encoded ciphertext, return plaintext string."""
        blob = base64.b64decode(ciphertext_b64)
        nonce_len = struct.unpack("<I", blob[:4])[0]
        nonce = blob[4:4+nonce_len]
        ciphertext = blob[4+nonce_len:]
        if _HAS_CRYPTOGRAPHY:
            aesgcm = AESGCM(self._key)
            plaintext = aesgcm.decrypt(nonce, ciphertext, None)
        else:
            plaintext = self._aes_gcm_decrypt(nonce, ciphertext)
        return plaintext.decode()

    def encrypt_json(self, data: dict[str, Any]) -> str:
        """Encrypt a JSON-serializable dict."""
        return self.encrypt(json.dumps(data, separators=(",", ":")))

    def decrypt_json(self, ciphertext_b64: str) -> dict[str, Any]:
        """Decrypt and parse JSON."""
        return json.loads(self.decrypt(ciphertext_b64))

    def save_encrypted(self, data: dict[str, Any], file_path: str) -> None:
        """Save encrypted JSON to file."""
        encrypted = self.encrypt_json(data)
        Path(file_path).write_text(encrypted)

    def load_encrypted(self, file_path: str) -> dict[str, Any] | None:
        """Load and decrypt JSON from file."""
        path = Path(file_path)
        if not path.exists():
            return None
        try:
            return self.decrypt_json(path.read_text())
        except Exception:
            return None

    # ── Pure-Python GCM fallback ──
    def _aes_gcm_encrypt(self, nonce: bytes, plaintext: bytes) -> bytes:
        """Pure-Python AES-GCM encryption (fallback)."""
        aes = _PureAES(self._key)
        # CTR mode encryption
        counter = int.from_bytes(nonce + b"\x00\x00\x00\x02", "big")
        keystream = b""
        while len(keystream) < len(plaintext):
            block = nonce + (counter + len(keystream)//16).to_bytes(4, "big")
            block_bytes = block.ljust(16, b"\x00")[:16]
            keystream += aes.encrypt_block(block_bytes)
        ciphertext = bytes(p ^ k for p, k in zip(plaintext, keystream))
        # Simple GHASH-like MAC (simplified for fallback)
        mac = hmac.new(self._key, nonce + ciphertext, hashlib.sha256).digest()[:16]
        return ciphertext + mac

    def _aes_gcm_decrypt(self, nonce: bytes, ciphertext: bytes) -> bytes:
        """Pure-Python AES-GCM decryption (fallback)."""
        mac = ciphertext[-16:]
        ct = ciphertext[:-16]
        aes = _PureAES(self._key)
        counter = int.from_bytes(nonce + b"\x00\x00\x00\x02", "big")
        keystream = b""
        while len(keystream) < len(ct):
            block = nonce + (counter + len(keystream)//16).to_bytes(4, "big")
            block_bytes = block.ljust(16, b"\x00")[:16]
            keystream += aes.encrypt_block(block_bytes)
        plaintext = bytes(c ^ k for c, k in zip(ct, keystream))
        # Verify MAC
        expected_mac = hmac.new(self._key, nonce + ct, hashlib.sha256).digest()[:16]
        if not hmac.compare_digest(mac, expected_mac):
            raise ValueError("Authentication failed — data tampered or corrupted")
        return plaintext


# ── Convenience functions ──
def encrypt_sensitive(data: str | bytes, key_file: str = ".omega_sessions/.master_key") -> str:
    """Encrypt sensitive data with the system master key."""
    store = EncryptedStore(key_file=key_file)
    return store.encrypt(data)


def decrypt_sensitive(ciphertext_b64: str, key_file: str = ".omega_sessions/.master_key") -> str:
    """Decrypt sensitive data with the system master key."""
    store = EncryptedStore(key_file=key_file)
    return store.decrypt(ciphertext_b64)


def migrate_to_encrypted(plain_file: str, encrypted_file: str) -> bool:
    """Migrate a plain JSON file to encrypted storage."""
    store = EncryptedStore()
    path = Path(plain_file)
    if not path.exists():
        return False
    try:
        data = json.loads(path.read_text())
        store.save_encrypted(data, encrypted_file)
        # Secure-delete original (overwrite then remove)
        size = path.stat().st_size
        path.write_bytes(secrets.token_bytes(size))
        path.unlink()
        return True
    except Exception:
        return False


if __name__ == "__main__":
    store = EncryptedStore()
    print(f"Backend: {'cryptography' if _HAS_CRYPTOGRAPHY else 'pure-Python AES-256'}")
    # Test round-trip
    original = {"test": "secret data", "numbers": [1, 2, 3]}
    encrypted = store.encrypt_json(original)
    decrypted = store.decrypt_json(encrypted)
    assert decrypted == original, "Round-trip failed!"
    print("Encryption/decryption: OK")
    print(f"Encrypted size: {len(encrypted)} chars")
