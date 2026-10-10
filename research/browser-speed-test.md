# How do we measure download, upload and latency in the browser?

Research for issue #3. Researched 2026-10-10.

## Answer

**Use `@cloudflare/speedtest` (MIT) against Cloudflare's `speed.cloudflare.com` endpoints, with a trimmed measurement sequence, and store the Cloudflare PoP (`cf-meta-colo`) with every Reading.** Keep M-Lab ndt7 as the fallback if Cloudflare ever objects or blocks us, and self-hosted LibreSpeed as the option for later if we need full control.

Why:

- **Practical.** The endpoints already send `Access-Control-Allow-Origin: *` and `Timing-Allow-Origin: *`, and they return a `Server-Timing` header. A third-party page can therefore take accurate `PerformanceResourceTiming` measurements without any backend of our own. Cloudflare's own library is built to run against them by default.
- **Close to the user.** Cloudflare has PoPs in Dhaka (DAC) and Chittagong (CGP). M-Lab has no servers in Bangladesh; its nearest are in New Delhi and Chennai.
- **Data cost is controllable.** The library takes the measurement sequence as config, so we can cap how much data a Reading uses on mobile. ndt7 always runs for about 10 s per direction, however fast the line is.
- **Main risk: terms.** Cloudflare publishes **no explicit terms that permit or forbid** third-party sites using `speed.cloudflare.com`. Cloudflare also collects the results itself. ndt7 is the only option that explicitly permits third-party clients, but it comes with obligations (see below).

Recommended setup for a Reading:

- Skip packet loss. It needs our own TURN server.
- Use roughly this sequence: 1 latency, 20 latency, 100 kB×10, 1 MB×8, 10 MB×6 for download; 100 kB×8, 1 MB×6, 10 MB×4 for upload.
- Set `bandwidthAbortRequestDuration` so slow mobile links don't hang.
- Report unloaded latency (p50) as the Reading's latency, and keep loaded latency as an extra field.

This sequence tops out at about 70 MB down and 50 MB up, and much less on links under ~20 Mbps, because the engine stops escalating once a request runs ≥1 s (see "Data cost").

## Options compared

| | Cloudflare (`@cloudflare/speedtest` → speed.cloudflare.com) | M-Lab ndt7 (`@m-lab/ndt7`) | LibreSpeed (self-hosted) |
|---|---|---|---|
| Client licence | MIT, v1.14.1 on npm | Apache-2.0, v0.1.5 on npm | LGPL-3.0, v6.3.0 (2026-09-12) |
| Transport | HTTPS GET/POST, several sequential requests | One WebSocket/TLS stream per direction | XHR in a Web Worker, 6 parallel download / 3 upload streams |
| Download/upload calc | Per request: `transferSize`·8 / (duration − server time), **p90** across requests | App-level goodput over a ~10 s run. Server also reports kernel `TCP_INFO` (BBR) | Bytes over the time window × 1.06 overhead factor |
| Latency calc | TTFB of 0-byte requests (`requestStart`→`responseStart`), **p50**. Also loaded latency and jitter | Server-side `TCPInfo.MinRTT` / `RTT` (kernel, µs) | HTTP request timing (not ICMP), 10 pings |
| Test duration | Adaptive. Stops escalating once a request runs ≥1 s | ≤10 s per direction (hard cap 13 s) → ~20 s total | 15 s per direction by default; `time_auto` shortens fast links |
| Nearest server to Dhaka | Anycast: Dhaka (DAC) and Chittagong (CGP) PoPs | New Delhi (del02/04/06), then Chennai, Mumbai, Singapore | Wherever we host it |
| Third-party use allowed? | **Not stated.** No published terms for the endpoints. Results are collected by Cloudflare | **Yes, explicitly**, with AUP obligations | Yes. It's our own server |

## Details

### Cloudflare: `@cloudflare/speedtest`

