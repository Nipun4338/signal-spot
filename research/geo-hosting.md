# Which free hosting and database support geographic queries?

Research for issue #5. Sources checked 2026-10-10 against official pricing and docs pages. Free tiers change often, so re-check them before committing.

## Direct answer

**Use Supabase (Postgres + PostGIS) in the Mumbai (`ap-south-1`) or Singapore (`ap-southeast-1`) region, and serve the static front end from Cloudflare (Workers static assets are free and unlimited, and Cloudflare has PoPs in Dhaka and Chittagong).**

- Supabase is the only option checked that gives real spatial queries out of the box (PostGIS `<->` KNN ordering, bounding boxes with `&&`, distances in metres) *and* lets the browser insert anonymous Readings and call a "near here" SQL function directly through `supabase.rpc()`, with no server code needed.
- An MVP stays well within the free plan: 500 MB DB, 5 GB egress. A Reading row is roughly 200 to 300 bytes with its index, so 500 MB holds on the order of a million Readings (this is an estimate, not a documented figure).
- The main catch is **pausing**. A free project with low database activity over 7 days is paused. It can be resumed from the dashboard for up to 1 year. "A few user requests to the database each day" is enough to prevent it, so a daily cron ping (for example a Cloudflare Cron Trigger or a GitHub Action) is a reasonable safeguard during quiet periods.

**Runner-up: Neon + PostGIS (Singapore).** It has the same SQL, a larger free tier (1 GB per project, 100 CU-hours), and never pauses for good, only scaling to zero after 5 minutes idle, with "a few hundred milliseconds" to reactivate. But Neon is only a database: you'd need an API layer (for example a Cloudflare Worker using Neon's serverless driver) to accept anonymous submissions. That's more moving parts than Supabase.

**Cloudflare D1, Turso and Firestore all work with geohash or H3 binning computed in app code**, but none offers native spatial indexing. "Near here" becomes a set of prefix or cell-range queries followed by a distance filter in app code. That's fine for map-cell binning, but more code to write and maintain than one PostGIS function. Firestore's free read quota (50k document reads/day) is also the tightest for a map that fetches many Readings per view.

## Comparison

| Option | Geo support | Free-tier limits | Pausing / cold start | Nearest region to Dhaka | Fit for MVP |
|---|---|---|---|---|---|
| **Supabase** (Postgres + PostGIS, built-in REST/RPC, auth) | Native PostGIS: KNN `<->` uses the spatial index in `ORDER BY`; `&&` + `ST_MakeBox2D` for map bbox; `st_distance` in metres; expose via `supabase.rpc()` | 500 MB DB per project, 5 GB egress (+5 GB cached), 50k MAU, 2 active projects, shared CPU / 500 MB RAM | Paused after low DB activity over 7 days; warning email ~1 week before; resume from dashboard, restorable for up to 1 year | Mumbai `ap-south-1`, Singapore `ap-southeast-1` | **Best.** Works from the browser with no backend; keep a daily ping |
| **Neon** (serverless Postgres + PostGIS) | Native PostGIS ("can be installed on any Neon Project") | 1 GB storage per project (20 GB total), 100 CU-hours per project, max 2 CU, 5 GB egress per project, 100 projects; on hitting limits writes are blocked or compute is suspended until the next period, and data is not deleted | Scales to zero after 5 min idle (fixed on Free); reactivates in "a few hundred milliseconds" | Singapore `aws-ap-southeast-1` (no India region) | Good, but needs a separate API layer for anonymous writes |
| **Cloudflare Workers + D1** (SQLite) | No native spatial index. Documented extensions are FTS5, JSON and math functions; R*Tree isn't listed. Store a geohash or H3 cell column (computed in the Worker, e.g. with `h3-js`) plus lat/lng, then query by cell or prefix with B-tree indexes | Workers: 100k requests/day, 10 ms CPU per invocation, static assets free and unlimited. D1: 5M rows read/day, 100k rows written/day, 5 GB storage; errors until 00:00 UTC reset when exceeded | No pausing documented; D1 auto-creates read replicas "in every available region" | Location hint `apac`; Cloudflare PoPs in Dhaka and Chittagong for the Worker/edge | Good for cell binning; "nearest N" needs hand-written ring queries |
| **Turso** (libSQL / SQLite) | No R*Tree or geo extension listed; custom `.so` extensions not supported. Use geohash/H3 columns as with D1 | 100 DBs, 5 GB storage, 500M rows read/month, 10M rows written/month | Pricing page doesn't document inactivity or archiving behaviour for Free (unverified) | Mumbai `aws-ap-south-1` | Generous quotas, but you still write the geo logic and need a host for the API |
| **Firebase / Firestore** | No built-in geo search. Official approach: store geohash + lat/lng, `geohashQueryBounds` gives ~4 range queries, then filter false positives client-side | 1 GiB stored, 50k reads/day, 20k writes/day, 20k deletes/day, 10 GiB egress/month, one free DB per project; reset ~midnight Pacific. Hosting (Spark): 10 GB storage, 360 MB/day transfer. Cloud Functions have no Spark allowance (Blaze only) | No pausing | Mumbai `asia-south1`, Delhi `asia-south2`, Singapore `asia-southeast1` | Works from the browser, but read quota and false-positive reads make it the tightest |

