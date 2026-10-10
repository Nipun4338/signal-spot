// PROTOTYPE Variant C — Test first. Big GO button like a speed test app; result card compares with nearby; map is a second tab.
import { useState } from 'react';
import { DhakaMap } from './DhakaMap';
import { ConnTypeField, Figures, ProviderField, SpotField, UndoToast } from './Fields';
import { actions, canSave, useDraft } from './store';

export const name = 'Test first, tabs';

export function VariantC() {
  const d = useDraft();
  const [tab, setTab] = useState<'test' | 'map'>('test');
  const [type, setType] = useState<'wifi' | 'mobile'>('wifi');

  return (
    <div className="vc">
      {tab === 'test' ? (
        <main className="vc-test">
          {d.phase === 'idle' || d.phase === 'saved' ? (
            <>
              <p className="muted">Find out how good your connection is right here — and help others find good spots.</p>
              <button className="go" onClick={actions.startTest}>GO</button>
              <p className="muted small">Uses up to ~70 MB on mobile data.</p>
            </>
          ) : d.phase === 'testing' ? (
            <Gauge />
          ) : (
            <div className="result-card">
              <Figures />
              <div className="compare">
                Faster than <b>72%</b> of {d.connType === 'mobile' ? 'mobile' : 'Wi-Fi'} readings within 1 km
                <small> (fake)</small>
              </div>
              <ConnTypeField />
              <ProviderField />
              <SpotField compact />
              <div className="row">
                <button className="link" onClick={actions.reset}>Discard</button>
                <button className="primary" disabled={!canSave(d)} onClick={actions.save}>Share on the map</button>
              </div>
            </div>
          )}
        </main>
      ) : (
        <main className="vc-map">
          <div className="seg floating">
            <button className={type === 'wifi' ? 'on' : ''} onClick={() => setType('wifi')}>Wi-Fi</button>
            <button className={type === 'mobile' ? 'on' : ''} onClick={() => setType('mobile')}>Mobile</button>
          </div>
          <DhakaMap type={type} showBase />
        </main>
      )}
      <nav className="tabs">
        <button className={tab === 'test' ? 'on' : ''} onClick={() => setTab('test')}>⚡ Test</button>
        <button className={tab === 'map' ? 'on' : ''} onClick={() => setTab('map')}>🗺 Map</button>
      </nav>
      <UndoToast />
    </div>
  );
}

function Gauge() {
  const d = useDraft();
  const v = d.stage === 'upload' ? d.figures.up : d.stage === 'download' ? d.figures.down : d.figures.latency;
  const unit = d.stage === 'latency' ? 'ms' : 'Mbps';
  const angle = Math.min(1, (v ?? 0) / (d.stage === 'latency' ? 100 : 100)) * 270 - 135;
  return (
    <div className="gauge">
      <svg viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="80" fill="none" stroke="#e5e7eb" strokeWidth="14" strokeDasharray="377 503" transform="rotate(135 100 100)" />
        <line x1="100" y1="100" x2="100" y2="35" stroke="#111" strokeWidth="4" strokeLinecap="round" transform={`rotate(${angle} 100 100)`} />
      </svg>
      <div className="gauge-value">{v ?? '–'} <span>{unit}</span></div>
      <div className="muted">{d.stage}</div>
    </div>
  );
}
