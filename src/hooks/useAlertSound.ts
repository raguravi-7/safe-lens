import { useCallback, useRef } from 'react';
import type { SeverityLevel } from '@/types/detection';

export function useAlertSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastPlayedRef = useRef<number>(0);
  const cooldownMs = 2000; // Minimum 2 seconds between sounds

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    const now = Date.now();
    if (now - lastPlayedRef.current < cooldownMs) return;
    lastPlayedRef.current = now;

    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }, [getAudioContext]);

  const playAlertSound = useCallback((severity: SeverityLevel) => {
    switch (severity) {
      case 'critical':
        // Urgent alarm sound - high frequency, short bursts
        playTone(880, 0.15, 'square');
        setTimeout(() => playTone(880, 0.15, 'square'), 200);
        setTimeout(() => playTone(880, 0.15, 'square'), 400);
        break;
      case 'warning':
        // Warning sound - medium frequency
        playTone(660, 0.3, 'triangle');
        setTimeout(() => playTone(550, 0.3, 'triangle'), 350);
        break;
      case 'info':
        // Soft notification - low frequency
        playTone(440, 0.2, 'sine');
        break;
    }
  }, [playTone]);

  return { playAlertSound };
}
