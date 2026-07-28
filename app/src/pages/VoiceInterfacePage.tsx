/**
 * LUQI AI — Voice Interface
 * ==========================
 * Speech-to-text and text-to-speech interface.
 */

import { useState, useRef } from "react";
import { Mic, Square, Volume2, Loader2, Headphones } from "lucide-react";

const LANGUAGES = [
  { code: "en-ZA", name: "English (South African)" },
  { code: "zu-ZA", name: "isiZulu" },
  { code: "xh-ZA", name: "isiXhosa" },
  { code: "af-ZA", name: "Afrikaans" },
  { code: "st-ZA", name: "Sesotho" },
];

export default function VoiceInterfacePage() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [lang, setLang] = useState("en-ZA");
  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    if (!(window as any).webkitSpeechRecognition && !(window as any).SpeechRecognition) {
      setTranscript("Speech recognition is not supported in your browser. Try Chrome.");
      return;
    }
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
    // Mock response
    if (transcript) {
      setResponse("I heard you say: \"" + transcript + "\". I'm processing your request...");
    }
  };

  const speak = () => {
    if (!response) return;
    const utterance = new SpeechSynthesisUtterance(response);
    utterance.lang = lang;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
            <Headphones size={22} className="text-cyan-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Voice Interface</h1>
            <p className="text-sm text-neutral-400">Speak to LUQI AI in your language</p>
          </div>
        </div>

        {/* Language */}
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:border-cyan-500"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.name}</option>
          ))}
        </select>

        {/* Mic Button */}
        <div className="flex justify-center py-8">
          <button
            onClick={isListening ? stopListening : startListening}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
              isListening
                ? "bg-red-500/20 text-red-500 animate-pulse border-2 border-red-500"
                : "bg-cyan-500/10 text-cyan-500 border-2 border-cyan-500 hover:bg-cyan-500/20"
            }`}
          >
            {isListening ? <Square size={32} /> : <Mic size={32} />}
          </button>
        </div>

        {isListening && (
          <p className="text-center text-sm text-cyan-400 animate-pulse">Listening...</p>
        )}

        {/* Transcript */}
        {transcript && (
          <div className="p-4 rounded-xl bg-neutral-800 border border-neutral-700">
            <p className="text-xs text-neutral-500 mb-1">You said:</p>
            <p className="text-sm text-white">{transcript}</p>
          </div>
        )}

        {/* Response */}
        {response && (
          <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
            <p className="text-xs text-cyan-500 mb-1">LUQI AI:</p>
            <p className="text-sm text-neutral-200">{response}</p>
            <button
              onClick={speak}
              disabled={speaking}
              className="mt-3 px-3 py-1.5 rounded-lg bg-cyan-500 text-black text-xs font-medium hover:bg-cyan-400 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {speaking ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={14} />}
              {speaking ? "Speaking..." : "Read Aloud"}
            </button>
          </div>
        )}

        {/* Tips */}
        <div className="text-xs text-neutral-500 text-center space-y-1">
          <p>Works best in Chrome. Speak clearly for best results.</p>
          <p>Supports English, isiZulu, isiXhosa, Afrikaans, and Sesotho.</p>
        </div>
      </div>
    </div>
  );
}
