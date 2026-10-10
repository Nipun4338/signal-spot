// Maps a Reading's ASN (from Cloudflare's request.cf.asn) to a Provider.
// Source: research/dhaka-providers.md on branch research/dhaka-providers (2026-10-10).

export type ConnectionType = 'wifi' | 'mobile';

export interface Provider {
  name: string;
  kind: ConnectionType;
  /** ASNs that map to this Provider with normal confidence. */
  asns: readonly number[];
  /** ASNs that map to this Provider but should be confirmed by the person. */
  lowConfidenceAsns?: readonly number[];
}

export const OTHER = 'Other';

/** Display order matches the override picker: Carriers first, then Wi-Fi ISPs. */
export const PROVIDERS: readonly Provider[] = [
  { name: 'Grameenphone', kind: 'mobile', asns: [24389] },
  { name: 'Robi', kind: 'mobile', asns: [24432, 38069, 56138] },
  { name: 'Banglalink', kind: 'mobile', asns: [45245] },
  { name: 'Teletalk', kind: 'mobile', asns: [45925] },
  { name: 'Link3', kind: 'wifi', asns: [23688] },
  { name: 'Amber IT', kind: 'wifi', asns: [23956] },
  // AS150307 (Carnival Care Ltd) is not confirmed to be Carnival Internet.
  { name: 'Carnival', kind: 'wifi', asns: [63526], lowConfidenceAsns: [150307] },
  { name: 'Dot Internet', kind: 'wifi', asns: [134732, 137985] },
  // AS17494 also carries transit for other ISPs.
  { name: 'BTCL', kind: 'wifi', asns: [45588, 45607, 131102], lowConfidenceAsns: [17494] },
  { name: 'ICC Communication', kind: 'wifi', asns: [58689, 58782] },
  { name: 'Race Online', kind: 'wifi', asns: [63969, 140978] },
  // AS132341 is DIGICON-IGW, possibly a gateway rather than retail space.
  { name: 'Digicon', kind: 'wifi', asns: [137967, 138417], lowConfidenceAsns: [132341] },
  { name: 'HelloTech', kind: 'wifi', asns: [138640] },
  { name: 'Antaranga', kind: 'wifi', asns: [132298] },
  { name: 'Delta Software & Communication', kind: 'wifi', asns: [152479] },
  { name: 'Sky View', kind: 'wifi', asns: [134806, 138482, 150731] },
  { name: 'BDCOM', kind: 'wifi', asns: [7565, 24122, 151651] },
  { name: 'KS Network', kind: 'wifi', asns: [59362] },
  { name: 'Triangle', kind: 'wifi', asns: [45766] },
  { name: 'Dhaka Fiber Net', kind: 'wifi', asns: [55492, 150793] },
];

/**
 * Upstream gateways (IIG/NTTN), wholesale carriers and internet exchanges.
 * Many small ISPs' customers appear under these ASNs, so they are never shown
 * as a Provider: a Reading from one of them gets Other until the person picks.
 */
export const UPSTREAM_ASNS: ReadonlySet<number> = new Set([
  58717, 132884, 132082, 138650, 137254, // Summit
  58682, 138676, 141440, 132580, 138951, // Level3 Carrier
  58715, 136233, // Earth Telecommunication
  10075, 153370, 58587, 134685, // Fiber@Home
  58601, // Aamra Technologies
  58752, // Delta Infocom
  17806, 58778, 132608, // Mango Teleservices
  63520, 132267, // Novocom
  18060, 132602, 139931, // BSCCL
  150178, 150774, // Exabyte
  23876, 18155, 140684, 138420, // internet exchanges
]);

export type Confidence = 'high' | 'low' | 'none';

export interface ProviderGuess {
  provider: string;
  /** 'none' means the person should be prompted to pick from the list. */
  confidence: Confidence;
}

const byAsn = new Map<number, { provider: Provider; confidence: Confidence }>();
for (const provider of PROVIDERS) {
  for (const asn of provider.asns) byAsn.set(asn, { provider, confidence: 'high' });
  for (const asn of provider.lowConfidenceAsns ?? []) byAsn.set(asn, { provider, confidence: 'low' });
}

const unknown: ProviderGuess = { provider: OTHER, confidence: 'none' };

/**
 * Guesses a Reading's Provider from its ASN and the Connection type the person confirmed.
 * The person can always override the result from {@link pickerList}.
 */
export function providerFromAsn(asn: number | undefined, connectionType: ConnectionType | null): ProviderGuess {
  if (asn === undefined || UPSTREAM_ASNS.has(asn)) return unknown;
  const match = byAsn.get(asn);
  if (!match) return unknown;
  const { provider, confidence } = match;
  // On mobile data, a Wi-Fi ISP's ASN means something is off: don't guess a Carrier.
  if (connectionType === 'mobile' && provider.kind !== 'mobile') return unknown;
  // On Wi-Fi, a Carrier's ASN usually means a phone hotspot: plausible, but confirm.
  if (connectionType === 'wifi' && provider.kind === 'mobile') return { provider: provider.name, confidence: 'low' };
  return { provider: provider.name, confidence };
}

/** The fixed list a person picks from to override a Provider, with Other last. */
export function pickerList(connectionType: ConnectionType): string[] {
  return [...PROVIDERS.filter((p) => p.kind === connectionType).map((p) => p.name), OTHER];
}
