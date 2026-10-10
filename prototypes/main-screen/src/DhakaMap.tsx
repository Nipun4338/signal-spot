// PROTOTYPE shared map: OpenFreeMap tiles, fake cells and Spots.
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DHAKA, SPOTS, Spot, cells, speedColor } from './data';

interface Props {
  type: 'wifi' | 'mobile';
  showBase: boolean;
  showCells?: boolean;
  focus?: [number, number] | null;
  onSpot?: (s: Spot) => void;
  style?: React.CSSProperties;
}

const colorExpr = ['step', ['get', 'down'], '#d64545', 5, '#f08c2e', 20, '#e3c33b', 50, '#2fa36b'] as unknown as maplibregl.ExpressionSpecification;

export function DhakaMap({ type, showBase, showCells = true, focus, onSpot, style }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map>();
  const markers = useRef<maplibregl.Marker[]>([]);
  const onSpotRef = useRef(onSpot);
  onSpotRef.current = onSpot;

  useEffect(() => {
    const m = new maplibregl.Map({ container: el.current!, style: 'https://tiles.openfreemap.org/styles/positron', center: DHAKA, zoom: 12.3, attributionControl: false });
    m.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: 'Base layer: Ookla® open data (CC BY-NC-SA 4.0) — FAKE in prototype' }));
    m.on('load', () => {
      m.addSource('base', { type: 'geojson', data: cells(type, true) });
      m.addLayer({ id: 'base', type: 'fill', source: 'base', paint: { 'fill-color': colorExpr, 'fill-opacity': ['case', ['get', 'faded'], 0.08, 0.22] } });
      m.addSource('cells', { type: 'geojson', data: cells(type, false) });
      m.addLayer({ id: 'cells', type: 'fill', source: 'cells', paint: { 'fill-color': colorExpr, 'fill-opacity': 0.55, 'fill-outline-color': '#fff' } });
      sync();
    });
    map.current = m;
    return () => m.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function sync() {
    const m = map.current;
    if (!m || !m.isStyleLoaded() || !m.getSource('cells')) return;
    (m.getSource('base') as maplibregl.GeoJSONSource).setData(cells(type, true));
    (m.getSource('cells') as maplibregl.GeoJSONSource).setData(cells(type, false));
    m.setLayoutProperty('base', 'visibility', showBase ? 'visible' : 'none');
    m.setLayoutProperty('cells', 'visibility', showCells ? 'visible' : 'none');
    markers.current.forEach((mk) => mk.remove());
    markers.current = SPOTS.filter((s) => s[type]).map((s) => {
      const fig = s[type]!;
      const node = document.createElement('button');
      node.className = 'spot-pin';
      node.style.background = speedColor(fig.down);
      node.textContent = `${Math.round(fig.down)}`;
      node.title = s.name;
      node.onclick = () => onSpotRef.current?.(s);
      return new maplibregl.Marker({ element: node }).setLngLat(s.lngLat).addTo(m);
    });
  }

  useEffect(sync, [type, showBase, showCells]);
  useEffect(() => { if (focus) map.current?.flyTo({ center: focus, zoom: 15 }); }, [focus]);
  useEffect(() => {
    const ro = new ResizeObserver(() => map.current?.resize());
    ro.observe(el.current!);
    return () => ro.disconnect();
  }, []);

  return <div ref={el} style={{ width: '100%', height: '100%', ...style }} />;
}
