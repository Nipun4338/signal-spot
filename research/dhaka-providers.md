# Which Providers serve Dhaka, and what are their ASNs?

Research for issue #11. Data pulled 2026-10-10.

## Recommended Provider list

This is the fixed list a person picks from when overriding a Reading's Provider, in display order. "Other" is always last. **ASNs** lists every ASN the Provider's organisation holds that currently announces routes. Each ASN in it should map to that Provider in the IP→ASN lookup.

| # | Provider | Kind | ASNs to map | Source |
|---|---|---|---|---|
| 1 | Grameenphone | mobile | AS24389 | APNIC whois ORG-GL6-AP; RIPEstat |
| 2 | Robi | mobile | AS24432 (also map AS38069, AS56138) | APNIC whois ORG-AL4-AP; RIPEstat |
| 3 | Banglalink | mobile | AS45245 | APNIC whois ORG-BG1-AP; RIPEstat |
| 4 | Teletalk | mobile | AS45925 | APNIC whois ORG-TBL1-AP; RIPEstat |
| 5 | Link3 | Wi-Fi | AS23688 | APNIC whois ORG-LTL6-AP; PeeringDB |
| 6 | Amber IT | Wi-Fi | AS23956 | APNIC whois ORG-DL5-AP; PeeringDB |
| 7 | Carnival | Wi-Fi | AS63526 (also map AS150307, unconfirmed) | APNIC whois ORG-SSDT2-AP; PeeringDB (alt name "Carnival Internet") |
| 8 | Dot Internet | Wi-Fi | AS134732 (also map AS137985) | APNIC whois ORG-DI3-AP; PeeringDB |
| 9 | BTCL | Wi-Fi | AS45588, AS17494, AS45607 (also map AS131102) | APNIC whois ORG-BTTB1-AP; PeeringDB |
| 10 | ICC Communication | Wi-Fi | AS58689 (also map AS58782) | APNIC whois ORG-IC1-AP; PeeringDB |
| 11 | Race Online | Wi-Fi | AS63969 (also map AS140978) | APNIC whois ORG-ROL1-AP |
| 12 | Digicon | Wi-Fi | AS137967, AS132341 (also map AS138417) | APNIC whois ORG-DTL2-AP |
| 13 | HelloTech | Wi-Fi | AS138640 | APNIC whois ORG-HL31-AP |
| 14 | Antaranga Dot Com | Wi-Fi | AS132298 | APNIC whois ORG-ADCL2-AP |
| 15 | Delta Software & Communication | Wi-Fi | AS152479 | APNIC whois ORG-DSAC1-AP |
| 16 | Sky View Online | Wi-Fi | AS134806, AS138482, AS150731 | APNIC whois ORG-SVO1-AP |
| 17 | BDCOM | Wi-Fi | AS7565, AS24122 (also map AS151651) | APNIC whois ORG-BOL2-AP |
| 18 | KS Network | Wi-Fi | AS59362 | APNIC whois ORG-KNL3-AP; PeeringDB |
| 19 | Triangle Services | Wi-Fi | AS45766 | APNIC whois ORG-TS7-AP; PeeringDB |
| 20 | Dhaka Fiber Net | Wi-Fi | AS55492 (also map AS150793) | APNIC whois ORG-DFNL1-AP; PeeringDB |
| — | Other | either | anything not above, **including upstream/IIG ASNs** (see below) | — |

"Also map" means the ASN is registered to the same organisation but RIPEstat showed it announcing nothing (with at least 3 RIS peers seeing it) on 2026-10-10. Putting it in the table costs nothing, and it keeps the mapping right if the ASN starts announcing later.

### How the list was chosen

