#!/usr/bin/env python3
"""Luqi AI WhatsApp Bot Module — WhatsApp Business API integration,
webhook handlers, message templates, and conversational flows.
"""

import logging
import json
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
#  MESSAGE TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════════

MESSAGE_TEMPLATES = {
    "welcome": {
        "name": "welcome_message",
        "language": "en",
        "components": [
            {
                "type": "body",
                "text": "Hello {{1}}! Welcome to Luqi AI. I'm your intelligent assistant. How can I help you today?\n\nYou can ask me about:\n- Government services\n- Job search and careers\n- Digital workspace tools\n- Learning resources\n- General questions"
            }
        ],
    },
    "help": {
        "name": "help_menu",
        "language": "en", 
        "components": [
            {
                "type": "body",
                "text": "*Luqi AI Help Menu*\n\nReply with a number:\n1. Government Services\n2. Jobs & Careers\n3. Workspace Tools\n4. Learning Resources\n5. Project Management\n6. System Info\n\nOr type your question directly!"
            }
        ],
    },
    "government_menu": {
        "name": "government_menu",
        "language": "en",
        "components": [
            {
                "type": "body",
                "text": "*Government Services*\n\n1. Gauteng Services\n2. National Services\n3. Municipal Contacts\n4. Document Checklists\n5. Service Fees\n\nReply with a number to continue."
            }
        ],
    },
    "jobs_menu": {
        "name": "jobs_menu",
        "language": "en",
        "components": [
            {
                "type": "body",
                "text": "*Jobs & Careers*\n\n1. In-demand careers\n2. Salary benchmarks\n3. Interview tips\n4. Resume builder\n5. Learning resources\n\nReply with a number to continue."
            }
        ],
    },
    "fallback": {
        "name": "fallback_message",
        "language": "en",
        "components": [
            {
                "type": "body",
                "text": "I'm not sure I understood. Could you rephrase?\n\nType 'help' for the main menu or ask me anything!"
            }
        ],
    },
    "goodbye": {
        "name": "goodbye_message",
        "language": "en",
        "components": [
            {
                "type": "body",
                "text": "Thanks for chatting with Luqi AI! Feel free to message me anytime. Have a great day!"
            }
        ],
    },
}

# Menu handlers
MENU_HANDLERS = {
    "1": {"name": "Government Services", "handler": "government"},
    "2": {"name": "Jobs & Careers", "handler": "jobs"},
    "3": {"name": "Workspace Tools", "handler": "workspace"},
    "4": {"name": "Learning Resources", "handler": "learning"},
    "5": {"name": "Project Management", "handler": "pm"},
    "6": {"name": "System Info", "handler": "system"},
}

# Webhook event handlers
EVENT_HANDLERS = {
    "message": {
        "text": "handle_text_message",
        "image": "handle_image_message",
        "document": "handle_document_message",
        "audio": "handle_audio_message",
        "location": "handle_location_message",
    },
    "status": {
        "sent": "handle_status_sent",
        "delivered": "handle_status_delivered",
        "read": "handle_status_read",
        "failed": "handle_status_failed",
    },
}

# Conversation flows
CONVERSATION_FLOWS = {
    "greeting": {
        "triggers": ["hello", "hi", "hey", "start"],
        "response": "Welcome to Luqi AI! I'm here to help. What can I do for you today?",
        "next_state": "main_menu",
    },
    "main_menu": {
        "response": "Choose a category:\n1. Government Services\n2. Jobs & Careers\n3. Workspace Tools\n4. Learning\n5. Help",
        "expect_input": True,
    },
    "government": {
        "response": "Government Services:\n1. SASSA grants\n2. Home Affairs\n3. SARS/Tax\n4. Driver's License\n5. Housing\n0. Back",
        "expect_input": True,
    },
    "jobs": {
        "response": "Jobs & Careers:\n1. In-demand careers\n2. Salary info\n3. Interview tips\n4. Build resume\n0. Back",
        "expect_input": True,
    },
    "workspace": {
        "response": "Workspace Tools:\n1. Tool recommendations\n2. Productivity tips\n3. Remote work guide\n4. Security awareness\n0. Back",
        "expect_input": True,
    },
    "learning": {
        "response": "Learning Resources:\n1. Free courses\n2. Certifications\n3. Coding resources\n4. SA-specific resources\n0. Back",
        "expect_input": True,
    },
    "goodbye": {
        "triggers": ["bye", "goodbye", "thanks", "thank you"],
        "response": "You're welcome! Feel free to chat anytime. Goodbye!",
        "end_conversation": True,
    },
}

