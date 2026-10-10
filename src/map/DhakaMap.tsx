import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { type BaseLayer, type BaseLayerTile, quarterLabel } from './baseLayer';
import { THIN_TESTS, bandColorExpression } from './speedBands';

const DHAKA_CENTER: [number, number] = [90.4125, 23.7925];
const DHAKA_BOUNDS: [[number, number], [number, number]] = [[90.15, 23.5], [90.7, 24.05]];
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

interface Props {
  baseLayer: BaseLayer;
}

export function DhakaMap({ baseLayer }: Props) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const map = new maplibregl.Map({
      container: container.current!,
      style: STYLE_URL,
      center: DHAKA_CENTER,
      zoom: 11.5,
      maxBounds: DHAKA_BOUNDS,
      attributionControl: false,
    });
    map.addControl(
      new maplibregl.AttributionControl({ compact: true, customAttribution: baseLayer.metadata.attribution }),
    );
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      map.addSource('base', { type: 'geojson', data: baseLayer });
      map.addLayer({
        id: 'base-fill',
        type: 'fill',
        source: 'base',
        paint: {
          'fill-color': bandColorExpression('down_mbps'),
          'fill-opacity': ['case', ['<', ['get', 'tests'], THIN_TESTS], 0.25, 0.65],
        },
      });
      // Thin gap between neighbouring tiles so bands read as separate squares.
      map.addLayer({
        id: 'base-gap',
        type: 'line',
        source: 'base',
        paint: { 'line-color': '#fcfcfb', 'line-width': 1 },
      });
    });

    const popup = new maplibregl.Popup({ closeButton: false, maxWidth: '260px' });
    const period = quarterLabel(baseLayer.metadata.year, baseLayer.metadata.quarter);
    const showTile = (e: maplibregl.MapLayerMouseEvent) => {
      const tile = e.features?.[0]?.properties as BaseLayerTile | undefined;
      if (!tile) return;
      popup.setLngLat(e.lngLat).setDOMContent(tileSummary(tile, period)).addTo(map);
    };
    map.on('mousemove', 'base-fill', showTile);
    map.on('click', 'base-fill', showTile);
    map.on('mouseleave', 'base-fill', () => popup.remove());

    return () => map.remove();
  }, [baseLayer]);

  return <div ref={container} className="map" />;
}

function tileSummary(tile: BaseLayerTile, period: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'tile-summary';
  const rows: [string, string][] = [
    ['Download', `${tile.down_mbps} Mbps`],
    ['Upload', `${tile.up_mbps} Mbps`],
    ['Latency', `${tile.latency_ms} ms`],
  ];
  const heading = document.createElement('div');
  heading.className = 'tile-summary-heading';
  heading.textContent = `Ookla · ${period}`;
  el.append(heading);
  for (const [label, value] of rows) {
    const row = document.createElement('div');
    row.className = 'tile-summary-row';
    row.innerHTML = '<span></span><b></b>';
    row.children[0].textContent = label;
    row.children[1].textContent = value;
    el.append(row);
  }
  const note = document.createElement('div');
  note.className = 'tile-summary-note';
  note.textContent = `${tile.tests} tests${tile.tests < THIN_TESTS ? ' — too few to be reliable' : ''}`;
  el.append(note);
  return el;
}
