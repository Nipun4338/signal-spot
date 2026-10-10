// PROTOTYPE Variant B — List first. "Best near you" ranking with a small map; test is a full-screen stepper.
import { useState } from 'react';
import { DhakaMap } from './DhakaMap';
import { Kind, SPOTS, speedColor } from './data';
import { ConnTypeField, Figures, Progress, ProviderField, SpotField, UndoToast } from './Fields';
import { actions, canSave, useDraft } from './store';

export const name = 'List first, stepper';

export function VariantB() {
  const d = useDraft();
  const [type, setType] = useState<'wifi' | 'mobile'>('wifi');
  const [kind, setKind] = useState<Kind | 'all'>('all');
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const ranked = SPOTS.filter((s) => s[type] && (kind === 'all' || s.kind === kind)).sort((a, b) => b[type]!.down - a[type]!.down);
  const max = Math.max(...ranked.map((s) => s[type]!.down), 1);

  if (d.phase === 'testing' || d.phase === 'confirm') return <Stepper />;

  return (
    <div className="vb">
      <header>
        <h1>Best {type === 'wifi' ? 'Wi-Fi' : 'mobile data'} near you</h1>
        <button className="primary" onClick={actions.startTest}>⚡ Test my connection</button>
      </header>
      <div className="vb-map"><DhakaMap type={type} showBase={false} showCells={false} focus={focus} /></div>
      <div className="vb-filters">
        <div className="seg">
          <button className={type === 'wifi' ? 'on' : ''} onClick={() => setType('wifi')}>Wi-Fi</button>
          <button className={type === 'mobile' ? 'on' : ''} onClick={() => setType('mobile')}>Mobile</button>
        </div>
        <select value={kind} onChange={(e) => setKind(e.target.value as Kind | 'all')}>
          <option value="all">All places</option><option>café</option><option>library</option><option>co-working</option><option>other</option>
        </select>
      </div>
      <ol className="ranking">
        {ranked.map((s, i) => {
          const f = s[type]!;
          return (
            <li key={s.id} onClick={() => setFocus(s.lngLat)}>
              <div className="rank">{i + 1}</div>
              <div className="rank-body">
                <div><b>{s.name}</b> <span className="kind">{s.kind}</span></div>
                <div className="bar"><div style={{ width: `${(f.down / max) * 100}%`, background: speedColor(f.down) }} /></div>
                <small>{f.down}↓ {f.up}↑ Mbps · {f.latency} ms · {f.readings} readings{'carrier' in f ? ` · ${f.carrier}` : ''}</small>
              </div>
            </li>
          );
        })}
        {ranked.length === 0 && <li className="muted">No places yet — be the first to test one.</li>}
      </ol>
      <UndoToast />
    </div>
  );
}

function Stepper() {
  const d = useDraft();
  const [step, setStep] = useState(0);
  const steps = ['Test', 'Connection', 'Provider', 'Place'];
  const current = d.phase === 'testing' ? 0 : Math.max(step, 1);
  return (
    <div className="stepper">
      <div className="steps">{steps.map((s, i) => <span key={s} className={i === current ? 'on' : i < current ? 'done' : ''}>{i + 1}. {s}</span>)}</div>
      <div className="step-body">
        {current === 0 && <><h2>Measuring…</h2><Progress /><Figures big /></>}
        {current === 1 && <><Figures /><ConnTypeField /></>}
        {current === 2 && <ProviderField />}
        {current === 3 && <SpotField />}
      </div>
      <footer>
        <button className="link" onClick={actions.reset}>Cancel</button>
        {current >= 1 && current < 3 && <button className="primary" disabled={current === 1 ? !d.connType : !d.provider} onClick={() => setStep(current + 1)}>Next</button>}
        {current === 3 && <button className="primary" disabled={!canSave(d)} onClick={actions.save}>Save reading</button>}
      </footer>
    </div>
  );
}
