# What can a browser measure about Wi-Fi quality inside a Home?

Research for issue #13. Researched 2026-10-10 against specs, browser source code and first-party docs.

## Answer

**Rank Rooms with a device-to-device test over a WebRTC data channel. Keep the internet Reading as a secondary signal. Don't rely on the Network Information API.**

1. **Primary signal: a device-to-device link test.** The person opens Signal Spot on two of their own devices on the same Wi-Fi. They leave one, the *anchor*, next to the router (best: a laptop plugged into the router by Ethernet). They carry the other from Room to Room. The two pages connect over WebRTC data channels and measure:
   - throughput in both directions, on a reliable channel;
   - RTT and jitter, from app-level pings on an unordered channel with `maxRetransmits: 0`;
   - packet loss, from sequence numbers on that same unreliable channel;
   - `currentRoundTripTime` from `getStats()`, as a cross-check.

   This traffic never reaches the internet, so the person's plan does not cap it. What limits it is the Wi-Fi link in that Room.
2. **Force the traffic to stay on the LAN.** Create the `RTCPeerConnection` with `iceServers: []`, which means no STUN and no TURN. The browser can then gather only host candidates, so a connection can only form across the local network. After it connects, check in `getStats()` that the selected candidate pair is `host`/`prflx` and never `srflx`/`relay`. If it fails to connect, tell the person why: guest network, client/AP isolation, or the two devices on different networks.
3. **Signalling: a Durable Object WebSocket "pairing room", joined by QR code.** The anchor page shows a QR code that holds a URL with a random, short-lived pairing code. The person scans it with the phone's normal camera app, so no scanner inside the page is needed. The two pages swap SDP and candidates through the Durable Object and then talk directly to each other. Because Pages projects cannot host a Durable Object themselves, it needs a small separate Worker bound to the Pages project.
4. **Secondary signal, available with one device: repeated latency and jitter probes to the nearby Cloudflare PoP (Dhaka or Chittagong).** Measure both idle latency and loaded latency (latency during the download). Even when the plan caps throughput, a weak Room usually shows up here. The internet path also adds its own noise, though, so treat this as a weaker, tie-breaking signal. Also keep the download figure: when a Room's Wi-Fi drops below the plan rate, it does show up as lower download.
5. **Network Information API: don't use it to rank Rooms.** It works only in Chromium and does not exist in Safari. Chromium caps `downlink` at 10 Mbps, rounds `rtt` to 50 ms, adds ±10% noise per site, and excludes traffic to private addresses. No browser API exposes signal strength, SSID, link rate or band.

**The least we ask of the person:** two devices with a browser on the same Wi-Fi. Leave one by the router with the page open and the screen on, scan its QR code once with the other, then take a Reading in each Room. Signal Spot needs no install and no account for this. If the person has only one device, fall back to the internet Reading (point 4), and label it as less able to tell Rooms apart.

**Score each Room by** the median device-to-device throughput from the walking device to the anchor and back. Use p95 RTT and the loss rate as penalties and tie-breakers. Near the router, a data channel may hit its own throughput ceiling before the Wi-Fi does (see the throughput section below), so the best few Rooms can tie on throughput. That is when latency and loss are needed to separate them.

---

## 1. Device-to-device over WebRTC data channels

### Does the traffic stay on the LAN?