## Latency to Bangladesh

None of the providers publish latency figures from Dhaka. Going by geography, the closest regions are **Mumbai** (Supabase, Turso, Firestore) and **Singapore** (Supabase, Neon, Firestore; it is Neon's only Asian option apart from Sydney). Both are the nearest major cloud regions to Dhaka. Measure before choosing: `turso db locations -l` prints latency from your machine to each Turso location, and a quick `ping`/`curl -w` from a Dhaka connection to a test project in each region would settle Mumbai versus Singapore. Cloudflare's edge runs in Dhaka and Chittagong, so static assets and Worker code execute in-country. A D1 primary would still sit in an APAC region, with read replicas closer to users.

## Notes for the design

- Store the Point as `geography(Point, 4326)` with a GiST index. Note that `st_point` takes **longitude first**.
- If we later want binned map cells (hexes) rather than raw pins, an `h3` cell id column can be computed client-side with `h3-js` and stored next to the Point in any of these databases. PostGIS doesn't need it for "near here", but it makes aggregation per cell a simple `GROUP BY`.
- Anonymous inserts on Supabase go through the anon key plus Row Level Security policies. Rate limiting and abuse protection are a separate concern (see the related issues).

## Sources

- Supabase pricing: https://supabase.com/pricing
- Supabase PostGIS guide: https://supabase.com/docs/guides/database/extensions/postgis
- Supabase regions: https://supabase.com/docs/guides/platform/regions
- Supabase project pausing: https://supabase.com/docs/guides/platform/free-project-pausing
- Neon pricing: https://neon.com/pricing
- Neon PostGIS: https://neon.com/docs/extensions/postgis
- Neon regions: https://neon.com/docs/introduction/regions
- Neon scale to zero: https://neon.com/docs/introduction/scale-to-zero
- Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare D1 pricing: https://developers.cloudflare.com/d1/platform/pricing/
- Cloudflare D1 SQL statements / extensions: https://developers.cloudflare.com/d1/sql-api/sql-statements/
- Cloudflare D1 data location: https://developers.cloudflare.com/d1/configuration/data-location/
- Cloudflare network (Dhaka, Chittagong PoPs): https://www.cloudflare.com/network/
- Turso pricing: https://turso.tech/pricing
- Turso extensions: https://docs.turso.tech/sql-reference/extensions
- Turso locations API (lists `aws-ap-south-1` Mumbai): https://docs.turso.tech/api-reference/locations/list
- Firestore quotas: https://firebase.google.com/docs/firestore/quotas
- Firestore geoqueries: https://firebase.google.com/docs/firestore/solutions/geoqueries
- Firestore locations: https://firebase.google.com/docs/firestore/locations
- Firebase pricing (Hosting, Functions on Spark): https://firebase.google.com/pricing
