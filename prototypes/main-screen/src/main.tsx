// PROTOTYPE — three variants of the main screen, switchable via ?variant=A|B|C. Throwaway.
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as A from './VariantA';
import * as B from './VariantB';
import * as C from './VariantC';
import { useDraft } from './store';
import './styles.css';

const VARIANTS = { A: [A.VariantA, A.name], B: [B.VariantB, B.name], C: [C.VariantC, C.name] } as const;
type Key = keyof typeof VARIANTS;
const KEYS = Object.keys(VARIANTS) as Key[];

function readVariant(): Key {
  const v = new URLSearchParams(location.search).get('variant')?.toUpperCase();
  return (KEYS as string[]).includes(v ?? '') ? (v as Key) : 'A';
}

function App() {
  const [variant, setVariant] = useState<Key>(readVariant);
  const [Comp] = VARIANTS[variant];
  return (
    <>
      <Comp key={variant} />
      {!import.meta.env.PROD && <PrototypeSwitcher current={variant} onChange={setVariant} />}
    </>
  );
}

function PrototypeSwitcher({ current, onChange }: { current: Key; onChange: (k: Key) => void }) {
  const d = useDraft();
  const [showState, setShowState] = useState(false);
  function go(delta: number) {
    const next = KEYS[(KEYS.indexOf(current) + delta + KEYS.length) % KEYS.length];
    const url = new URL(location.href);
    url.searchParams.set('variant', next);
    history.replaceState(null, '', url);
    onChange(next);
  }
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable]')) return;
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    }
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });
  return (
    <div className="switcher">
      {showState && <pre className="switcher-state">{JSON.stringify(d, null, 2)}</pre>}
      <div className="switcher-bar">
        <button onClick={() => go(-1)}>←</button>
        <span>{current} ({VARIANTS[current][1]})</span>
        <button onClick={() => go(1)}>→</button>
        <button className="state-btn" onClick={() => setShowState((s) => !s)}>{showState ? 'hide' : 'state'}</button>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
