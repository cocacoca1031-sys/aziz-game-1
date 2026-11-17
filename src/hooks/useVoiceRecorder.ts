import { useCallback, useEffect, useRef, useState } from 'react';

function pickSupportedAudioMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return 'audio/webm';
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(new Error('Failed to read recorded audio.'));
    reader.readAsDataURL(blob);
  });
}

export function useVoiceRecorder(onTranscript: (text: string) => void | Promise<void>) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recorderError, setRecorderError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  const cleanupMedia = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setElapsedSeconds(0);
  }, []);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      cleanupMedia();
    };
  }, [cleanupMedia]);

  const startRecording = useCallback(async () => {
    setRecorderError(null);
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function' ||
      typeof MediaRecorder === 'undefined'
    ) {
      setRecorderError(
        'Microphone capture is not supported in this browser environment.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      cancelledRef.current = false;

      const mimeType = pickSupportedAudioMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const recordedMime = recorder.mimeType || mimeType;
        const chunks = [...chunksRef.current];
        const wasCancelled = cancelledRef.current;
        cleanupMedia();

        if (wasCancelled || chunks.length === 0) {
          return;
        }

        const audioBlob = new Blob(chunks, { type: recordedMime });
        if (audioBlob.size < 200) {
          setRecorderError('Recording was too short. Speak for at least 1 second.');
          return;
        }

        setIsTranscribing(true);
        try {
          const audioBase64 = await blobToBase64(audioBlob);
          const res = await fetch('/api/voice/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64, mimeType: recordedMime }),
          });
          const data = await res.json();
          if (!res.ok || !data.transcript) {
            setRecorderError(
              data.error || 'Could not transcribe voice input. Please try again.'
            );
            return;
          }
          await onTranscript(data.transcript);
        } catch {
          setRecorderError('Voice transcription failed due to a network error.');
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setIsRecording(true);
      setElapsedSeconds(0);
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      cleanupMedia();
      const errName = (err as { name?: string })?.name;
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setRecorderError(
          'Microphone permission denied. Allow mic access in your browser to use voice input.'
        );
      } else if (errName === 'NotFoundError') {
        setRecorderError('No microphone device was detected on this device.');
      } else {
        setRecorderError('Unable to access microphone on this device.');
      }
    }
  }, [cleanupMedia, onTranscript]);

  const stopAndSend = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      cancelledRef.current = false;
      recorder.stop();
    }
  }, []);

  const cancelRecording = useCallback(() => {
    const recorder = recorderRef.current;
    cancelledRef.current = true;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    } else {
      cleanupMedia();
    }
  }, [cleanupMedia]);

  const clearRecorderError = useCallback(() => setRecorderError(null), []);

  return {
    isRecording,
    isTranscribing,
    elapsedSeconds,
    recorderError,
    startRecording,
    stopAndSend,
    cancelRecording,
    clearRecorderError,
  };
}
