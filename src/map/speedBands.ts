// Download-speed bands for map colour. One blue hue, light = slow, dark = fast,
// checked with the dataviz palette validator (ordinal, light surface).
import type { ExpressionSpecification } from 'maplibre-gl';

export interface SpeedBand {
  label: string;
  /** Lowest median download (Mbps) in this band. */
  min: number;
  color: string;
}

export const SPEED_BANDS: readonly SpeedBand[] = [
  { label: 'Under 5 Mbps', min: 0, color: '#86b6ef' },
  { label: '5–20 Mbps', min: 5, color: '#3987e5' },
  { label: '20–50 Mbps', min: 20, color: '#1c5cab' },
  { label: '50+ Mbps', min: 50, color: '#0d366b' },
];

/** Tiles with fewer tests than this are shown faded: too few to trust. */
export const THIN_TESTS = 20;

export function bandFor(downMbps: number): SpeedBand {
  let band = SPEED_BANDS[0];
  for (const b of SPEED_BANDS) if (downMbps >= b.min) band = b;
  return band;
}

/** MapLibre `step` expression colouring a feature by its download property. */
export function bandColorExpression(property: string): ExpressionSpecification {
  const [first, ...rest] = SPEED_BANDS;
  return ['step', ['get', property], first.color, ...rest.flatMap((b) => [b.min, b.color])] as ExpressionSpecification;
}
