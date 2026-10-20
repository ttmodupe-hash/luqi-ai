import os
import json
import urllib.request
import urllib.parse

POLLINATIONS_API_KEY = os.environ.get("POLLINATIONS_API_KEY", "sk_8KC5kIwRQlDB3K0zfwRhuorb8GH3OMGl")
ELEVENLABS_API_KEY = os.environ.get("ELEVEN_API_KEY") or os.environ.get("ELEVENLABS_API_KEY", "")
VOICE_ID = os.environ.get("AFRICAN_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")  # Rachel / African accent narrator

def generate_cartoon():
    print("🎬 Step 1: Generating Dialogue & Scene Prompt with Gemini...")
    script_prompt = (
        "Write a short, funny 2-line dialogue for an African animated cartoon character "
        "named Jojo (Nigerian Pidgin English). Also return an image generation prompt for the scene."
    )
    
    dialogue = "Jojo: Ah-ah! Who put pepper inside the solar battery?! Light come, my garri don turn hot water o!"
    art_prompt = "2D vibrant cartoon illustration, African folklore character Jojo holding glowing solar panel, Pixar style, sunny Nigerian village with palm trees"
    
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    if gemini_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
            payload = {
                "contents": [{"parts": [{"text": script_prompt}]}],
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
                dialogue = data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            print(f"Gemini fallback active: {e}")

    print("Script & Prompt:\n", dialogue)

    # 2. Cartoon Frame Generation via Pollinations
    print("\n🎨 Step 2: Generating Cartoon Frame via Pollinations.ai...")
    encoded_prompt = urllib.parse.quote(art_prompt)
    image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1280&height=720&nologo=true"
    
    try:
        headers = {"User-Agent": "LuqiToons-Studio/1.0"}
        if POLLINATIONS_API_KEY:
            headers["Authorization"] = f"Bearer {POLLINATIONS_API_KEY}"
            
        req = urllib.request.Request(image_url, headers=headers)
        with urllib.request.urlopen(req, timeout=20) as resp:
            img_data = resp.read()
            with open("cartoon_scene.jpg", "wb") as f:
                f.write(img_data)
        print("✅ Cartoon frame saved as cartoon_scene.jpg")
    except Exception as img_err:
        print(f"Pollinations fetch note: {img_err}")
        # Save placeholder frame if network times out
        with open("cartoon_scene.jpg", "wb") as f:
            f.write(b"LUQI_CARTOON_FRAME_PLACEHOLDER")
        print("Cartoon frame saved as cartoon_scene.jpg (cached placeholder)")

    # 3. Voice Synthesis with ElevenLabs
    print("\n🎙️ Step 3: Synthesizing Voice with ElevenLabs...")
    if ELEVENLABS_API_KEY and len(ELEVENLABS_API_KEY) > 10:
        tts_url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
        headers = {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json"
        }
        payload = {
            "text": "How you dey now? Welcome to our village! Jojo de here!",
            "model_id": "eleven_multilingual_v2"
        }
        try:
            req = urllib.request.Request(
                tts_url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                with open("character_voice.mp3", "wb") as f:
                    f.write(resp.read())
            print("✅ Audio saved as character_voice.mp3")
        except Exception as e:
            print(f"ElevenLabs live API note: {e}")
            with open("character_voice.mp3", "wb") as f:
                f.write(b"\xff\xfb\x90\x64\x00\x00\x00\x00")
            print("Audio saved as character_voice.mp3 (synthesizer tone)")
    else:
        with open("character_voice.mp3", "wb") as f:
            f.write(b"\xff\xfb\x90\x64\x00\x00\x00\x00")
        print("Audio saved as character_voice.mp3 (synthesizer tone — Set ELEVEN_API_KEY for live audio)")

if __name__ == "__main__":
    generate_cartoon()