- It is the engine behind speed.cloudflare.com. By default it measures against `speed.cloudflare.com/__down` and `/__up`, using the `PerformanceResourceTiming` API. ([README](https://github.com/cloudflare/speedtest))
- The default sequence ramps download sizes from 100 kB up to 250 MB and upload sizes up to 50 MB. A direction stops escalating once a request reaches `bandwidthFinishRequestDuration` (default 1000 ms). Bandwidth is the 90th percentile (`bandwidthPercentile: 0.9`), and requests under 10 ms are ignored. Latency is the 50th percentile of time-to-first-byte. Server processing time is subtracted using the `server-timing` header. ([README config table](https://github.com/cloudflare/speedtest#config-options))
- Loaded latency (bufferbloat) is measured during transfers of ≥250 ms, with probes spaced 400 ms apart. ([README](https://github.com/cloudflare/speedtest))
- Packet loss needs a TURN server. The README warns: "The public TURN server for Packet Loss testing is deprecated and will be discontinued soon." ([README](https://github.com/cloudflare/speedtest))
- The README states: "measurement results are collected by Cloudflare on completion for the purpose of calculating aggregated insights regarding Internet connection quality." We must disclose this in our own privacy notice. ([README](https://github.com/cloudflare/speedtest))
- **Checked live on 2026-10-10:**
  - `GET https://speed.cloudflare.com/__down?bytes=1000` with a foreign `Origin` returns `Access-Control-Allow-Origin: *`, `timing-allow-origin: *` and `Cache-Control: no-store, no-transform`.
  - It also returns `Server-Timing` (`cfSpeedEdge`, `cfSpeedWorker`, and `cfL4` with a server-side TCP `min_rtt`) and exposes the `cf-meta-colo/asn/city/...` headers.
  - Preflight on `/__up` returns 204 and allows `POST` from any origin.
- **Terms of use:** the speed.cloudflare.com page links only to Cloudflare's [Website Terms](https://www.cloudflare.com/website-terms/) and [Privacy Policy](https://www.cloudflare.com/privacypolicy/).
  - The Website Terms don't name the speed test among their "Online Services".
  - They forbid activity that would "overburden" Cloudflare servers or APIs, and forbid exceeding or circumventing limits.
  - No document grants third-party sites the right to use the endpoints. The open CORS policy and the MIT library defaulting to them suggest it is tolerated, but that is an inference, not permission.
  - Mitigation: keep traffic modest (one user-initiated test, capped sizes), make the endpoint URLs configurable (`downloadApiUrl` / `uploadApiUrl`), and be ready to point them at our own Worker or LibreSpeed.

### M-Lab ndt7

- Protocol: WebSocket over TLS, one TCP connection. The spec says "The maximum runtime of a test should be ten seconds since the WebSocket handshake completed", with a 13 s hard cap. The server may stop early. Kernel `TCP_INFO` gives `MinRTT` and smoothed `RTT`, and BBR is used where available. ([ndt7 spec](https://github.com/m-lab/ndt-server/blob/main/spec/ndt7-protocol.md))
- Clients must find a server via the Locate API v2. Its URLs carry a short-lived `access_token`. Clients must not hard-code a server. ([ndt7 spec](https://github.com/m-lab/ndt-server/blob/main/spec/ndt7-protocol.md), [Develop](https://www.measurementlab.net/develop/))
- The JS client needs `userAcceptedDataPolicy: true`, which means the user must have accepted M-Lab's data policy. It reports both `client` and `server` measurements. ([ndt7-js](https://github.com/m-lab/ndt7-js))
- **Terms ([AUP](https://measurementlab.net/aup/), [Develop](https://www.measurementlab.net/develop/)):** third-party clients are explicitly allowed. The obligations:
  - Tests must be "actively initiated based on informed consent".
  - We must link to M-Lab's policies and publish a privacy policy consistent with theirs, including GDPR.
  - M-Lab publishes the client's public IP address, and all data is public without restriction.
  - "Interactive users must not run more than 40 tests per day". A 204 response means no capacity.
  - Commercial integrators must contribute through financial sponsorship or in-kind contributions.
  - Offering incentives to run a test is "strictly prohibited". That matters if we ever gamify Readings.
  - The service is best-effort, so integrations must fail gracefully.
- **Nearest server:** checked live 2026-10-10. `locate.measurementlab.net/v2/nearest/ndt/ndt7?region=BD`, and the same query with Dhaka coordinates, returns only New Delhi and Chennai machines. M-Lab's site list has no Bangladesh sites; the nearest are del, maa, bom and sin. ([siteinfo](https://siteinfo.mlab-oti.measurementlab.net/v2/sites/sites.json))

### LibreSpeed (self-hosted)

- LGPL-3.0, using XHR and Web Workers. It needs a web server (Apache/nginx/IIS) running PHP or another backend, with an optional database. It also needs "A fast! internet connection" on the server, because the server's bandwidth caps what any test can show. ([repo](https://github.com/librespeed/speedtest))
- Defaults ([doc.md](https://github.com/librespeed/speedtest/blob/master/doc.md)):
  - `time_dl_max` 15 s, `time_ul_max` 15 s, and `time_auto: true`. The docs describe `time_auto` as shortening tests on faster connections "to avoid wasting data".
  - `xhr_dlMultistream` 6 and `xhr_ulMultistream` 3.
  - `count_ping` 10, `overheadCompensationFactor` 1.06.
  - "The Ping/Jitter test is NOT an ICMP ping."
- Terms: none needed, since it's our server. The cost is a well-peered host in Dhaka plus egress bandwidth, which is the expensive part (every Reading pulls tens of MB). Its docs cover only self-hosting, not third-party use of librespeed.org's demo servers, so don't use those.

## Accuracy pitfalls

1. **Server distance and routing beat everything.** Latency is measured to the test server, not to "the internet". Throughput on one TCP stream falls as RTT rises. An in-country PoP does not guarantee the shortest path, because anycast routing depends on the ISP. One check from a Bangladesh connection on 2026-10-10 (one ISP, n=5, not representative):
   - `speed.cloudflare.com` was served from **CGP** with TCP connect RTT ~55 ms (Cloudflare's own `cfL4 min_rtt` ≈ 52 ms).
   - M-Lab New Delhi measured ~37 ms and Chennai ~70–90 ms.
   - **So store the server/PoP with every Reading** (`cf-meta-colo` is exposed to JS). Only compare Readings like-for-like, or at least flag outliers.
2. **Upload in browsers is the hardest number.** The browser buffers outgoing bytes, so "sent" ≠ "delivered". Cloudflare uses per-request resource timing plus server time. ndt7 prefers the **server's** measurement for upload, and its spec says servers SHOULD send measurements during uploads so clients get reliable upload rates. Trust ndt7's server-side upload number over its client-side one.
3. **TTFB/HTTP "ping" ≠ ICMP ping.** Neither Cloudflare nor LibreSpeed can send ICMP from a browser. The first request includes DNS, TCP and TLS setup. Discard warm-up requests and use the median of many (Cloudflare's p50 of 20 does this). Expect HTTP latency to read a few ms above a native ping.
4. **Single vs multiple streams.** ndt7 uses one stream, so it shows what one TCP flow gets. That is lower than multi-stream tools on lossy or high-RTT links. LibreSpeed uses 6 parallel streams, and Cloudflare runs sequential requests over a reused connection. Results from different engines can't be compared, so **pick one engine and never mix engines in a Spot's figures**.
5. **Short tests under-read fast links.** TCP slow start means small transfers never reach full rate. Cloudflare drops requests under 10 ms and reports p90. ndt7 needs its ~10 s. If we cap sizes for data cost, very fast Wi-Fi (>200 Mbps) will under-read slightly. That's acceptable for comparing Spots.
6. **Device and browser limits.** Phone CPU, battery saver, background tabs (timers get throttled) and Wi-Fi signal at the exact Point all show up in the number. Run the test in the foreground, warn when the tab is hidden, and record connection type.
7. **Middleboxes.** Mobile carriers can use performance-enhancing proxies. The ndt7 spec notes that an unusually low RTT on 2G/3G "may indicate a performance-enhancing proxy". Cloudflare responses are `no-store, no-transform`, which guards against caching and compression.

## Data cost on mobile

Data used ≈ rate × time per direction. Rough figures:

| Link | Cloudflare (trimmed sequence above) | ndt7 (~10 s each way) | LibreSpeed (15 s each way, `time_auto` off) |
|---|---|---|---|
| 5 Mbps | ~9 MB down + ~7 MB up (stops after the 1 MB step) | ~6 MB down + ~6 MB up | ~9 MB + ~9 MB |
| 20 Mbps | ~69 MB down + ~47 MB up (reaches the 10 MB step) | ~25 MB + ~25 MB | ~38 MB + ~38 MB |
| 100 Mbps | ~70 MB + ~47 MB (capped by the sequence) | ~125 MB + ~125 MB | ~190 MB + ~190 MB |

Cloudflare's default sequence is not suitable for mobile. If every step runs, it can pull ~970 MB down, because it escalates to 100 MB and 250 MB requests on fast links. Always pass a custom `measurements` array. Show the user an estimate ("this test uses up to ~X MB") before starting a mobile Reading. That also covers M-Lab's informed-consent requirement if we fall back to ndt7.

## Test duration

- Cloudflare trimmed: roughly 8–20 s, depending on link speed and RTT. Each step is sequential, and latency probes add ~1–2 s.
- ndt7: about 20 s plus Locate lookup (download ≤10 s, then upload ≤10 s).
- LibreSpeed: up to 30 s plus pings by default. `time_auto` shortens this on fast links.

## Sources

- Cloudflare speedtest library: https://github.com/cloudflare/speedtest (README, LICENSE); npm `@cloudflare/speedtest` 1.14.1
- Cloudflare Website Terms: https://www.cloudflare.com/website-terms/ · Privacy: https://www.cloudflare.com/privacypolicy/
- Cloudflare PoP list (DAC, CGP): https://www.cloudflarestatus.com/api/v2/components.json
- Live headers: `https://speed.cloudflare.com/__down?bytes=1000`, `https://speed.cloudflare.com/cdn-cgi/trace`
- ndt7 protocol spec: https://github.com/m-lab/ndt-server/blob/main/spec/ndt7-protocol.md
- ndt7-js: https://github.com/m-lab/ndt7-js
- M-Lab AUP: https://measurementlab.net/aup/ · Developing with M-Lab: https://www.measurementlab.net/develop/
- M-Lab Locate v2: https://locate.measurementlab.net/v2/nearest/ndt/ndt7 · Sites: https://siteinfo.mlab-oti.measurementlab.net/v2/sites/sites.json
- LibreSpeed: https://github.com/librespeed/speedtest · Docs: https://github.com/librespeed/speedtest/blob/master/doc.md
