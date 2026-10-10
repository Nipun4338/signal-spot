// PROTOTYPE small shared pieces of the save flow. Variants arrange them differently.
import { useEffect, useState } from 'react';
import { CARRIERS, Kind, OSM_SUGGESTIONS, SPOTS, WIFI_ISPS } from './data';
import { UNDO_MS, actions, useDraft } from './store';

const KINDS: Kind[] = ['café', 'library', 'co-working', 'other'];

export function Figures({ big }: { big?: boolean }) {
  const d = useDraft();
  const f = d.figures;
  return (
    <div className={big ? 'figures big' : 'figures'}>
      <Fig label="Download" value={f.down} unit="Mbps" active={d.stage === 'download'} />
      <Fig label="Upload" value={f.up} unit="Mbps" active={d.stage === 'upload'} />
      <Fig label="Latency" value={f.latency} unit="ms" active={d.stage === 'latency'} />
      <Fig label="Jitter" value={f.jitter} unit="ms" active={d.stage === 'latency'} />
    </div>
  );
}

function Fig({ label, value, unit, active }: { label: string; value?: number; unit: string; active: boolean }) {
  return (
    <div className={active ? 'fig active' : 'fig'}>
      <div className="fig-label">{label}</div>
      <div className="fig-value">{value ?? '–'}<span>{unit}</span></div>
    </div>
  );
}

export function Progress() {
  const d = useDraft();
  const order = ['latency', 'download', 'upload'];
  const total = d.stage === 'done' ? 100 : (order.indexOf(d.stage) * 100 + d.pct) / 3;
  return (
    <div className="progress">
      <div className="progress-bar" style={{ width: `${total}%` }} />
      <div className="progress-label">{d.stage === 'done' ? 'Done' : `Measuring ${d.stage}…`} · ~70 MB max</div>
    </div>
  );
}

export function ConnTypeField() {
  const d = useDraft();
  return (
    <div className="field">
      <div className="field-label">
        Connection {d.connTypeDetected ? <em>(detected — confirm)</em> : <em>(we can’t tell on this browser)</em>}
      </div>
      <div className="chips">
        {(['wifi', 'mobile'] as const).map((t) => (
          <button key={t} className={d.connType === t ? 'chip on' : 'chip'} onClick={() => actions.setConnType(t)}>
            {t === 'wifi' ? '📶 Wi-Fi' : '📱 Mobile data'}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ProviderField() {
  const d = useDraft();
  if (!d.connType) return null;
  const list = d.connType === 'mobile' ? CARRIERS : WIFI_ISPS;
  const guessed = d.provider && !d.providerConfirmed;
  return (
    <div className="field">
      <div className="field-label">
        {d.connType === 'mobile' ? 'Carrier' : 'Internet provider'}{' '}
        {guessed && d.provider !== 'Other' && <em>(looks like {d.provider} — right?)</em>}
        {guessed && d.provider === 'Other' && <em>(couldn’t tell — please pick)</em>}
      </div>
      <select value={d.provider ?? ''} onChange={(e) => actions.setProvider(e.target.value)}>
        <option value="" disabled>Choose…</option>
        {list.map((p) => <option key={p}>{p}</option>)}
        <option>Other</option>
      </select>
    </div>
  );
}

export function SpotField({ compact }: { compact?: boolean }) {
  const d = useDraft();
  const [typing, setTyping] = useState(false);
  const nearby = [
    ...SPOTS.slice(0, 3).map((s) => ({ name: s.name, kind: s.kind, existingId: s.id, tag: `${s.wifi?.readings ?? s.mobile?.readings} readings` })),
    ...OSM_SUGGESTIONS.map((s) => ({ name: s.name, kind: s.kind, existingId: undefined, tag: 'from OpenStreetMap' })),
  ];
  return (
    <div className="field">
      <div className="field-label">Where are you? <em>(optional)</em></div>
      {d.spot && !typing ? (
        <div className="picked">
          <b>{d.spot.name}</b> {d.spot.kind && <span className="kind">{d.spot.kind}</span>}
          <button className="link" onClick={() => actions.setSpot(null)}>change</button>
        </div>
      ) : typing ? (
        <div className="typing">
          <input autoFocus placeholder="Name this place" value={d.spot?.name ?? ''} onChange={(e) => actions.setSpot({ ...d.spot, name: e.target.value })} />
          <div className="chips">
            {KINDS.map((k) => (
              <button key={k} className={d.spot?.kind === k ? 'chip on' : 'chip'} onClick={() => actions.setSpot({ name: d.spot?.name ?? '', kind: k })}>{k}</button>
            ))}
          </div>
          <button className="link" onClick={() => setTyping(false)}>done</button>
        </div>
      ) : (
        <ul className={compact ? 'suggest compact' : 'suggest'}>
          {nearby.slice(0, compact ? 3 : 6).map((s) => (
            <li key={s.name}>
              <button onClick={() => actions.setSpot({ name: s.name, kind: s.kind, existingId: s.existingId })}>
                {s.name} <small>{s.kind} · {s.tag}</small>
              </button>
            </li>
          ))}
          <li><button className="link" onClick={() => setTyping(true)}>+ Somewhere else — type a name</button></li>
          <li><button className="link" onClick={() => actions.setSpot(null)}>Just a point on the map</button></li>
        </ul>
      )}
    </div>
  );
}

export function UndoToast() {
  const d = useDraft();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (d.phase !== 'saved' || !d.savedAt) return null;
  const left = Math.max(0, UNDO_MS - (now - d.savedAt));
  const mm = Math.floor(left / 60000);
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
  return (
    <div className="toast">
      Saved{d.spot ? ` at ${d.spot.name}` : ''}. Thanks!
      {left > 0 && <button onClick={actions.undo}>Undo ({mm}:{ss})</button>}
      <button className="link" onClick={actions.reset}>×</button>
    </div>
  );
}
