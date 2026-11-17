import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSpeechSynthesisProfile,
  sanitizeSpeechText,
  type VoicePresetId,
} from '../utils/voiceHelpers';

function base64ToBlobUrl(base64: string, mimeType: string): string {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

export function useVoicePlayer() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const speechActiveRef = useRef(false);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    if (
      speechActiveRef.current &&
      typeof window !== 'undefined' &&
      'speechSynthesis' in window
    ) {
      speechActiveRef.current = false;
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore speech synthesis cancellation errors
      }
    }
    setPlayingId(null);
    setLoadingId(null);
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const speakWithBrowserFallback = useCallback(
    (id: string, text: string, voiceName: VoicePresetId): boolean => {
      if (
        typeof window === 'undefined' ||
        !('speechSynthesis' in window) ||
        typeof SpeechSynthesisUtterance === 'undefined'
      ) {
        return false;
      }

      const cleanText = sanitizeSpeechText(text, 1400);
      if (!cleanText) return false;

      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        const profile = getSpeechSynthesisProfile(voiceName);
        utterance.pitch = profile.pitch;
        utterance.rate = profile.rate;
        utterance.lang = 'en-US';

        const voices = window.speechSynthesis.getVoices?.() ?? [];
        const englishVoice =
          voices.find((v) => v.lang.startsWith('en') && v.localService) ||
          voices.find((v) => v.lang.startsWith('en'));
        if (englishVoice) {
          utterance.voice = englishVoice;
        }

        speechActiveRef.current = true;
        utterance.onend = () => {
          speechActiveRef.current = false;
          setPlayingId((curr) => (curr === id ? null : curr));
        };
        utterance.onerror = () => {
          speechActiveRef.current = false;
          setPlayingId((curr) => (curr === id ? null : curr));
        };

        setLoadingId(null);
        setVoiceError(null);
        setPlayingId(id);
        window.speechSynthesis.speak(utterance);
        return true;
      } catch {
        speechActiveRef.current = false;
        return false;
      }
    },
    []
  );

  const playText = useCallback(
    async (id: string, text: string, voiceName: VoicePresetId) => {
      if (playingId === id || loadingId === id) {
        stop();
        return;
      }

      stop();
      setVoiceError(null);
      setLoadingId(id);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch('/api/voice/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voiceName }),
          signal: controller.signal,
        });
        const data = await res.json();

        if (controller.signal.aborted) return;

        if (!res.ok || !data.audioBase64) {
          if (speakWithBrowserFallback(id, text, voiceName)) {
            return;
          }
          setLoadingId(null);
          setVoiceError(data.error || 'Unable to synthesize voice playback right now.');
          return;
        }

        const url = base64ToBlobUrl(data.audioBase64, data.mimeType || 'audio/wav');
        blobUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          stop();
        };
        audio.onerror = () => {
          stop();
          if (!speakWithBrowserFallback(id, text, voiceName)) {
            setVoiceError('Browser audio playback failed.');
          }
        };

        setLoadingId(null);
        setPlayingId(id);
        await audio.play();
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        stop();
        if (!speakWithBrowserFallback(id, text, voiceName)) {
          setVoiceError(
            'Audio playback was blocked or network failed. Tap Listen again to play.'
          );
        }
      }
    },
    [loadingId, playingId, speakWithBrowserFallback, stop]
  );

  const clearError = useCallback(() => setVoiceError(null), []);

  return {
    playingId,
    loadingId,
    voiceError,
    playText,
    stop,
    clearError,
  };
}
