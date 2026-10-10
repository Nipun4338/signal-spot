# Where do Spot names come from?

Research for issue #6. Checked 2026-10-10.

## Answer

**For the MVP, make free text the source of truth, and offer OpenStreetMap suggestions next to it. Don't use Google Places.**

- A person attaching a Reading to a Spot first sees **nearby existing Spots**, which are Spots other people already created in Signal Spot, matched by distance from the Reading's Point. They can pick one or type a new name.
- Optionally, show **OSM POIs near the Point as suggestions**. Get them from a self-hosted or pre-extracted OSM dataset, such as a one-off Overpass extract of Dhaka that we store ourselves, or a self-hosted Photon. Do not have browsers call public Nominatim or Overpass on every keystroke. Keep the OSM id on the Spot when one is picked, and show ODbL attribution.
- **Google Places is out.** Its terms forbid showing Places content on a non-Google map and allow only temporary caching of coordinates. Both conflict with a crowdsourced map whose Spots outlive the lookup.
- **Foursquare OS Places** (Apache-2.0) is a legal alternative seed dataset. It is heavyweight to pull (gated, Iceberg catalog, about 251 GB global), and I did not measure its Dhaka quality. Consider it later, not for the MVP.

Why: an anonymous, free MVP can't depend on a quota-limited public API called from browsers. Dhaka's OSM coverage is decent for cafés and restaurants but almost empty for co-working spaces, which are a core Spot type. So people will have to type names regardless.

## Usage-policy constraints

### OpenStreetMap: Nominatim (public instance)

Source: [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)

- No more than **1 request per second**, counted **per application, not per end user**. All of our users together share that budget.
- You must send an identifying User-Agent or Referer. Default HTTP-library values are rejected.
- Results **must be cached** on our side, and the policy recommends a caching proxy.
- **Autocomplete is forbidden**, including client-side search-as-you-type built on the API.
- Systematic queries, such as downloading all POIs in an area, are forbidden, and bulk geocoding is discouraged.
- Data is ODbL, and attribution must be displayed.
- The policy can change at any time, and access can be withdrawn.

Fit: only acceptable for occasional, cached, server-side lookups. It can't drive a "find a Spot" search box.

### OpenStreetMap: Overpass API (public instances)

