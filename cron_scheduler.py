import os
import time
import json
import urllib.request
import urllib.error
from datetime import datetime

try:
    import requests
except ImportError:
    requests = None

# Configure target connection routing coordinates
API_BASE_URL = os.environ.get("LUQI_API_INTERNAL_URL", "http://localhost:3000/api/v1")

def execute_midnight_optimization():
    print(f"⏰ [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Launching Scheduled Self-Improvement Cycle...")
    endpoint_url = f"{API_BASE_URL}/intelligence/self-optimize"
    
    try:
        if requests is not None:
            response = requests.post(endpoint_url, timeout=120)
            status_code = response.status_code
            patch_report = response.json() if status_code == 200 else {}
            response_text = response.text
        else:
            req = urllib.request.Request(endpoint_url, data=b"{}", headers={"Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(req, timeout=120) as resp:
                status_code = resp.status
                response_text = resp.read().decode("utf-8")
                patch_report = json.loads(response_text) if status_code == 200 else {}

        if status_code == 200:
            print("✅ Optimization Patch Applied Successfully!")
            print(f"📈 Capability Growth Delta: +{patch_report.get('capability_expansion_score', 0)}%")
            print(f"🔧 Resolved Vulnerabilities/Bottlenecks: {patch_report.get('detected_bottlenecks', [])}")
        else:
            print(f"❌ Automation engine rejected with response code: {status_code} - {response_text}")
            
    except Exception as e:
        print(f"💥 Critical crash intercepted during automated routine: {str(e)}")

def start_cron_daemon():
    print("🚀 LuqiToons Automated Cron Daemon Initialized and Monitoring...")
    
    while True:
        now = datetime.now()
        
        # Intercept the precise threshold matching midnight execution goals
        if now.hour == 0 and now.minute == 0:
            execute_midnight_optimization()
            # Sleep for 60 seconds to step past the current minute window safely
            time.sleep(60)
            
        # Rest the execution thread for 30 seconds before re-checking the system clock
        time.sleep(30)

if __name__ == "__main__":
    start_cron_daemon()
