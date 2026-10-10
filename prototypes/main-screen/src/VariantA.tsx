// PROTOTYPE Variant A — Map first. Full-screen map, floating "Test here", flow in a bottom sheet.
import { useState } from 'react';
import { DhakaMap } from './DhakaMap';
import { Spot } from './data';
import { ConnTypeField, Figures, Progress, ProviderField, SpotField, UndoToast } from './Fields';
import { actions, canSave, useDraft } from './store';

export const name = 'Map first, bottom sheet';

export function VariantA() {
  const d = useDraft();
  const [type, setType] = useState<'wifi' | 'mobile'>('wifi');
  const [base, setBase] = useState(true);
  const [spot, setSpot] = useState<Spot | null>(null);

  return (
    <div className="va">
      <DhakaMap type={type} showBase={base} onSpot={setSpot} focus={spot?.lngLat} />

      <div className="va-top">
        <div className="seg">
          <button className={type === 'wifi' ? 'on' : ''} onClick={() => setType('wifi')}>Wi-Fi</button>
          <button className={type === 'mobile' ? 'on' : ''} onClick={() => setType('mobile')}>Mobile</button>
        </div>
        <label className="toggle"><input type="checkbox" checked={base} onChange={(e) => setBase(e.target.checked)} /> Ookla layer</label>
      </div>

      <Legend />

      {spot && d.phase === 'idle' && (
        <div className="sheet">
          <button className="close" onClick={() => setSpot(null)}>×</button>
          <h3>{spot.name}</h3>
          <div className="muted">{spot.kind} · {spot.source === 'osm' ? 'from OpenStreetMap' : 'added by someone'}</div>
          {spot.wifi && <p>📶 Wi-Fi: <b>{spot.wifi.down}</b>↓ {spot.wifi.up}↑ Mbps · {spot.wifi.latency} ms <small>({spot.wifi.readings} readings)</small></p>}
          {spot.mobile && <p>📱 {spot.mobile.carrier}: <b>{spot.mobile.down}</b>↓ {spot.mobile.up}↑ Mbps · {spot.mobile.latency} ms <small>({spot.mobile.readings} readings)</small></p>}
        </div>
      )}

      {(d.phase === 'testing' || d.phase === 'confirm') && (
        <div className="sheet tall">
          <button className="close" onClick={actions.reset}>×</button>
          {d.phase === 'testing' ? <h3>Testing your connection…</h3> : <h3>Your result</h3>}
          <Progress />
          <Figures />
          {d.phase === 'confirm' && (
            <>
              <ConnTypeField />
              <ProviderField />
              <SpotField compact />
              <button className="primary" disabled={!canSave(d)} onClick={actions.save}>Save reading</button>
            </>
          )}
        </div>
      )}

      {d.phase === 'idle' && !spot && <button className="fab" onClick={actions.startTest}>⚡ Test here</button>}
      <UndoToast />
    </div>
  );
}

function Legend() {
  return (
    <div className="legend">
      <span style={{ background: '#d64545' }} />&lt;5
      <span style={{ background: '#f08c2e' }} />5–20
      <span style={{ background: '#e3c33b' }} />20–50
      <span style={{ background: '#2fa36b' }} />50+ Mbps
    </div>
  );
}
