// PROTOTYPE fake data — nothing here is real.

export const DHAKA: [number, number] = [90.4125, 23.7925];

export type Kind = 'café' | 'library' | 'co-working' | 'other';

export interface Spot {
  id: string;
  name: string;
  kind: Kind;
  lngLat: [number, number];
  wifi?: { down: number; up: number; latency: number; readings: number };
  mobile?: { down: number; up: number; latency: number; readings: number; carrier: string };
  source: 'person' | 'osm';
}

export const SPOTS: Spot[] = [
  { id: 's1', name: 'North End Coffee Roasters', kind: 'café', lngLat: [90.4152, 23.7937], source: 'osm', wifi: { down: 82, up: 41, latency: 14, readings: 23 }, mobile: { down: 18, up: 6, latency: 48, readings: 9, carrier: 'Grameenphone' } },
  { id: 's2', name: 'Gloria Jean’s Gulshan 2', kind: 'café', lngLat: [90.4189, 23.7949], source: 'osm', wifi: { down: 34, up: 12, latency: 22, readings: 11 } },
  { id: 's3', name: 'Bengal Books', kind: 'library', lngLat: [90.4073, 23.7804], source: 'person', wifi: { down: 12, up: 4, latency: 61, readings: 6 }, mobile: { down: 27, up: 9, latency: 39, readings: 4, carrier: 'Robi' } },
  { id: 's4', name: 'Dhanmondi Lake Café', kind: 'café', lngLat: [90.3781, 23.7461], source: 'osm', wifi: { down: 5, up: 2, latency: 95, readings: 8 }, mobile: { down: 41, up: 13, latency: 33, readings: 12, carrier: 'Banglalink' } },
  { id: 's5', name: 'Hub Banani Co-work', kind: 'co-working', lngLat: [90.4036, 23.7937], source: 'person', wifi: { down: 145, up: 120, latency: 7, readings: 31 } },
  { id: 's6', name: 'British Council Library', kind: 'library', lngLat: [90.3889, 23.7392], source: 'osm', wifi: { down: 48, up: 22, latency: 18, readings: 14 } },
  { id: 's7', name: 'Crimson Cup Uttara', kind: 'café', lngLat: [90.3984, 23.8686], source: 'osm', wifi: { down: 25, up: 10, latency: 30, readings: 5 }, mobile: { down: 9, up: 3, latency: 70, readings: 3, carrier: 'Teletalk' } },
  { id: 's8', name: 'Mirpur 10 tea stall', kind: 'other', lngLat: [90.3685, 23.8069], source: 'person', mobile: { down: 22, up: 7, latency: 44, readings: 7, carrier: 'Grameenphone' } },
];

// OSM suggestions not yet Spots (no Readings attached).
export const OSM_SUGGESTIONS: { name: string; kind: Kind; lngLat: [number, number] }[] = [
  { name: 'Coffee World Gulshan 1', kind: 'café', lngLat: [90.4161, 23.7807] },
  { name: 'Barista Lavazza', kind: 'café', lngLat: [90.4142, 23.7901] },
  { name: 'Gulshan Society Library', kind: 'library', lngLat: [90.4122, 23.7955] },
];

// From research/dhaka-providers.md.
export const CARRIERS = ['Grameenphone', 'Robi', 'Banglalink', 'Teletalk'];
export const WIFI_ISPS = [
  'Link3', 'Amber IT', 'Carnival', 'Dot Internet', 'BTCL', 'ICC Communication', 'Race Online', 'Digicon',
  'HelloTech', 'Antaranga', 'Delta Software & Communication', 'Sky View', 'BDCOM', 'KS Network', 'Triangle', 'Dhaka Fiber Net',
];

// Deterministic fake map cells around Dhaka (~550 m squares).
function rand(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const STEP = 0.005;
function square(lng: number, lat: number) {
  return [[[lng, lat], [lng + STEP, lat], [lng + STEP, lat + STEP], [lng, lat + STEP], [lng, lat]]];
}

export function cells(type: 'wifi' | 'mobile', base: boolean) {
  const features = [];
  let i = 0;
  for (let lng = 90.34; lng < 90.46; lng += STEP) {
    for (let lat = 23.72; lat < 23.88; lat += STEP) {
      i++;
      const r = rand(i * (type === 'wifi' ? 7 : 13) + (base ? 1000 : 0));
      // crowdsourced cells are sparse; base layer is dense
      if (!base && r > 0.18) continue;
      if (base && r > 0.62) continue;
      const down = Math.round((type === 'wifi' ? 120 : 45) * rand(i * 3.1 + (base ? 7 : 0)) ** 1.6) + 1;
      const tests = Math.round(rand(i * 5.7) * 40);
      features.push({
        type: 'Feature' as const,
        properties: { down, tests, faded: base && type === 'mobile' && tests < 20 },
        geometry: { type: 'Polygon' as const, coordinates: square(lng, lat) },
      });
    }
  }
  return { type: 'FeatureCollection' as const, features };
}

export function speedColor(down: number) {
  if (down < 5) return '#d64545';
  if (down < 20) return '#f08c2e';
  if (down < 50) return '#e3c33b';
  return '#2fa36b';
}