- **Mobile:** these are the four Bangladeshi mobile operators. BTRC's June 2026 figures put their SIM counts at roughly 86.6M (GP), 58.6M (Robi), 37.9M (Banglalink) and 6.8M (Teletalk) ([BSS report of BTRC data](https://www.bssnews.net/news-flash/406665), [Financial Express](https://thefinancialexpress.com.bd/trade/internet-subscriber-growth-outpaces-mobile-connections-in-h1)). The confirmed ASNs check out. **Robi is the only Carrier with extra ASNs** (AS38069 AXIATA-AS-AP and AS56138), and neither currently announces routes. Grameenphone, Banglalink and Teletalk each hold just one ASN under their APNIC org.
- **Wi-Fi:** BTRC publishes only a national ISP+PSTN subscriber total (15.10M in June 2026, updated quarterly) and no per-ISP breakdown. As a stand-in for customer count I ranked ASNs by **APNIC Labs' per-AS user estimate for BD** ([stats.labs.apnic.net/cgi-bin/aspop?c=BD](https://stats.labs.apnic.net/cgi-bin/aspop?c=BD)). I kept the large retail ISPs whose APNIC org address is in Dhaka and dropped IIG/transit operators (see the next section). In that ranking Link3 is #7 (~543k), ICC #8, Antaranga #9, Amber IT #10, Carnival #15 (~291k), Dot Internet #16, BTCL #17, Delta S&C #18 and Sky View #19. Race Online (#4), Digicon (#5) and HelloTech (#6) rank above Link3 and are all Dhaka-registered. They are less well-known brands, but they belong in the list on that evidence.
- I could not get a list of BTRC ISP licensees: btrc.gov.bd failed TLS verification and has no machine-readable licensee list. The list above therefore rests on registry data (APNIC) and measurement data (APNIC Labs, RIPEstat). It is not checked against licence records.

## Readings whose ASN is an upstream / IIG

Bangladesh routes all international traffic through licensed **IIGs** (International Internet Gateways), and many small ISPs connect through an IIG or a NTTN (Nationwide Telecommunication Transmission Network) operator. When a small ISP uses its upstream's address space, its customers' IPs show up under the **upstream's** ASN. The APNIC Labs table shows this: Summit (AS58717), Level3 Carrier (AS58682), Earth Telecommunication (AS58715) and Exabyte (AS150774) each have 100k–250k estimated users. Almost none of those people are customers of the IIG brand itself.

These ASNs belong to upstreams or IIGs and should be treated as **upstream ASNs**:

| Operator | ASNs (org) | Notes |
|---|---|---|
| Summit Communications | AS58717, AS132884, AS132082, AS138650, AS137254 | IIG + NTTN; AS138650 is a NIX route server |
| Level3 Carrier | AS58682, AS138676, AS141440, AS132580, AS138951 | IIG; AS138951 "NIX" |
| Earth Telecommunication | AS58715, AS136233 | IIG (PeeringDB: NSP, 1-5 Tbps) |
| Fiber@Home | AS10075, AS153370 (Global); AS58587, AS134685 | IIG + NTTN |
| Aamra Technologies | AS58601 | IIG (Aamra Networks AS24323 is a separate retail/enterprise ISP) |
| Delta Infocom | AS58752 | "DELTA-IIG-BD" |
| Mango Teleservices | AS17806, AS58778, AS132608 | IIG ("Tire-1 IP Transit Provider") |
| Novocom | AS63520, AS132267 | IIG |
| BSCCL (submarine cable) | AS18060, AS132602, AS139931 | wholesale |
| Exabyte | AS150178, AS150774 | high user estimate, mostly downstream ISPs |
| Internet exchanges | AS23876 (BDNIX, BTCL org), AS18155, AS140684 (BDIX), AS138420 (Aamra IXP) | never a retail Provider |

