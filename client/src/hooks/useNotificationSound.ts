import { useEffect, useRef } from "react";

type SoundKind = "chat" | "portal";
let audioContext: AudioContext | null = null;
let audioUnlocked = false;

const context = () => {
  if (!audioContext) audioContext = new AudioContext();
  return audioContext;
};

const play = (kind: SoundKind) => {
  if (!audioUnlocked) return;
  const audio = context();
  const notes = kind === "chat"
    ? [{ frequency: 740, start: 0, duration: .09 }, { frequency: 988, start: .11, duration: .12 }]
    : [{ frequency: 440, start: 0, duration: .16 }, { frequency: 554, start: .16, duration: .2 }];
  const now = audio.currentTime;
  for (const note of notes) {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = kind === "chat" ? "sine" : "triangle";
    oscillator.frequency.value = note.frequency;
    gain.gain.setValueAtTime(0.0001, now + note.start);
    gain.gain.exponentialRampToValueAtTime(0.08, now + note.start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(now + note.start);
    oscillator.stop(now + note.start + note.duration + 0.02);
  }
};

if (typeof window !== "undefined") {
  const unlock = () => {
    audioUnlocked = true;
    const audio = context();
    if (audio.state === "suspended") void audio.resume();
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

export function useNotificationSound(kind: SoundKind, count: number, storageKey: string) {
  const previous = useRef<number | null>(null);
  useEffect(() => {
    const stored = Number(sessionStorage.getItem(storageKey) || 0);
    const baseline = previous.current ?? stored;
    if (count > baseline) play(kind);
    previous.current = count;
    sessionStorage.setItem(storageKey, String(count));
  }, [count, kind, storageKey]);
}
