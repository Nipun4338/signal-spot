import { describe, expect, it } from 'vitest';
import { SPEED_BANDS, bandColorExpression, bandFor } from './speedBands';

describe('bandFor', () => {
  it('should return the slowest band when download is zero', () => {
    expect(bandFor(0).label).toBe('Under 5 Mbps');
  });

  it('should return the higher band when download sits exactly on a boundary', () => {
    expect(bandFor(5).label).toBe('5–20 Mbps');
    expect(bandFor(20).label).toBe('20–50 Mbps');
    expect(bandFor(50).label).toBe('50+ Mbps');
  });

  it('should return the lower band when download is just under a boundary', () => {
    expect(bandFor(19.9).label).toBe('5–20 Mbps');
  });

  it('should return the fastest band when download is very high', () => {
    expect(bandFor(900).label).toBe('50+ Mbps');
  });
});

describe('bandColorExpression', () => {
  it('should build a step expression with every band boundary and colour', () => {
    expect(bandColorExpression('down_mbps')).toEqual([
      'step', ['get', 'down_mbps'],
      SPEED_BANDS[0].color, 5, SPEED_BANDS[1].color, 20, SPEED_BANDS[2].color, 50, SPEED_BANDS[3].color,
    ]);
  });
});