**Recommended handling:**
1. Keep the `ASN → Provider` table only for retail Providers (the table at the top). Keep a separate `upstreamAsns` set for the operators above.
2. If a Reading's ASN is in `upstreamAsns`, or not in either table, auto-assign **Other** and mark the Provider as *unconfirmed*, so the UI nudges the person to pick from the list. Never auto-label it "Summit" or "Earth": the person has never heard of those companies, and the label would merge many different retail ISPs into one figure.
3. Optional later step: the prefix's whois `netname`/`descr` (RIPEstat `whois` or APNIC RDAP on the IP) often names the downstream ISP, even inside upstream space. That could become a *suggested* Provider, but only if it matches a name in the list; otherwise use Other.
4. BTCL is a special case. AS17494 (BTTB-AS-AP) is both BTCL's retail space and a transit ASN for others. Mapping it to BTCL is right most of the time, but treat it as low confidence and let the person override.
5. Mobile is less ambiguous. All four Carriers announce their own space, so an ASN match for a Carrier is high confidence. If the browser says the connection is mobile but the ASN isn't a Carrier ASN, still default to Other rather than guessing a Carrier.

## Details per Provider

Prefix counts come from RIPEstat `announced-prefixes` (min 3 RIS peers seeing), queried 2026-10-10. Org groupings come from APNIC whois inverse lookups (`-i org <ORG> -T aut-num`), which return every aut-num registered to that organisation.

