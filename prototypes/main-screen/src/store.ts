// PROTOTYPE in-memory flow state + fake speed test. No persistence, no network.
import { useSyncExternalStore } from 'react';
import { Kind } from './data';

export type ConnType = 'wifi' | 'mobile';
export type Stage = 'latency' | 'download' | 'upload' | 'done';

export interface Draft {
  phase: 'idle' | 'testing' | 'confirm' | 'saved';
  stage: Stage;
  pct: number;
  figures: { down?: number; up?: number; latency?: number; jitter?: number };
  connType: ConnType | null;
  connTypeDetected: boolean;
  provider: string | null;
  providerConfirmed: boolean;
  spot: { name: string; kind?: Kind; existingId?: string } | null;
  savedAt?: number;
}

const initial: Draft = {
  phase: 'idle', stage: 'latency', pct: 0, figures: {},
  connType: null, connTypeDetected: false, provider: null, providerConfirmed: false, spot: null,
};

let state: Draft = initial;
const listeners = new Set<() => void>();
function set(patch: Partial<Draft>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useDraft() {
  return useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => state);
}

export const UNDO_MS = 5 * 60 * 1000;

let timer: number | undefined;
export const actions = {
  startTest() {
    clearInterval(timer);
    // Simulate detection: Android Chromium would give a type; elsewhere unknown.
    const nav = (navigator as unknown as { connection?: { type?: string } }).connection;
    const detected = nav?.type === 'wifi' ? 'wifi' : nav?.type === 'cellular' ? 'mobile' : null;
    set({ ...initial, phase: 'testing', connType: detected, connTypeDetected: detected !== null,
      // Simulated ASN lookup: sometimes lands on an upstream ASN -> unconfirmed Other.
      provider: Math.random() < 0.7 ? 'Grameenphone' : 'Other' });
    const stages: Stage[] = ['latency', 'download', 'upload'];
    let si = 0;
    let pct = 0;
    timer = window.setInterval(() => {
      pct += 5;
      const stage = stages[si];
      const f = { ...state.figures };
      if (stage === 'latency') { f.latency = Math.round(20 + Math.random() * 30); f.jitter = Math.round(2 + Math.random() * 8); }
      if (stage === 'download') f.down = Math.round((30 + Math.random() * 60) * (pct / 100) * 10) / 10;
      if (stage === 'upload') f.up = Math.round((10 + Math.random() * 20) * (pct / 100) * 10) / 10;
      if (pct >= 100) {
        si++; pct = 0;
        if (si >= stages.length) { clearInterval(timer); set({ figures: f, stage: 'done', pct: 100, phase: 'confirm' }); return; }
      }
      set({ figures: f, stage: stages[si], pct });
    }, 80);
  },
  setConnType(connType: ConnType) {
    set({ connType, provider: connType === state.connType ? state.provider : null, providerConfirmed: false });
  },
  setProvider(provider: string) { set({ provider, providerConfirmed: true }); },
  setSpot(spot: Draft['spot']) { set({ spot }); },
  save() { set({ phase: 'saved', savedAt: Date.now() }); },
  undo() { set({ ...initial }); },
  reset() { clearInterval(timer); set({ ...initial }); },
};

export function canSave(d: Draft) {
  return d.phase === 'confirm' && d.connType !== null && d.provider !== null;
}
