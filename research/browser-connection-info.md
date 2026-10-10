# What can a browser tell us about the connection it's on?

Research for issue #4. Researched 2026-10-10. Vocabulary follows `CONTEXT.md` (Reading, Point, Connection type, Carrier).

## Direct answer

| Reading field | Detect automatically? | How | Ask the person? |
|---|---|---|---|
| **Connection type** (Wi-Fi vs mobile) | **Only on Android Chrome/Chromium**, via `navigator.connection.type` (`"wifi"` / `"cellular"` / ...). Not in desktop Chrome/Edge (ChromeOS only), and not in Safari, Firefox, or any iOS browser. | Network Information API | **Yes, always confirm it.** Pre-fill the answer when `type` is available, but treat it as a default, not as the stored truth. |
| **Carrier** | **Usually, on the server side**, from the client IP's ASN: Grameenphone AS24389, Robi AS24432, Banglalink AS45245, Teletalk AS45925. | Cloudflare `request.cf.asn`, or a self-hosted IPinfo Lite / GeoLite2 ASN lookup | **Show it and let them correct it.** It's wrong behind a VPN, iCloud Private Relay, or another proxy, and it reports the *upstream* carrier when a laptop is on a phone hotspot. |
| **Point** | **Yes, with permission.** Use the Geolocation API (HTTPS only, needs the person's express permission) and record `coords.accuracy`, a 95%-confidence radius in metres. | `navigator.geolocation.getCurrentPosition({enableHighAccuracy: true})` | **Yes, when accuracy is poor, permission is denied, or they're indoors:** let them drag or confirm the Point on the map. |
| Download / upload / latency | Measure them ourselves. `navigator.connection.downlink`/`rtt` are coarse estimates, clamped (≤10 Mbps, ≤3000 ms) and Chromium-only, so they're useless for a Reading. | Our own speed test | No |

**What the person must tell us manually:**
1. **Connection type** on iOS (any browser), desktop, and Firefox. Confirm it everywhere, because a phone hotspot reports `wifi` and a USB-tethered laptop reports `ethernet`/`unknown`.
2. **Carrier** whenever the ASN isn't one of the four mobile ASNs, or they're on a VPN or relay. They should be able to override it always.
3. **Point** when they deny location, when `accuracy` is above a threshold we pick (for example >100 m), or by choice. Indoor fixes come from Wi-Fi/cell positioning rather than GPS and can be off by tens of metres or more.
4. **Spot** (which café or library): never inferable.

Recommended flow: auto-detect everything we can, show a one-screen "Is this right?" summary (`Mobile · Grameenphone · here on the map`), and store whether each field was *detected* or *user-entered*.

---

## 1. Connection type: the Network Information API

**What it exposes.** `navigator.connection` (`NetworkInformation`) has:
- `type`: `bluetooth | cellular | ethernet | mixed | none | other | unknown | wifi | wimax`
- `effectiveType`: `slow-2g | 2g | 3g | 4g`
- `downlink`, `rtt`, `saveData`, and a `change` event.

It's a WICG (community group) draft, not a W3C standard, and MDN marks it experimental and not Baseline.
- Spec: https://wicg.github.io/netinfo/
- MDN: https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/type

**Support** (from MDN browser-compat-data, `api/NetworkInformation.json`, https://github.com/mdn/browser-compat-data/blob/main/api/NetworkInformation.json):

| Browser | `navigator.connection` | `type` | `effectiveType` / `downlink` / `rtt` |
|---|---|---|---|
| Chrome Android (incl. Samsung Internet, mirrored) | 38+ | **38+ (works)** | 38+ |
| Chrome desktop | 61+ | **ChromeOS only** ("partial_implementation: Only supported on ChromeOS") | 61+ |
| Edge desktop | mirrors Chrome | **not supported** | yes |
| Safari macOS / iOS | **not supported** | no | no |
| Firefox desktop / Android | removed (desktop 32, Android 99) | no | no |

**iOS: no browser can provide it.** App Store Review Guideline 2.5.6 requires iOS browsers to use WebKit, with an alternative-engine entitlement only in the EU and Japan, so Chrome on an iPhone in Bangladesh is Safari's engine and gets no `navigator.connection` (https://developer.apple.com/app-store/review/guidelines/#2.5.6). WebKit lists the Network Information API among features it has deliberately not implemented "due to fingerprinting, security, and other concerns" (https://webkit.org/tracking-prevention/). Its WebKit bug is https://webkit.org/b/185697.

**`effectiveType`/`downlink`/`rtt` aren't real measurements.** `effectiveType` is derived from recently observed RTT and throughput and buckets everything fast as `4g`, so fibre reads `4g` too (https://developer.chrome.com/blog/new-in-chrome-62#network-quality; spec section on `effectiveType`). Chrome caps `downlink` at 10 Mbps and `rtt` at 3000 ms "as a non-standard anti-fingerprinting measure" (BCD notes). Don't use them as Reading values, and don't use `effectiveType` to guess Wi-Fi vs mobile.

**Caveat on `type`:** it describes the device's *first hop*:
- A laptop on a phone hotspot reports `wifi` even though the bytes go over mobile data.
- A phone on a pocket router does the same.

That's why the person should confirm it.

## 2. Geolocation: accuracy and permissions

Source: the W3C Geolocation spec, Candidate Recommendation Snapshot 2026-03-26 (it was a Recommendation in 2022 and was moved back to CR for iteration) — https://www.w3.org/TR/geolocation/

**Secure context only.** On plain HTTP, requests fail with `PERMISSION_DENIED`.

**Permission:**
- The permission name is `"geolocation"` and needs the person's express permission. The browser decides the prompt UI and how long a grant lasts; the spec recommends one session by default.
- A third-party iframe needs `allow="geolocation"` (Permissions-Policy default allowlist `'self'`).
- `navigator.permissions.query({name: "geolocation"})` lets us check the state before prompting (Safari 16+, per BCD `api/Permissions.json`).

**Accuracy:**
- `coords.accuracy` is in metres at **95% confidence**, so store it with every Point.
- `enableHighAccuracy: true` is only a hint to use GPS-class sources. It's slower and uses more power, and the browser may ignore it.
- `maximumAge` defaults to 0 (no cached fix). `timeout` defaults to effectively infinite, so set a timeout, for example 10–15 s, and handle error code 3 (`TIMEOUT`) and code 2 (`POSITION_UNAVAILABLE`).

**Indoors vs outdoors.** The web API doesn't reveal which positioning source was used, only `accuracy`. Android's own docs describe the source mix: high-accuracy mode uses GPS + Wi-Fi + cell + sensors, balanced mode "very rarely uses GPS" and relies on Wi-Fi + cell, and low-power mode is cell-only, "coarse (city-level)" (https://developer.android.com/develop/sensors-and-location/location/battery). Indoors, GPS is mostly blocked, so the fix falls back to Wi-Fi/cell positioning. Expect `accuracy` in the tens to hundreds of metres indoors versus metres outdoors.

These numbers are not from a primary source. They're general engineering knowledge, not a published spec figure, so verify them with field tests in Dhaka. Desktop browsers have no GPS and use network (Wi-Fi/IP) positioning. Firefox, for example, uses Google's location service (BCD `api/Geolocation.json` notes).

**Implication:** for a café-level map, always show the fix on the map with its accuracy circle, and let the person nudge the Point or attach a Spot.

## 3. Carrier from the client IP's ASN

**The four mobile operators' ASNs** (holder names from RIPEstat, which reflects APNIC registry/BGP data, checked 2026-10-10; all currently announced):

| Carrier | ASN | Registry holder | Announced prefixes |
|---|---|---|---|
| Grameenphone | AS24389 | GRAMEENPHONE-AS-AP - GrameenPhone Ltd. | 174 |
| Robi (Axiata) | AS24432 | AXIATA-ROBI-AS-AP - TM International Bangladesh Ltd. | 151 |
| Banglalink | AS45245 | banglalink-AS - Banglalink Digital Communications Ltd | 109 |
| Teletalk | AS45925 | TELETALK-BD - ASN For Teletalk Bangladesh Ltd. | 14 |

Sources: https://stat.ripe.net/data/as-overview/data.json?resource=AS24389 (and the same URL for each ASN), plus `announced-prefixes`.

Note: AS24556 is Bijoy Online, not Teletalk.

**Approach:** keep a hand-maintained map `{24389: "Grameenphone", 24432: "Robi", 45245: "Banglalink", 45925: "Teletalk"}`. Any other ASN (for example Link3 AS23688, BTCL AS17494, or other home ISPs) means "not a known Carrier", which is consistent with a Wi-Fi Reading or a VPN. We don't need the AS *organisation name*, only the number, so any ASN source works.

**Where it goes wrong:**
- **VPNs and proxies:** the ASN is the VPN provider's.
- **iCloud Private Relay** (Safari, when the person has iCloud+): the site sees a relay IP shared by many users that keeps the region and approximate city but not the carrier. Geo-IP providers may label it "iCloud Private Relay". Apple publishes the egress ranges at https://mask-api.icloud.com/egress-ip-ranges.csv (https://developer.apple.com/support/prepare-your-network-for-icloud-private-relay/). We can detect it and fall back to asking.
- **Hotspot / pocket router:** the ASN is correct for the carrier, but the device says `wifi`.
- **Carrier-owned fixed or enterprise services** on the same ASN can't be distinguished by ASN alone. That's another reason Connection type comes from the device or the person, not the IP.

**Which lookup to use:**

| Option | Cost / licence | Self-hostable | Notes |
|---|---|---|---|
| **Cloudflare Workers `request.cf.asn` / `asOrganization`** | Included with Workers | n/a, it's the edge | Zero extra infra if the API runs on Workers. Not populated in the dashboard preview; test on a deployed Worker. https://developers.cloudflare.com/workers/runtime-apis/request/ |
| **IPinfo Lite** | Free, no card, unlimited API; **CC BY-SA 4.0** (attribution required, e.g. "IP address data is powered by IPinfo") | **Yes**: CSV / MMDB / JSON / Parquet download, updated daily | Fields `asn`, `as_name`, `as_domain`, country. https://ipinfo.io/lite |
| **MaxMind GeoLite2 ASN** | Free with an account and licence key; GeoLite EULA (you must delete old copies within 30 days of a new release; attribution required) | **Yes**: `.mmdb` via `geoipupdate`, or CSV (30 downloads/day) | Web service capped at 1000 lookups/day. https://dev.maxmind.com/geoip/geolite2-free-geolocation-data/ |

**Recommendation:**
- If the backend runs on Cloudflare Workers, use `request.cf.asn` and map the four ASNs. No database and no licence obligations.
- Otherwise, self-host the **IPinfo Lite MMDB**: daily updates, no account, permissive licence beyond attribution, and the same MMDB reader libraries as MaxMind.
- Either way, look the ASN up **server-side when the Reading is submitted** (the client can't see its own public IP reliably), and store the raw ASN alongside the derived Carrier so we can re-map it later.

## Open questions / to verify in the field
- How often does `navigator.connection.type` read `wifi` for hotspot users in Dhaka? Measure the rate of person overrides.
- Typical `coords.accuracy` indoors in Dhaka cafés on Android Chrome vs iOS Safari. Pick the "ask to adjust the Point" threshold from that data.
- Whether any of the four operators announce mobile traffic from additional ASNs (for example from mergers, such as the former Airtel Bangladesh into Robi). Check the ASNs of our first real Readings against the table.
