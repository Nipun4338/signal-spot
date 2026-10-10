import { describe, expect, it } from 'vitest';
import { OTHER, PROVIDERS, UPSTREAM_ASNS, pickerList, providerFromAsn } from './providers';

describe('providerFromAsn', () => {
  it('should return the Carrier with high confidence when a Carrier ASN is on mobile data', () => {
    expect(providerFromAsn(24389, 'mobile')).toEqual({ provider: 'Grameenphone', confidence: 'high' });
  });

  it("should return the same Carrier when the ASN is a Carrier's dormant sibling", () => {
    expect(providerFromAsn(38069, 'mobile')).toEqual({ provider: 'Robi', confidence: 'high' });
  });

  it('should return the ISP with high confidence when an ISP ASN is on Wi-Fi', () => {
    expect(providerFromAsn(23688, 'wifi')).toEqual({ provider: 'Link3', confidence: 'high' });
  });

  it('should return low confidence when the ASN is shared or unconfirmed', () => {
    expect(providerFromAsn(17494, 'wifi')).toEqual({ provider: 'BTCL', confidence: 'low' });
    expect(providerFromAsn(150307, 'wifi')).toEqual({ provider: 'Carnival', confidence: 'low' });
  });

  it('should return Other when the ASN belongs to an upstream gateway', () => {
    expect(providerFromAsn(58717, 'wifi')).toEqual({ provider: OTHER, confidence: 'none' });
  });

  it('should return Other when the ASN is unknown or missing', () => {
    expect(providerFromAsn(64512, 'wifi')).toEqual({ provider: OTHER, confidence: 'none' });
    expect(providerFromAsn(undefined, 'mobile')).toEqual({ provider: OTHER, confidence: 'none' });
  });

  it("should return Other when mobile data comes from a Wi-Fi ISP's ASN", () => {
    expect(providerFromAsn(23688, 'mobile')).toEqual({ provider: OTHER, confidence: 'none' });
  });

  it('should keep the Carrier with low confidence when a Carrier ASN is on Wi-Fi', () => {
    expect(providerFromAsn(45245, 'wifi')).toEqual({ provider: 'Banglalink', confidence: 'low' });
  });

  it('should use the ASN alone when the Connection type is not known yet', () => {
    expect(providerFromAsn(45925, null)).toEqual({ provider: 'Teletalk', confidence: 'high' });
  });
});

describe('pickerList', () => {
  it('should list the four Carriers then Other when the Connection type is mobile', () => {
    expect(pickerList('mobile')).toEqual(['Grameenphone', 'Robi', 'Banglalink', 'Teletalk', OTHER]);
  });

  it('should list the 16 ISPs then Other when the Connection type is Wi-Fi', () => {
    const list = pickerList('wifi');
    expect(list).toHaveLength(17);
    expect(list.at(-1)).toBe(OTHER);
  });
});

describe('Provider table', () => {
  it('should map each ASN to exactly one Provider when building the table', () => {
    const seen = new Set<number>();
    for (const p of PROVIDERS) {
      for (const asn of [...p.asns, ...(p.lowConfidenceAsns ?? [])]) {
        expect(seen.has(asn), `AS${asn} listed twice`).toBe(false);
        expect(UPSTREAM_ASNS.has(asn), `AS${asn} is also an upstream`).toBe(false);
        seen.add(asn);
      }
    }
  });
});
