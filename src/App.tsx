import { useEffect, useState } from 'react';
import { DhakaMap } from './map/DhakaMap';
import { type BaseLayer, loadBaseLayer, quarterLabel } from './map/baseLayer';
import { SPEED_BANDS, THIN_TESTS } from './map/speedBands';

export function App() {
  const [baseLayer, setBaseLayer] = useState<BaseLayer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBaseLayer().then(setBaseLayer, (e: Error) => setError(e.message));
  }, []);

  return (
    <main className="app">
      {baseLayer && <DhakaMap baseLayer={baseLayer} />}
      <header className="panel title">
        <h1>Signal Spot</h1>
        <p>Mobile data speed across Dhaka</p>
      </header>
      {baseLayer && <Legend period={quarterLabel(baseLayer.metadata.year, baseLayer.metadata.quarter)} />}
      {error && <p className="panel status">Couldn’t load the map data. Please refresh.</p>}
      {!baseLayer && !error && <p className="panel status">Loading map…</p>}
    </main>
  );
}

function Legend({ period }: { period: string }) {
  return (
    <section className="panel legend" aria-label="Map legend">
      <h2>Median download</h2>
      <ul>
        {SPEED_BANDS.map((band) => (
          <li key={band.label}>
            <span className="swatch" style={{ background: band.color }} aria-hidden="true" />
            {band.label}
          </li>
        ))}
      </ul>
      <p>Faded squares: fewer than {THIN_TESTS} tests.</p>
      <p>Ookla data, {period}.</p>
    </section>
  );
}