| Provider | APNIC org (org-name, address) | ASN: v4 / v6 prefixes announced | APNIC Labs est. users (rank in BD) |
|---|---|---|---|
| Grameenphone | ORG-GL6-AP GrameenPhone Ltd. | AS24389: 80 / 94 | 4.02M (#2) |
| Robi | ORG-AL4-AP (Axiata Bangladesh / Robi) | AS24432: 54 / 97; AS38069: 0; AS56138: 0 | 4.51M (#1) |
| Banglalink | ORG-BG1-AP Banglalink Digital Communications | AS45245: 83 / 26 | 1.56M (#3) |
| Teletalk | ORG-TBL1-AP Teletalk Bangladesh | AS45925: 14 / 0 | 208k (#30) |
| Link3 | ORG-LTL6-AP Link3 Technologies Ltd, Gulshan | AS23688: 268 / 18 | 543k (#7) |
| Amber IT | ORG-DL5-AP Amber IT Limited, Gulshan | AS23956: 214 / 192 | 441k (#10) |
| Carnival | ORG-SSDT2-AP Systems Solutions & Development Technologies Ltd, Gulshan | AS63526: 47 / 2 | 291k (#15) |
| Carnival (?) | ORG-CCL22-AP Carnival Care Limited, Gulshan-1 | AS150307: 0 | — |
| Dot Internet | ORG-DI3-AP Dot Internet, Mohammadpur | AS134732: 52 / 18; AS137985: 0 | 288k (#16) |
| BTCL | ORG-BTTB1-AP BTCL | AS45588: 112 / 6; AS17494: 36 / 3; AS45607: 1 / 0; AS131102: 0; (AS23876 BDNIX: IX, exclude) | 279k (#17) |
| ICC Communication | ORG-IC1-AP ICC Communication, Mirpur 12 | AS58689: 29 / 9; AS58782: 0 | 457k (#8) |
| Race Online | ORG-ROL1-AP Race Online Ltd, Mohakhali | AS63969: 82 / 24; AS140978: 0 | 769k (#4) |
| Digicon | ORG-DTL2-AP Digicon Telecommunication Ltd, Banani | AS137967: 56 / 89; AS132341 (DIGICON-IGW): 2 / 0; AS138417 (NIX): 0 | 607k (#5) |
| HelloTech | ORG-HL31-AP HelloTech Limited, Dhanmondi | AS138640 | 548k (#6) |
| Antaranga Dot Com | ORG-ADCL2-AP Antaranga Dot Com Ltd, Shantinagar | AS132298 | 449k (#9) |
| Delta Software & Communication | ORG-DSAC1-AP, West Raja Bazar | AS152479: 10 / 31 | 264k (#18) |
| Sky View Online | ORG-SVO1-AP Sky View Online Ltd, Jatrabari | AS134806: 20 / 10; AS138482: 4 / 0; AS150731: 1 / 0 | 262k (#19) |
| BDCOM | ORG-BOL2-AP BDCOM Online Ltd, Dhanmondi | AS7565: 109 / 7; AS24122: 41 / 4; AS151651: 0 | not in top 70 |
| KS Network | ORG-KNL3-AP KS Network Ltd | AS59362: 30 / 24 | 127k (#47) |
| Triangle Services | ORG-TS7-AP Triangle Services Ltd | AS45766: 54 / 8 | 174k (#36) |
| Dhaka Fiber Net | ORG-DFNL1-AP Dhaka Fiber Net Ltd | AS55492: 22 / 43; AS150793: 0 | 82k (#69) |

Caveats:
- **Carnival.** PeeringDB lists "Carnival Internet" as the alternate name of Systems Solutions & Development Technologies Ltd (AS63526) ([PeeringDB net 18300](https://www.peeringdb.com/net/18300)). Carnival Care Limited (AS150307) is a separate APNIC org at a Gulshan-1 address. I found nothing in a primary source tying it to Carnival Internet. It announces nothing, so mapping it is harmless, but treat the link as unconfirmed.
- **KS Network** also has AS136498 (KS-AS-AP) and AS136561 (SUNC-AS-AP), named "KS Network Ltd" in RIPE's AS-name list. They sit under a different APNIC org from ORG-KNL3-AP, so I left them out. Check them before adding.
- **Digicon's AS132341** is named DIGICON-IGW. It may be the company's gateway ASN rather than retail. It announces only 2 prefixes, so mapping it to Digicon is low-risk.
- The APNIC Labs user estimates come from ad-based sampling. They show relative size well, but they are not subscriber counts.
- Not included but worth knowing about: Aamra Networks AS24323 (99 v4 prefixes, mostly enterprise), Windstream Communication AS139009/AS59203, Orange Communication AS135341/AS137453/AS134424, Plusnet AS137526, Business Network AS134204 and Stargate AS45905. These rank #11–#22 by APNIC users, but I didn't confirm whether they are Dhaka retail ISPs. They are candidates if the list should grow.

## How to reproduce

- AS names by country: `https://ftp.ripe.net/ripe/asnames/asn.txt` (grep `, BD$`). RIPEstat lists ~2,015 BD ASNs: `https://stat.ripe.net/data/country-resource-list/data.json?resource=BD`.
- Sibling ASNs: `whois -h whois.apnic.net -r -T aut-num AS<n>` to get `org:`, then `whois -h whois.apnic.net -r -i org -T aut-num <ORG-HANDLE>`.
- Announced prefixes: `https://stat.ripe.net/data/announced-prefixes/data.json?resource=AS<n>&min_peers_seeing=3`.
- Users per AS: `https://stats.labs.apnic.net/cgi-bin/aspop?c=BD`.
- Network type and traffic: `https://www.peeringdb.com/api/net?asn=<n>`.
- Live per-AS views for a manual check: `https://bgp.he.net/AS<n>`.

## Sources

- APNIC whois (whois.apnic.net), aut-num and organisation objects, queried 2026-10-10.
- RIPEstat Data API: [country-resource-list](https://stat.ripe.net/data/country-resource-list/data.json?resource=BD), [announced-prefixes](https://stat.ripe.net/docs/data_api#announced-prefixes).
- RIPE NCC AS names: <https://ftp.ripe.net/ripe/asnames/asn.txt>
- APNIC Labs, AS user estimates for BD: <https://stats.labs.apnic.net/cgi-bin/aspop?c=BD>
- PeeringDB API: <https://www.peeringdb.com/api/net>; Carnival: <https://www.peeringdb.com/net/18300>
- BTRC subscriber figures for June 2026, via [BSS](https://www.bssnews.net/news-flash/406665) and [The Financial Express](https://thefinancialexpress.com.bd/trade/internet-subscriber-growth-outpaces-mobile-connections-in-h1). I couldn't reach the BTRC site itself (TLS certificate error).
