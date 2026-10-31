/** One game toast at a time: a dark pill above the bottom bar that leaves after 2.6 s */

import { useEffect, useSyncExternalStore } from 'react';

type ToastState = { id: number; text: string } | null;
let state: ToastState = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export function showToast(text: string) {
  state = { id: Date.now(), text };
  clearTimeout(timer);
  timer = setTimeout(() => { state = null; emit(); }, 2600);
  emit();
}

/** Lifts the toast above a bottom bar while the component that owns the bar is mounted */
export function useToastOffset(px: number): void {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--toast-bottom', `${px}px`);
    return () => { root.style.removeProperty('--toast-bottom'); };
  }, [px]);
}

export function useToast(): ToastState {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => listeners.delete(cb); },
    () => state,
    () => null,
  );
}