- **Pages without camera or microphone access hide host IPs.** Chrome replaces private IPs in host candidates with random `<uuid>.local` mDNS names. It does this for every site except those with getUserMedia permission ([Chrome PSA, Aug 2019](https://groups.google.com/g/discuss-webrtc/c/6stQXi72BEU/m/2FwZd24UAQAJ)). The feature is still on by default: `BASE_FEATURE(kWebRtcHideLocalIpsWithMdns, base::FEATURE_ENABLED_BY_DEFAULT)` ([Chromium `third_party/blink/common/features.cc`](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/third_party/blink/common/features.cc), crbug.com/878465).
- **Safari also uses mDNS names by default.** In WebKit, `ICECandidateFilteringEnabled` defaults to `true` ([UnifiedWebPreferences.yaml](https://github.com/WebKit/WebKit/blob/main/Source/WTF/Scripts/Preferences/UnifiedWebPreferences.yaml)). The network manager maps that filter flag straight onto mDNS candidates: `setICECandidateFiltering(bool doFiltering) { m_useMDNSCandidates = doFiltering; }` ([LibWebRTCNetworkManager.h](https://github.com/WebKit/WebKit/blob/main/Source/WebKit/WebProcess/Network/webrtc/LibWebRTCNetworkManager.h)). Each host IP is registered as an mDNS name for that document only ([LibWebRTCNetworkManager.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebKit/WebProcess/Network/webrtc/LibWebRTCNetworkManager.cpp)). WebKit's original 2017 policy exposed no host candidates at all without capture access ([WebKit blog, "A Closer Look Into WebRTC"](https://webkit.org/blog/7763/a-closer-look-into-webrtc/)). The mDNS names were added later so local connections could still work.
- **Chrome on Android phones probably sends raw private IPs.** Chromium builds its mDNS support only on desktop OSes, Apple platforms and "desktop Android": `enable_mdns = is_win || is_linux || is_chromeos || is_fuchsia || is_apple || enable_desktop_android_extensions` ([`net/features.gni`](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/net/features.gni)). A Chrome engineer said the same in 2019: the mDNS stack was not built into Chrome on Android, so it sends plain-IP candidates ([discuss-webrtc thread](https://groups.google.com/g/discuss-webrtc/c/6stQXi72BEU/m/7qVwleLiBwAJ)). *I infer from these two sources that this still holds; I did not test it on a device.* Either way, connectivity works.
- **A local connection still forms with mDNS names.** Only one side needs to resolve the other's name: "A direct connection is still possible, but only if at least one side can properly resolve the provided mDNS candidates" ([draft-ietf-mmusic-mdns-ice-candidates-03 §5.1](https://datatracker.ietf.org/doc/html/draft-ietf-mmusic-mdns-ice-candidates#section-5.1)). The side that resolves sends connectivity checks, and the other side learns its address as a peer-reflexive (`prflx`) candidate (§5.3). If no name resolves, a candidate is ignored (§3.2.1). ICE then falls back to NAT hairpinning or TURN (§5.1). With `iceServers: []` neither fallback exists, so the attempt simply fails rather than silently leaving the LAN. In Google's testing, enabling mDNS on both sides cut the connection rate by 2% (relative) ([PSA](https://groups.google.com/g/discuss-webrtc/c/6stQXi72BEU/m/2FwZd24UAQAJ)).
- **Possible future permission prompt in Chrome.** Chrome's Local Network Access permission (prompt shipped in Chrome 142) covers fetches, subresources and subframes. The Chrome team says "WebRTC ... connections to the local network are not yet gated on the LNA permission" and plans to extend it to WebRTC "soon" ([Chrome blog, Local Network Access](https://developer.chrome.com/blog/local-network-access); [blink-dev Intent to Ship](https://groups.google.com/a/chromium.org/g/blink-dev/c/cwu_RUmBpzY/m/JWenvGViCAAJ)). Expect a possible permission prompt on the LAN connection in future Chrome versions. Firefox is working on the same idea ([Bugzilla 1969916](https://bugzilla.mozilla.org/show_bug.cgi?id=1969916)).
- **Networks where it can't work.** Guest networks and routers with "AP/client isolation" turned on block device-to-device traffic. Networks that block multicast (UDP 5353) stop mDNS from resolving. In both cases the right response is a clear error, not a fallback that leaves the LAN.

### Signalling

- **Durable Objects fit well.** A Durable Object can accept many WebSockets with `ctx.acceptWebSocket()` and list them with `ctx.getWebSockets()`, so two peers can relay offer, answer and candidates through it. With the Hibernation API, clients stay connected while the object is out of memory, and "Billable Duration (GB-s) charges do not accrue during hibernation" ([DO WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)).
- **It needs a separate Worker.** "You cannot create and deploy a Durable Object within a Pages project." It must live in a separate Worker that is bound to the Pages project ([Pages Functions bindings](https://developers.cloudflare.com/pages/functions/bindings/)).
- **Where the object runs doesn't matter.** A Durable Object is created near its first request; the region hint for this part of Asia is `apac` ([DO data location](https://developers.cloudflare.com/durable-objects/reference/data-location/)). The Durable Object only carries a few kilobytes of setup messages, so its location does not affect any measurement.
- **The QR code carries only a pairing code, not SDP.** Putting the full SDP into QR codes would need a scan in each direction (offer, then answer), and SDP is long. A QR code with a short pairing URL is simpler. It also needs no scanner in the page, which matters because `BarcodeDetector` is only behind a flag on iOS Safari ([MDN browser-compat-data](https://github.com/mdn/browser-compat-data), v8.1.5).
- **What the server sees.** It sees only mDNS names, or on Android private LAN IPs, inside the SDP. With `iceServers: []` there is no srflx candidate, so the public IP never appears in the SDP. Delete the pairing room when the session ends.

### Achievable throughput

- Data channels run SCTP over DTLS. A WebRTC engineer describes its congestion control as "very similar to TCP Reno, from ~2000". The same 2026 thread reports Chrome LAN-to-LAN data channel throughput of ">500mbps", and a fall to about 6.8 MiB/s once 20 ms of delay is added ([discuss-webrtc, Jun 2026](https://groups.google.com/g/discuss-webrtc/c/NCZLRRMmb1s/m/3W7D36n0AwAJ)). In 2022, Harald Alvestrand noted bugs filed because Chrome "fails to transfer at more than 50 Mbits/second" ([webrtc-extensions#71](https://github.com/w3c/webrtc-extensions/issues/71#issuecomment-1009016308)).
- **What this means here.** Round trips inside a flat are a few milliseconds, which is the case where Reno-style control does well. So in weak and middling Rooms, the Wi-Fi link should be the limit and not SCTP. Next to the router on Wi-Fi 5/6, the data channel may hit its own ceiling first. Measure throughput and latency/loss together for that reason.
- **Two wireless hops when the anchor is on Wi-Fi.** With both devices on Wi-Fi, each packet crosses the air twice (device to AP, then AP to device), and the two hops share airtime. Throughput comes out lower than the walking device's link alone. This affects every Room the same way, so the ranking still holds as long as the anchor stays put next to the router. An Ethernet anchor removes the problem.
- **Send in small chunks.** Use `bufferedAmountLowThreshold` and the `bufferedamountlow` event to keep the send buffer full without overrunning it ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel/bufferedAmountLowThreshold)). Use moderate message sizes; 16 KiB is a common interop-safe choice, but I did not verify a spec-mandated limit.
- **Loss and latency channel.** Open a second channel with `ordered: false, maxRetransmits: 0` ([MDN createDataChannel](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createDataChannel)) and send numbered ping packets. Missing sequence numbers give packet loss over the Wi-Fi path itself. Echo timing gives RTT and jitter.

### `getStats()` metrics ([W3C webrtc-stats](https://www.w3.org/TR/webrtc-stats/))

| Metric | Meaning | Chrome Android | iOS Safari |
|---|---|---|---|
| `candidate-pair.currentRoundTripTime` | Latest STUN-check RTT, in seconds | 71 | 11 |
| `candidate-pair.totalRoundTripTime` / `responsesReceived` | Average RTT over the session | yes | yes |
| `candidate-pair.availableOutgoingBitrate` | Congestion controller's bitrate estimate | 58 | 11 |
| `data-channel.bytesSent/Received`, `messagesSent/Received` | Per-channel counters | 80 | 13.4 |
| `local-candidate` / `remote-candidate` `.candidateType` | Confirms the path is `host`/`prflx`, not `relay` | 80 | 12.2 |

Versions come from [MDN browser-compat-data](https://github.com/mdn/browser-compat-data) v8.1.5. `RTCDataChannel` itself is supported since Chrome Android 25 and iOS Safari 11.

- **No loss counter for data channels.** The spec defines packet loss only for RTP streams. `RTCDataChannelStats` counts only messages and bytes. `packetsDiscardedOnSend` counts socket send errors, not loss in transit. Hence the app-level unreliable channel above.
- **No link details from `networkType`.** The `networkType` field on candidate stats "was deprecated for preserving privacy" (webrtc-stats Status section).

### Practical constraints

- **Keep both pages in the foreground.** A Screen Wake Lock is released when the page is hidden ([MDN Screen Wake Lock](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API)). Ask for one and request it again on `visibilitychange`. Support starts at Chrome Android 84 and iOS Safari 18.4 (BCD). On older iOS, ask the person to keep the anchor's screen on.

## 2. Latency, jitter and loss probes to the nearby Cloudflare PoP

- **Cloudflare has PoPs in Dhaka and Chittagong** ([Cloudflare network map](https://www.cloudflare.com/network/)). A Pages Function can echo `request.cf.colo`, the "IATA airport code of the data center that the request hit", to confirm which one served a Reading. It can also echo `clientTcpRtt`, the "smoothed round-trip time ... for TCP connections" (only over HTTP/1 and HTTP/2) ([Workers Request API](https://developers.cloudflare.com/workers/runtime-apis/request/)).
- **How `@cloudflare/speedtest` measures** ([README](https://github.com/cloudflare/speedtest)):
  - idle latency: 20 `bytes=0` requests, timed from PerformanceResourceTiming `requestStart` to `responseStart`, median by default;
  - jitter: the average gap between consecutive latency samples;
  - loaded latency: probed during downloads and uploads (`loadedLatencyThrottle` 400 ms);
  - packet loss: sent as UDP to a TURN server. The README warns that the public TURN server for packet loss "is deprecated and will be discontinued". Cloudflare TURN costs $0.05/GB outside the SFU ([Cloudflare TURN](https://developers.cloudflare.com/realtime/turn/)).
- **Why it still helps when the plan caps throughput.** A weak Room means a lower Wi-Fi rate, more retransmissions and more airtime contention. These add latency and jitter to every packet, not only to bulk transfers. Loaded latency also shows queueing on the bottleneck hop. This is my reasoning from how Wi-Fi works; none of the sources above states it. And once the Wi-Fi link drops below the plan rate, download throughput itself falls, so the plain speed test does catch the worst Rooms.
- **The confound.** The probes measure the Wi-Fi hop plus the ISP and Cloudflare path, and that path also varies over time. To reduce this:
  - take many samples per Reading and use medians and p95;
  - take Readings for all Rooms within one session;
  - rely on the device-to-device test whenever possible.

  The device-to-device test removes this confound entirely, because the only path it measures is inside the Home.
- **Probing the router directly doesn't work from a web page.** A web page cannot ping the router. Browsers don't expose ICMP, an HTTPS page cannot fetch `http://192.168.x.1` (mixed content), and Chrome's Local Network Access permission gates fetches to private IPs ([Chrome blog](https://developer.chrome.com/blog/local-network-access)).

## 3. Other browser APIs that expose Wi-Fi link info

- **Network Information API** ([WICG spec](https://wicg.github.io/netinfo/)): `downlink` and `rtt` are estimates "based on recently observed application layer throughput/RTT", "excluding connections made to a private address space". So they ignore LAN traffic entirely.
  - **Chromium's limits** ([`network_state_notifier.cc`](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/third_party/blink/renderer/platform/network/network_state_notifier.cc)):
    - `kMaxDownlinkKbps = 10.0 * 1000`, in 50 kbps buckets;
    - `kMaxRtt = base::Seconds(3)`, at `kGranularity = base::Milliseconds(50)`;
    - both multiplied by a per-host random factor of 0.90 to 1.10 "to reduce fingerprinting";
    - with no estimate available, downlink reports the fastest value.
  - **Support:** Chrome Android supports `downlink`, `rtt` and `type`. iOS Safari supports none of them. Firefox Android has only `type` (BCD).
  - **Verdict:** coarse, noisy, capped below typical home Wi-Fi rates and blind to the LAN, so it can't rank Rooms. `type === "wifi"` is useful only to fill in a Reading's Connection type on Android.
- **Nothing else.** No web API exposes RSSI, SSID/BSSID, PHY link rate, channel or band. The one related WebRTC stats field, `networkType`, was deprecated for privacy (see above). This also fits the CONTEXT.md decision that a Reading measures only the connection the person is on and never scans other networks.
- **WebTransport datagrams** (Chrome Android 97, iOS Safari 26.4 per BCD) could carry UDP-like loss probes to a server. They would still cross the internet path, so they add nothing over section 2 for ranking Rooms. Not pursued.
