"""Crypto Utils — Encryption, hashing, and cryptographic utilities."""

import base64
import hashlib
import secrets
from typing import Optional


class CryptoUtils:
    """Cryptographic utility functions."""

    @staticmethod
    def hash_sha256(data: str) -> str:
        return hashlib.sha256(data.encode()).hexdigest()

    @staticmethod
    def hash_password(password: str, salt: Optional[str] = None) -> str:
        salt = salt or secrets.token_hex(16)
        hashed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000)
        return f"{salt}${base64.b64encode(hashed).decode()}"

    @staticmethod
    def verify_password(password: str, stored: str) -> bool:
        try:
            salt, _ = stored.split("$")
            return CryptoUtils.hash_password(password, salt) == stored
        except ValueError:
            return False

    @staticmethod
    def generate_token(length: int = 32) -> str:
        return secrets.token_urlsafe(length)

    @staticmethod
    def generate_api_key() -> str:
        return f"oa_{secrets.token_hex(16)}"

    @staticmethod
    def encrypt_symmetric(data: str, key: str) -> str:
        # Simple XOR for demonstration — use proper encryption in production
        key_bytes = key.encode()
        data_bytes = data.encode()
        encrypted = bytearray()
        for i, b in enumerate(data_bytes):
            encrypted.append(b ^ key_bytes[i % len(key_bytes)])
        return base64.b64encode(bytes(encrypted)).decode()

    @staticmethod
    def decrypt_symmetric(encrypted: str, key: str) -> str:
        key_bytes = key.encode()
        data_bytes = base64.b64decode(encrypted)
        decrypted = bytearray()
        for i, b in enumerate(data_bytes):
            decrypted.append(b ^ key_bytes[i % len(key_bytes)])
        return bytes(decrypted).decode()


if __name__ == "__main__":
    print(CryptoUtils.hash_sha256("test"))
    hashed = CryptoUtils.hash_password("mysecret")
    print(f"Verify: {CryptoUtils.verify_password('mysecret', hashed)}")
    print(f"Token: {CryptoUtils.generate_token()}")
    print(f"API Key: {CryptoUtils.generate_api_key()}")
