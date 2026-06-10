"use client";

// Read-aloud built on the browser Web Speech API (speechSynthesis).
// Speaks the current page/chapter sentence-by-sentence (the standard workaround
// for Chrome cutting off long utterances), then asks the reader to advance and
// keeps going — a hands-free audiobook. Foreground only: the Web Speech API runs
// solely while the page is open. True background playback is a native-app concern.

import { useCallback, useEffect, useRef, useState } from "react";

export type ReadSource = {
  /** Sentences/chunks for the current view. */
  chunks: () => string[];
  /** Move to the next page/chapter; resolve true if there was more to show. */
  advance: () => Promise<boolean> | boolean;
};

/** Split arbitrary text into speakable, sentence-ish chunks (≤ ~220 chars). */
export function toChunks(text: string): string[] {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const sentences = clean.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g) ?? [clean];
  const out: string[] = [];
  for (const s of sentences) {
    const t = s.trim();
    if (!t) continue;
    if (t.length <= 220) out.push(t);
    else for (const part of t.match(/.{1,220}(?:\s|$)/g) ?? [t]) out.push(part.trim());
  }
  return out.filter(Boolean);
}

export function useReadAloud() {
  const [supported, setSupported] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const rateRef = useRef(1);
  rateRef.current = rate;

  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const srcRef = useRef<ReadSource | null>(null);
  const queueRef = useRef<string[]>([]);
  const iRef = useRef(0);
  const runningRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }
    const synth = window.speechSynthesis;
    const pick = () => {
      const vs = synth.getVoices();
      voiceRef.current =
        vs.find((v) => /^en/i.test(v.lang) && /google|natural|samantha|zira|aria|jenny|libby/i.test(v.name)) ||
        vs.find((v) => /^en/i.test(v.lang)) ||
        vs[0] ||
        null;
    };
    pick();
    synth.addEventListener?.("voiceschanged", pick);
    return () => {
      synth.cancel();
      synth.removeEventListener?.("voiceschanged", pick);
    };
  }, []);

  const stopInternal = useCallback(() => {
    runningRef.current = false;
    srcRef.current = null;
    queueRef.current = [];
    iRef.current = 0;
    if (typeof window !== "undefined") window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
  }, []);

  const speakChunk = useCallback(() => {
    if (!runningRef.current) return;
    const synth = window.speechSynthesis;

    if (iRef.current >= queueRef.current.length) {
      // Current view finished → ask the reader to move on.
      Promise.resolve(srcRef.current?.advance()).then((more) => {
        if (!runningRef.current) return;
        if (!more) {
          stopInternal();
          return;
        }
        // Give the new page/chapter a moment to render, then read it.
        setTimeout(() => {
          if (!runningRef.current) return;
          queueRef.current = srcRef.current?.chunks() ?? [];
          iRef.current = 0;
          speakChunk();
        }, 500);
      });
      return;
    }

    const text = queueRef.current[iRef.current++];
    if (!text.trim()) {
      speakChunk();
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    if (voiceRef.current) u.voice = voiceRef.current;
    u.rate = rateRef.current;
    u.onend = () => { if (runningRef.current) speakChunk(); };
    u.onerror = () => { if (runningRef.current) speakChunk(); };
    synth.speak(u);
  }, [stopInternal]);

  const play = useCallback((source: ReadSource) => {
    const synth = window.speechSynthesis;
    synth.cancel();
    srcRef.current = source;
    queueRef.current = source.chunks();
    iRef.current = 0;
    runningRef.current = true;
    setSpeaking(true);
    setPaused(false);
    if (queueRef.current.length === 0) {
      // Nothing on this page — try to advance once before giving up.
      speakChunk();
    } else {
      speakChunk();
    }
  }, [speakChunk]);

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
    setPaused(true);
  }, []);
  const resume = useCallback(() => {
    window.speechSynthesis.resume();
    setPaused(false);
  }, []);
  const stop = useCallback(() => stopInternal(), [stopInternal]);

  return { supported, speaking, paused, rate, setRate, play, pause, resume, stop };
}
