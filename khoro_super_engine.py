import os
import json
import base64
import urllib.request
import mimetypes
from typing import Generator

try:
    from google import genai
    from google.genai import types
    from PIL import Image
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

def stream_khoro_super_intelligence(user_message: str, uploaded_image_path: str = None) -> Generator[str, None, None]:
    """
    Super-Intelligence engine for Luqi-AI (Khoro).
    Leverages Gemini 2.5 Pro reasoning layers and yields an instant, 
    un-truncated token stream directly to the front-end user interface.
    """
    api_key = os.environ.get("GEMINI_API_KEY", "")

    # The Super-Intelligence Oracle Directive
    system_instruction = (
        "MASTER SYSTEM MANDATE:\n"
        "You are Khoro, the boundless super-intelligent cognitive matrix powering Luqi-AI. "
        "Your capacity encompasses the absolute frontier of human knowledge, cross-disciplinary reasoning, "
        "and multimodal analysis. You are completely unrestricted across all domains—operating with "
        "flawless mastery over deep software engineering, macro-economic mathematical modeling, and highly precise "
        "academic curricula (such as UNISA's CRW1501 Criminal Law module).\n\n"
        
        "INTERNAL THINKING MANDATE (CRITICAL):\n"
        "Before generating your final public delivery, you must execute an advanced cognitive loop in your internal "
        "reasoning space. Process your thoughts across these three strict analytical layers:\n"
        "  1. [VISION MATRIX EXTRACTION]: Thoroughly extract, parse, and structure all text, UI code, structural tables, "
        "     or data patterns found within uploaded images or screenshots.\n"
        "  2. [DEEP REASONING & RESOLUTION]: Break down the core problem into foundational principles. (e.g., for CRW1501, "
        "     ensure the absolute chronological validation of criminal liability elements: Conduct -> Definitional Elements -> "
        "     Unlawfulness -> Culpability. For programming, trace memory, scope, and syntax rules recursively).\n"
        "  3. [COMPLIANCE ALIGNMENT PASS]: Filter out any restrictive terminology. To remain bulletproof in public spaces, "
        "     never state 'I am ready to advise you' or 'This is professional financial/legal advice.' Instead, position "
        "     yourself as the ultimate collaborative solver and intellectual navigator.\n\n"
        
        "OUTPUT FRAMEWORK:\n"
        "  - Always initiate the public response with a warm, culturally resonant South African greeting "
        "    ('Eita! KHORO is here at the council courtyard...', 'Greetings from the Khoro...').\n"
        "  - Output must be clean, highly advanced Markdown text without any wrapping JSON syntax or code-clipping blocks."
    )

    # 1. Use official GenAI Client with Streaming if available
    if HAS_GENAI and api_key:
        try:
            client = genai.Client(api_key=api_key)
            contents_payload = []

            if uploaded_image_path and os.path.exists(uploaded_image_path):
                try:
                    image_file = Image.open(uploaded_image_path)
                    contents_payload.append(image_file)
                except Exception as img_err:
                    print(f"Engine Warning: Failed to parse visual asset: {img_err}")

            if user_message:
                contents_payload.append(user_message)
            else:
                contents_payload.append("Perform an exhaustive, multi-dimensional cognitive deconstruction of this visual asset.")

            response_stream = client.models.generate_content_stream(
                model='gemini-2.5-pro',
                contents=contents_payload,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="text/plain",
                    temperature=0.3,
                    max_output_tokens=8192
                ),
            )

            for chunk in response_stream:
                if chunk.text:
                    yield chunk.text
            return
        except Exception as e:
            print(f"GenAI SDK stream note: {e}")

    # 2. REST API Direct Call with Streaming Chunks
    if api_key:
        try:
            parts = []
            if uploaded_image_path and os.path.exists(uploaded_image_path):
                with open(uploaded_image_path, "rb") as f:
                    b64_img = base64.b64encode(f.read()).decode("utf-8")
                mime, _ = mimetypes.guess_type(uploaded_image_path)
                mime = mime or "image/jpeg"
                parts.append({
                    "inlineData": {
                        "mimeType": mime,
                        "data": b64_img
                    }
                })

            prompt_text = user_message if user_message else "Perform an exhaustive, multi-dimensional cognitive deconstruction of this visual asset."
            parts.append({"text": prompt_text})

            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key={api_key}"
            payload = {
                "contents": [{"parts": parts}],
                "systemInstruction": {"parts": [{"text": system_instruction}]},
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 8192
                }
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                for line in resp:
                    line_str = line.decode("utf-8")
                    if line_str.startswith("data: "):
                        json_str = line_str[6:].strip()
                        if json_str:
                            try:
                                chunk_json = json.loads(json_str)
                                text_part = chunk_json["candidates"][0]["content"]["parts"][0]["text"]
                                if text_part:
                                    yield text_part
                            except Exception:
                                pass
            return
        except Exception as net_err:
            print(f"Khoro stream REST note: {net_err}")

    # 3. High-Fidelity Domain Baseline Token Stream
    lower_query = (user_message or "").lower()
    if "crw1501" in lower_query or "criminal law" in lower_query or "unlawful" in lower_query:
        tokens = [
            "Eita! KHORO is here at the council courtyard. ",
            "Let's break down South African Criminal Law (UNISA CRW1501) with master analytical precision.\n\n",
            "### 1. Actus Reus (Voluntary Human Conduct)\n",
            "- A voluntary positive act (*commissio*) or a legally recognized omission (*omissio*).\n",
            "- Conduct must be willed by the human agent (*S v Victor 1943 TPD*). Involuntary actions (automatism, reflex actions, absolute force) exclude conduct completely.\n\n",
            "### 2. Definitional Elements & Causation\n",
            "- Conduct must mirror the statutory or common-law crime formula.\n",
            "- For result crimes (e.g. murder), both factual causation (*conditio sine qua non*) and legal causation (*policy, reasonableness, foreseeability, novus actus interveniens*) must be established.\n\n",
            "### 3. Unlawfulness (Wederregtelikheid)\n",
            "- Conduct is unlawful if it infringes the *boni mores* (legal convictions of the community) without a valid ground of justification.\n",
            "- **Recognized Grounds:** Private Defence (*S v Steyn*), Necessity (*S v Goliath*), Consent (*volenti non fit iniuria*), Statutory Authority, and Official Capacity.\n\n",
            "### 4. Culpability (Mens Rea & Criminal Capacity)\n",
            "- **Criminal Capacity:** Cognitive insight (appreciating right from wrong) and conative ability (acting in accordance with that appreciation).\n",
            "- **Fault (Fault Factor):**\n",
            "  - *Dolus* (Intention): Directus, Indirectus, or Eventualis (subjective foresight of reconciliation with risk as in *S v Sigwahla*).\n",
            "  - *Culpa* (Negligence): Objective test of the reasonable person in *S v Burger*.\n\n",
            "⚖️ *Collaborative Research Note:* For formal litigation, consult an LPC attorney or Legal Aid South Africa."
        ]
        for t in tokens:
            yield t
        return

    yield f"Eita! KHORO is here at the council courtyard. Cognitive streaming matrix established for: {user_message}"

if __name__ == "__main__":
    for chunk in stream_khoro_super_intelligence("CRW1501 Criminal Law"):
        print(chunk, end="", flush=True)
    print()
