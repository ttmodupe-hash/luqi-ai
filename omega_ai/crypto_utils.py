"""
crypto_utils.py - Encryption, decryption, and hashing utilities for LUQI AI.

This module provides the CryptoManager class which wraps AES-256-GCM encryption
via the ``cryptography`` library (Fernet) with graceful fallback to hashlib-only
operation when cryptography is not installed.

Usage::

    engine = __import__("crypto_utils").CryptoManager()
    enc = engine.encrypt("secret data", "my-password-key")
    dec = engine.decrypt(enc["ciphertext"], "my-password-key")
    h   = engine.hash("data to hash", algorithm="sha256")
"""

from __future__ import annotations

import hashlib
import base64
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Optional dependency: cryptography
# ---------------------------------------------------------------------------
try:
    from cryptography.fernet import Fernet
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    _HAS_CRYPTOGRAPHY = True
except ImportError:  # pragma: no cover
    Fernet = None
    PBKDF2HMAC = None
    hashes = None
    _HAS_CRYPTOGRAPHY = False
    logger.warning(
        "cryptography is not installed. Encryption/decryption disabled; "
        "hashing via hashlib still available."
    )


class CryptoManager:
    """AES-256-GCM encryption and hashing manager with graceful fallback."""

    # --------------------------------------------------------------------- #
    # Internal helpers
    # --------------------------------------------------------------------- #
    @staticmethod
    def _derive_key(password: str, salt: bytes | None = None) -> tuple[str, bytes]:
        """Derive a URL-safe base-64 key from *password* using PBKDF2.

        Returns
        -------
        tuple
            (url_safe_base64_key, salt)
        """
        if salt is None:
            salt = b"LUQI_AI_DEFAULT_SALT_2024!!"
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=480_000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode("utf-8")))
        return key.decode("ascii"), salt

    # --------------------------------------------------------------------- #
    # Public API
    # --------------------------------------------------------------------- #
    def encrypt(self, plaintext: str, key: str) -> Dict[str, Any]:
        """Encrypt *plaintext* using AES-256-GCM via Fernet.

        Parameters
        ----------
        plaintext : str
            The text to encrypt.
        key : str
            Password-derived encryption key.

        Returns
        -------
        dict
            ::

                {
                    "result": str,          # same as ciphertext
                    "data": {
                        "ciphertext": str,  # Fernet token as base64 string
                        "algorithm": "AES-256-GCM",
                    },
                    "status": "success" | "error",
                    "success": bool,
                    "message": str,         # empty on success
                }
        """
        if not _HAS_CRYPTOGRAPHY:
            return {
                "result": "",
                "data": {"ciphertext": "", "algorithm": "none"},
                "status": "error",
                "success": False,
                "message": (
                    "cryptography library not installed. "
                    "Install it: pip install cryptography"
                ),
            }

        try:
            derived_key, _ = self._derive_key(key)
            f = Fernet(derived_key.encode("ascii"))
            token = f.encrypt(plaintext.encode("utf-8"))
            ciphertext = token.decode("ascii")
            return {
                "result": ciphertext,
                "data": {"ciphertext": ciphertext, "algorithm": "AES-256-GCM"},
                "status": "success",
                "success": True,
                "message": "",
            }
        except Exception as exc:  # pragma: no cover
            logger.exception("Encryption failed")
            return {
                "result": "",
                "data": {"ciphertext": "", "algorithm": "AES-256-GCM"},
                "status": "error",
                "success": False,
                "message": str(exc),
            }

    def decrypt(self, ciphertext: str, key: str) -> Dict[str, Any]:
        """Decrypt a ciphertext produced by :meth:`encrypt`.

        Parameters
        ----------
        ciphertext : str
            The Fernet token string.
        key : str
            Password-derived encryption key.

        Returns
        -------
        dict
            ::

                {
                    "result": str,      # same as plaintext
                    "data": {
                        "plaintext": str,
                    },
                    "status": "success" | "error",
                    "success": bool,
                    "message": str,
                }
        """
        if not _HAS_CRYPTOGRAPHY:
            return {
                "result": "",
                "data": {"plaintext": ""},
                "status": "error",
                "success": False,
                "message": (
                    "cryptography library not installed. "
                    "Install it: pip install cryptography"
                ),
            }

        try:
            derived_key, _ = self._derive_key(key)
            f = Fernet(derived_key.encode("ascii"))
            plaintext = f.decrypt(ciphertext.encode("ascii")).decode("utf-8")
            return {
                "result": plaintext,
                "data": {"plaintext": plaintext},
                "status": "success",
                "success": True,
                "message": "",
            }
        except Exception as exc:  # pragma: no cover
            logger.exception("Decryption failed")
            return {
                "result": "",
                "data": {"plaintext": ""},
                "status": "error",
                "success": False,
                "message": str(exc),
            }

    def hash(self, data: str, algorithm: str = "sha256") -> Dict[str, Any]:
        """Hash *data* using the requested algorithm.

        Supported algorithms: ``sha256``, ``sha512``, ``blake2b``.

        Parameters
        ----------
        data : str
            The string to hash.
        algorithm : str, optional
            Hash algorithm name (default: ``sha256``).

        Returns
        -------
        dict
            ::

                {
                    "result": str,      # same as hash hex digest
                    "data": {
                        "hash": str,
                        "algorithm": str,
                    },
                    "status": "success" | "error",
                    "success": bool,
                    "message": str,
                }
        """
        try:
            algo = algorithm.lower().strip()
            encoder = hashlib.new("sha256")
            if algo == "sha256":
                encoder = hashlib.sha256()
            elif algo == "sha512":
                encoder = hashlib.sha512()
            elif algo in ("blake2", "blake2b"):
                encoder = hashlib.blake2b()
            else:
                return {
                    "result": "",
                    "data": {"hash": "", "algorithm": algorithm},
                    "status": "error",
                    "success": False,
                    "message": f"Unsupported algorithm: {algorithm}",
                }

            encoder.update(data.encode("utf-8"))
            digest = encoder.hexdigest()
            return {
                "result": digest,
                "data": {"hash": digest, "algorithm": algo},
                "status": "success",
                "success": True,
                "message": "",
            }
        except Exception as exc:  # pragma: no cover
            logger.exception("Hashing failed")
            return {
                "result": "",
                "data": {"hash": "", "algorithm": algorithm},
                "status": "error",
                "success": False,
                "message": str(exc),
            }