Source: [Overpass API wiki](https://wiki.openstreetmap.org/wiki/Overpass_API)

- Informal guidance for the main instance: under 10,000 queries and 1 GB per day. For regular use, divide by 100, giving about **100 queries and 10 MB per day**, counted across all of an app's users.
- No parallel scripts. Back off for 30 s after HTTP 429 or 406.
- The page says the main instance is "overloaded" and not to expect high reliability. Commercial use should go to self-hosted or paid servers.
- I saw this myself: my first two queries got a dispatcher timeout from overpass-api.de and an HTTP 500 from overpass.kumi.systems, and overpass.private.coffee didn't return valid JSON. A third query succeeded.

Fit: fine for a **one-off or occasional extract** of Dhaka POIs into our own database, which is a single query. Not fine as a per-request backend.

### OpenStreetMap: Photon (self-hosted or komoot demo)

Source: [komoot/photon README](https://github.com/komoot/photon)

- An open-source geocoder built for OSM data (Apache-2.0). It **supports search-as-you-type**, which Nominatim's public instance forbids.
- The public demo at photon.komoot.io allows use "within reasonable limits". Extensive use is throttled or banned, and there is no availability guarantee.
- Self-hosting needs Java 21+. A full-planet index is about 95 GB, and the README recommends SSDs and 64 GB of RAM. GraphHopper publishes weekly dumps for the world and for selected countries, so a Bangladesh-only index would be much smaller.
- Spot check against the demo, biased to central Dhaka: "North End Coffee" and "Gloria Jean's Gulshan" both came back as real cafés with several branches.

Fit: the right tool if we want an OSM-backed autocomplete. It is still a server to run, which is more than an MVP needs.

### Dhaka POI coverage in OSM

Measured with one Overpass `out count` query over a central Dhaka bbox (23.66,90.33 to 23.90,90.51), with OSM data as of 2026-10-10T14:40Z:

| Tag | Count |
|---|---|
| `amenity=cafe` | 321 |
| `amenity=library` | 55 |
| `office=coworking` | **1** |
| `amenity=restaurant` | 1,788 |

My reading of these numbers:
- Well-known café chains are mapped.
- Co-working spaces are effectively absent.
- Quality is uneven. Photon returned a café with no name, and several names were SEO-stuffed, such as "Vintage Bake & Cafe, Coffee shop, Kazi Nazrul Islam Avenue, Banglamotor, Dhaka".
- 321 cafés is very likely far below the real number in a city of over 20 million. That is an inference, not a measurement.

So OSM can seed suggestions but can't be the only source of Spots.

### Google Places API

Sources: [Google Maps Platform Service Specific Terms §14](https://cloud.google.com/maps-platform/terms/maps-service-terms), [Places API policies](https://developers.google.com/maps/documentation/places/web-service/policies), [Google Maps Platform pricing](https://developers.google.com/maps/billing-and-pricing/pricing)

- **§14.2:** "Customer must not use Google Maps Content from the Places API in conjunction with a non-Google map." A Leaflet, MapLibre or OSM map is a non-Google map.
- **§14.3:** latitude and longitude may be cached for **at most 30 consecutive calendar days** and must then be deleted. Other Places content must not be pre-fetched, cached or stored. **Place IDs** are the exception and may be stored indefinitely.
- Attribution: the Google logo is required when Places data is shown without a Google Map, and third-party attributions must be shown too.
- **§15 Places UI Kit** is an exception: it *may* be used with a non-Google map. Its coordinates still have the same 30-day cache limit, and the restrictions on exporting content or creating content from it still apply.
- Cost per 1,000 calls at the first paid tier, with free monthly calls:

  | SKU | Price | Free per month |
  |---|---|---|
  | Autocomplete Requests | $2.83 | 10,000 |
  | Autocomplete Session Usage | $0 | unlimited |
  | Place Details Essentials | $5 | 10,000 |
  | Place Details Pro | $17 | 5,000 |
  | Text Search Pro | $32 | 5,000 |

  You also need a billing account. With an anonymous public app, anyone can burn through the quota.

Fit: **poor.** Storing a Spot's name and position permanently, and showing it on our own map, conflicts with §14.2 and §14.3. We could store only place IDs and re-fetch them, but then every map view costs money and we'd be tied to Google's map.

### Foursquare OS Places

Sources: [Access FSQ OS Places](https://docs.foursquare.com/data-products/docs/access-fsq-os-places), [Hugging Face dataset card](https://huggingface.co/datasets/foursquare/fsq-os-places)

- **Apache-2.0**, free. Downloaded data can be stored and shown on any map, subject to the Apache-2.0 notice requirements.
- Access is now **gated**: you accept the conditions on Hugging Face, or create a Places Portal account and token. The portal serves data through an Iceberg catalog (DuckDB, Spark, PyIceberg), and the legacy public S3 bucket has been replaced. A PMTiles vector-tile build is on S3.
- The global dataset is about 251 GB. Neither page gives the release cadence or the POI count. Hugging Face shows a 2026-09-15 partition.
- I did not measure Dhaka coverage here, because it needs the gated download.

Fit: a legitimate offline seed for later. Extract the Dhaka bbox once with DuckDB and load it into our own Spot suggestions. It's too much setup for the MVP.

### Free text only

- No external policy, cost or attribution.
- Risks: duplicate or misspelled Spots ("North End", "Northend Coffee Gulshan 2"), and junk or abusive names in an anonymous app.
- Mitigations: suggest existing nearby Spots before allowing a new one, normalise names for matching, cap name length, and add moderation or reporting later.

## Suggested Spot shape

None of the options above needs anything beyond this.

- `name` (free text, required)
- `point` (the Spot's position)
- `source`: `user` | `osm`, plus `source_id` (for example `node/123`) when picked from OSM, so a seeded Spot can be refreshed or de-duplicated later.
