import { describe, expect, it } from 'vitest';
import { quarterLabel } from './baseLayer';

describe('quarterLabel', () => {
  it('should name the first and last month when given a quarter', () => {
    expect(quarterLabel(2026, 1)).toBe('Jan–Mar 2026');
    expect(quarterLabel(2026, 3)).toBe('Jul–Sep 2026');
    expect(quarterLabel(2025, 4)).toBe('Oct–Dec 2025');
  });
});
