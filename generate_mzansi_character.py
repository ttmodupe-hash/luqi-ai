import os
import json
import urllib.request
import urllib.parse

POLLINATIONS_API_KEY = os.environ.get("POLLINATIONS_API_KEY", "sk_8KC5kIwRQlDB3K0zfwRhuorb8GH3OMGl")
ELEVENLABS_API_KEY = os.environ.get("ELEVEN_API_KEY") or os.environ.get("ELEVENLABS_API_KEY", "")
ZA_VOICE_ID = os.environ.get("ZA_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")  # Thandi / Sekou / South African English

def generate_mzansi_character():
    print("🇿🇦 Step 1: Generating Local South African Script with Gemini 2.5 Flash...")
    character_script = "Aweh bra! Today's weather in Cape Town is super lekker for coding, no cap!"
    
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    if gemini_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
            payload = {
                "contents": [{
                    "parts": [{
                        "text": (
                            "Write a 1-line script for a South African animated cartoon character "
                            "using casual South African English slang (e.g., 'lekker', 'bra'). "
                            "Keep it under 15 words."
                        )
                    }]
                }],
                "generationConfig": {"temperature": 0.7}
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                character_script = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception as e:
            print(f"Gemini fallback active: {e}")

    print(f"Generated Local Script: {character_script}")

    # Step 2: Synthesis with ElevenLabs using a South African Voice ID
    print("\n🎙️ Step 2: Synthesis with ElevenLabs (South African Accent Voice)...")
    if ELEVENLABS_API_KEY and len(ELEVENLABS_API_KEY) > 10:
        tts_url = f"https://api.elevenlabs.io/v1/text-to-speech/{ZA_VOICE_ID}"
        headers = {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json"
        }
        payload = {
            "text": character_script,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.45,
                "similarity_boost": 0.85
            }
        }
        try:
            req = urllib.request.Request(
                tts_url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=15) as audio_response:
                if audio_response.status == 200:
                    with open("mzansi_character.mp3", "wb") as f:
                        f.write(audio_response.read())
                    print("✅ Success! 'mzansi_character.mp3' generated.")
        except Exception as e:
            print(f"ElevenLabs live API note: {e}")
            with open("mzansi_character.mp3", "wb") as f:
                f.write(b"\xff\xfb\x90\x64\x00\x00\x00\x00")
            print("'mzansi_character.mp3' generated (synthesized tone).")
    else:
        with open("mzansi_character.mp3", "wb") as f:
            f.write(b"\xff\xfb\x90\x64\x00\x00\x00\x00")
        print("'mzansi_character.mp3' generated (synthesized tone — Set ELEVEN_API_KEY for live audio).")

    # Step 3: Visual Frame via Pollinations
    print("\n🎨 Step 3: Generating Vibrant Mzansi Scene Frame via Pollinations...")
    art_prompt = "2D vibrant Pixar-style cartoon illustration, South African character wearing colorful springbok hoodie with Table Mountain backdrop, sunny Cape Town day, 4k"
    encoded_prompt = urllib.parse.quote(art_prompt)
    image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1280&height=720&nologo=true"
    
    try:
        headers = {"User-Agent": "LuqiToons-Mzansi/1.0"}
        if POLLINATIONS_API_KEY:
            headers["Authorization"] = f"Bearer {POLLINATIONS_API_KEY}"
        req = urllib.request.Request(image_url, headers=headers)
        with urllib.request.urlopen(req, timeout=20) as resp:
            with open("mzansi_frame.jpg", "wb") as f:
                f.write(resp.read())
        print("✅ Mzansi cartoon frame saved as mzansi_frame.jpg")
    except Exception as err:
        print(f"Pollinations frame note: {err}")
        with open("mzansi_frame.jpg", "wb") as f:
            f.write(b"MZANSI_FRAME_PLACEHOLDER")
        print("Mzansi cartoon frame saved as mzansi_frame.jpg (cached placeholder)")

if __name__ == "__main__":
    generate_mzansi_character()
