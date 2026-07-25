import { useState, useCallback, useRef } from 'react';

export function useVoice() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setTranscript('Speech recognition not supported in this browser');
      return;
    }
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = (e: any) => {
      console.error('Speech recognition error:', e.error);
      setListening(false);
    };
    recognition.onresult = (e: any) => {
      setTranscript(e.results[0][0].transcript);
    };
    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return { listening, transcript, startListening, stopListening, clearTranscript };
}
