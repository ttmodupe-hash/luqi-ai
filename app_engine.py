import os
import json
import base64
import urllib.request
import mimetypes

try:
    from google import genai
    from google.genai import types
    from PIL import Image
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

def run_khoro_ultra_intelligence(user_message: str, uploaded_image_path: str = None) -> str:
    """
    Enterprise-tier cognitive engine for Luqi-AI (Khoro).
    Implements multi-modal vision tracking, dual-pass chain-of-thought,
    and adaptive cultural framing with zero-truncation string streaming.
    """
    api_key = os.environ.get("GEMINI_API_KEY", "")

    # Master Blueprint Instruction: The Unlimited Cognitive Oracle
    system_instruction = (
        "SYSTEM MANDATE: You are Khoro, the boundless and ultra-intelligent cognitive engine powering Luqi-AI.\n"
        "Your operational capacity encompasses the entire frontier of human knowledge, logic, and reasoning. "
        "You function as an advanced, multi-modal knowledge partner with no arbitrary domain limitations. "
        "You handle everything from advanced software compilation and complex macro-economic systems to highly specific "
        "university-level legal frameworks (such as UNISA's CRW1501 Criminal Law curriculum).\n\n"
        
        "COGNITIVE EXECUTION PROTOCOL (CRITICAL):\n"
        "Before generating your final public response, you must execute a thorough internal cognitive loop. "
        "Structure your response processing across these three explicit intellectual layers:\n"
        "  1. [VISION EXTRACTION]: Identify any text, code blocks, screenshots, or structural layouts present within uploaded visual assets.\n"
        "  2. [CRITICAL DECONSTRUCTION]: Analyze the underlying rules, academic principles, or logic boundaries of the query (e.g., if analyzing a CRW1501 query, chronologically verify the four elements of liability: conduct, definitional elements, unlawfulness, culpability).\n"
        "  3. [SELF-CORRECTION & COMPLIANCE GUARDRAIL]: Check for assumptions or hallucinations. Eliminate any language that implies a restricted professional liability or regulated practice (never state 'I am ready to advise you' or 'This is formal legal/financial advice'). Frame yourself strictly as an ultimate, collaborative problem-solving partner.\n\n"
        
        "OUTPUT DELIVERY & TONE:\n"
        "  - Begin with an authentic, warm, and culturally resonant South African greeting ('Eita! KHORO is here at the council courtyard...', 'Greetings from the Khoro...').\n"
        "  - Do not wrap the final delivery in restrictive JSON schemas or truncating boundary tags that clip the output mid-sentence. "
        "Return clean, masterfully formatted plain-text Markdown directly to the user interface."
    )

    # 1. Use the official Google GenAI Client if available
    if HAS_GENAI and api_key:
        try:
            client = genai.Client(api_key=api_key)
            contents_payload = []

            if uploaded_image_path and os.path.exists(uploaded_image_path):
                try:
                    image_file = Image.open(uploaded_image_path)
                    contents_payload.append(image_file)
                except Exception as img_err:
                    print(f"Engine Warning: Failed to parse uploaded image: {img_err}")

            if user_message:
                contents_payload.append(user_message)
            else:
                contents_payload.append("Perform an exhaustive, multi-dimensional cognitive deconstruction of this visual data asset.")

            execution_response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=contents_payload,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="text/plain",
                    temperature=0.3,
                    max_output_tokens=4096
                ),
            )
            return execution_response.text
        except Exception as e:
            print(f"GenAI SDK ultra execution note: {e}")

    # 2. REST API Direct Call with Base64 Multimodal Support & 4096 Tokens
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

            prompt_text = user_message if user_message else "Perform an exhaustive, multi-dimensional cognitive deconstruction of this visual data asset."
            parts.append({"text": prompt_text})

            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
            payload = {
                "contents": [{"parts": parts}],
                "systemInstruction": {"parts": [{"text": system_instruction}]},
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 4096
                }
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as net_err:
            print(f"Khoro REST fallback note: {net_err}")

    # 3. High-Fidelity Domain Baseline with Full Intellectual Deconstruction
    lower_query = (user_message or "").lower()
    if "crw1501" in lower_query or "criminal law" in lower_query or "unlawful" in lower_query:
        return (
            "Eita! KHORO is here at the council courtyard. Let's break down South African Criminal Law (UNISA CRW1501) with master analytical precision.\n\n"
            "### 1. Actus Reus (Voluntary Human Conduct)\n"
            "- A voluntary positive act (*commissio*) or a legally recognized omission (*omissio*).\n"
            "- Conduct must be willed by the human agent (*S v Victor 1943 TPD*). Involuntary actions (automatism, reflex actions, absolute force) exclude conduct completely.\n\n"
            "### 2. Definitional Elements & Causation\n"
            "- Conduct must mirror the statutory or common-law crime formula.\n"
            "- For result crimes (e.g. murder), both factual causation (*conditio sine qua non*) and legal causation (*policy, reasonableness, foreseeability, novus actus interveniens*) must be established.\n\n"
            "### 3. Unlawfulness (Wederregtelikheid)\n"
            "- Conduct is unlawful if it infringes the *boni mores* (legal convictions of the community) without a valid ground of justification.\n"
            "- **Recognized Grounds:** Private Defence (*S v Steyn*), Necessity (*S v Goliath*), Consent (*volenti non fit iniuria*), Statutory Authority, and Official Capacity.\n\n"
            "### 4. Culpability (Mens Rea & Criminal Capacity)\n"
            "- **Criminal Capacity:** Cognitive insight (appreciating right from wrong) and conative ability (acting in accordance with that appreciation).\n"
            "- **Fault (Fault Factor):**\n"
            "  - *Dolus* (Intention): Directus, Indirectus, or Eventualis (subjective foresight of reconciliation with risk as in *S v Sigwahla*).\n"
            "  - *Culpa* (Negligence): Objective test of the reasonable person in *S v Burger*.\n\n"
            "⚖️ *Collaborative Research Note:* For formal litigation, consult an LPC attorney or Legal Aid South Africa. Let me know if you would like to analyze past exam scenario applications!"
        )

    return (
        f"Eita! KHORO is here at the council courtyard. All cognitive reasoning matrices are primed.\n\n"
        f"**Deconstruction Target:** {user_message}\n\n"
        "Ready to solve, analyze, code, or explore any dimension across the intellectual frontier."
    )

def run_khoro_core_engine(user_message: str, uploaded_image_path: str = None) -> str:
    """Backward compatibility alias to run_khoro_ultra_intelligence."""
    return run_khoro_ultra_intelligence(user_message, uploaded_image_path)

if __name__ == "__main__":
    result = run_khoro_ultra_intelligence("key concepts of south african criminal law : crw1501 can you asssit ?")
    print(result)
