// The Ookla mobile Base layer, extracted by scripts/extract_ookla_dhaka.py.
import type { FeatureCollection, Polygon } from 'geojson';

export const BASE_LAYER_URL = '/base-layer/ookla-dhaka-mobile.geojson';

export interface BaseLayerTile {
  quadkey: string;
  down_mbps: number;
  up_mbps: number;
  latency_ms: number;
  tests: number;
  devices: number;
}

export interface BaseLayer extends FeatureCollection<Polygon, BaseLayerTile> {
  metadata: { source: string; year: number; quarter: number; attribution: string };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Jul–Sep 2026" for 2026 Q3. */
export function quarterLabel(year: number, quarter: number): string {
  const first = (quarter - 1) * 3;
  return `${MONTHS[first]}–${MONTHS[first + 2]} ${year}`;
}

export async function loadBaseLayer(): Promise<BaseLayer> {
  const res = await fetch(BASE_LAYER_URL);
  if (!res.ok) throw new Error(`Base layer request failed: ${res.status}`);
  return res.json();
}
