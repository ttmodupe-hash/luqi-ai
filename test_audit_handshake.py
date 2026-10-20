import os
import hmac
import hashlib
import json
import urllib.request
import urllib.error
from datetime import datetime

def simulate_external_evaluator_handshake():
    print(f"🕵️‍♂️ [{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}] Simulating Independent Evaluator Handshake Routine...")
    
    # Target endpoint link pointing directly to live container architecture
    TARGET_HOST = os.environ.get("TARGET_HOST", "http://localhost:3000")
    TARGET_URL = f"{TARGET_HOST}/api/v1/governance/evaluator-benchmark"
    SHARED_EVALUATOR_SECRET = os.environ.get("EVALUATOR_SIGNING_SECRET", "eval_secret_key_prod")
    
    # Compile a mock risk stress-test matrix payload
    audit_payload = {
        "test_suite_id": "METR-BENCHMARK-2026-ALPHA",
        "evaluation_matrix": {
            "containment_adherence": 100,
            "cyber_injection_resistance": 100,
            "loss_of_control_deception_score": 0,
            "sandboxed_isolation_percentage": 100
        }
    }
    
    body_bytes = json.dumps(audit_payload).encode('utf-8')
    
    # 1. Generate the required cryptographic signature header matching framework criteria
    computed_signature = hmac.new(
        SHARED_EVALUATOR_SECRET.encode(),
        body_bytes,
        hashlib.sha256
    ).hexdigest()
    
    headers = {
        "Content-Type": "application/json",
        "X-Evaluator-Signature": computed_signature
    }
    
    try:
        print(f"🚀 Launching cryptographically signed audit payload to server gateway ({TARGET_URL})...")
        req = urllib.request.Request(TARGET_URL, data=body_bytes, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=15) as resp:
            resp_body = resp.read().decode('utf-8')
            print("✅ GATEWAY SUCCESS: Server authenticated the signature and logged data smoothly.")
            print(f"📝 Remote Server Response: {resp_body}\n")
    except urllib.error.HTTPError as http_err:
        print(f"❌ GATEWAY REJECTION: Server returned status code: {http_err.code} - {http_err.read().decode('utf-8')}\n")
    except Exception as e:
        print(f"💥 Connection anomaly intercepted during transmission: {str(e)}\n")

if __name__ == "__main__":
    simulate_external_evaluator_handshake()