# ═══════════════════════════════════════════════════════════════════════════════
#  PUBLIC API FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def get_templates() -> Dict[str, Any]:
    """Get all WhatsApp message templates."""
    return {
        "status": "success",
        "total_templates": len(MESSAGE_TEMPLATES),
        "templates": [{"id": k, "name": v["name"]} for k, v in MESSAGE_TEMPLATES.items()],
    }


def get_template(template_id: str) -> Dict[str, Any]:
    """Get a specific message template."""
    if template_id not in MESSAGE_TEMPLATES:
        return {"status": "not_found", "available": list(MESSAGE_TEMPLATES.keys())}
    return {"status": "success", **MESSAGE_TEMPLATES[template_id]}


def get_menu() -> Dict[str, Any]:
    """Get the main menu structure."""
    return {
        "status": "success",
        "menu": [{"key": k, "name": v["name"]} for k, v in MENU_HANDLERS.items()],
    }


def handle_message(message: str, user_id: str = "", session: Dict = None) -> Dict[str, Any]:
    """Handle an incoming WhatsApp message."""
    if session is None:
        session = {}

    msg_lower = message.lower().strip()

    # Check for greetings
    for flow_id, flow in CONVERSATION_FLOWS.items():
        if "triggers" in flow and any(t in msg_lower for t in flow["triggers"]):
            return {
                "status": "success",
                "response": flow["response"],
                "flow": flow_id,
                "end": flow.get("end_conversation", False),
            }

    # Check for menu selections
    if msg_lower in MENU_HANDLERS:
        handler = MENU_HANDLERS[msg_lower]
        return {
            "status": "success",
            "response": f"You selected: {handler['name']}. How can I help?",
            "handler": handler["handler"],
        }

    # Check for help
    if msg_lower in ["help", "menu", "0"]:
        return {
            "status": "success",
            "response": CONVERSATION_FLOWS["main_menu"]["response"],
            "flow": "main_menu",
        }

    # Default response
    return {
        "status": "success",
        "response": CONVERSATION_FLOWS["main_menu"]["response"],
        "flow": "main_menu",
    }


def get_webhook_config() -> Dict[str, Any]:
    """Get webhook configuration."""
    return {
        "status": "success",
        "webhook_url": "/webhook/whatsapp",
        "verify_token": "luqi_whatsapp_verify",
        "events": {
            "messages": list(EVENT_HANDLERS["message"].keys()),
            "statuses": list(EVENT_HANDLERS["status"].keys()),
        },
    }


def process_webhook(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Process incoming webhook from WhatsApp."""
    try:
        entry = payload.get("entry", [])
        if not entry:
            return {"status": "no_data"}

        changes = entry[0].get("changes", [])
        if not changes:
            return {"status": "no_changes"}

        value = changes[0].get("value", {})
        messages = value.get("messages", [])

        if messages:
            msg = messages[0]
            msg_type = msg.get("type", "text")
            from_number = msg.get("from", "")
            
            if msg_type == "text":
                text = msg.get("text", {}).get("body", "")
                result = handle_message(text, from_number)
                return {
                    "status": "message_processed",
                    "from": from_number,
                    "type": msg_type,
                    "response": result.get("response", ""),
                }
            else:
                return {
                    "status": "non_text_message",
                    "from": from_number,
                    "type": msg_type,
                    "response": "I can currently only process text messages. Type 'help' for options.",
                }

        return {"status": "no_messages"}

    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        return {"status": "error", "message": str(e)}


def format_message(text: str, format_type: str = "markdown") -> str:
    """Format a message for WhatsApp."""
    if format_type == "markdown":
        # WhatsApp supports limited markdown
        formatted = text
        formatted = formatted.replace("**", "*")
        formatted = formatted.replace("__", "_")
        formatted = formatted.replace("```", "```")
        return formatted
    return text
