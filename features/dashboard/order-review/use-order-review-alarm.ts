"use client";

import { useCallback, useEffect, useRef } from "react";

function playAlarmBeep(context: AudioContext) {
  if (context.state !== "running") return;
  const now = context.currentTime;
  [0, 0.16, 0.32].forEach((offset, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime([1240, 980, 1240][index], now + offset);
    filter.type = "highpass";
    filter.frequency.setValueAtTime(420, now + offset);
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.75, now + offset + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.14);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now + offset);
    oscillator.stop(now + offset + 0.16);
  });
}

export function useOrderReviewAlarm(active: boolean) {
  const contextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const stopAlarm = useCallback(() => {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
    runningRef.current = false;
    if (contextRef.current?.state === "running") void contextRef.current.suspend().catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function startAlarm() {
      if (runningRef.current) return;
      try {
        const AudioContextConstructor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextConstructor) return;
        const context = contextRef.current ?? new AudioContextConstructor();
        contextRef.current = context;
        if (context.state === "suspended") await context.resume();
        if (cancelled) return;
        playAlarmBeep(context);
        intervalRef.current = window.setInterval(() => playAlarmBeep(context), 850);
        runningRef.current = true;
      } catch {
        runningRef.current = false;
      }
    }
    const retryAlarm = () => {
      if (active && !runningRef.current) void startAlarm();
    };
    if (active) {
      void startAlarm();
      window.addEventListener("pointerdown", retryAlarm, { capture: true });
      window.addEventListener("keydown", retryAlarm, { capture: true });
    } else stopAlarm();
    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", retryAlarm, { capture: true });
      window.removeEventListener("keydown", retryAlarm, { capture: true });
      stopAlarm();
    };
  }, [active, stopAlarm]);
}
