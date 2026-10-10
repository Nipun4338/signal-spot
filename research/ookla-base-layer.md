# Can Ookla open data serve as the Dhaka Base layer?

Researched 2026-10-10 for issue #2.

## Answer

**Yes, technically, as long as Signal Spot stays non-commercial.** If it ever makes money,
Ookla's open data cannot be used without a separate licence from Ookla.

- **Licence:** CC BY-NC-SA 4.0. It is free to use with attribution, but it is
  **NonCommercial**, and **ShareAlike** means a Base layer derived from it must be shared
  under the same licence. Ads, paid tiers or a commercial owner would rule it out.
- **Format and access:** Parquet (WKT geometry, EPSG:4326) or zipped Shapefile, in a public
  S3 bucket. Downloads need no AWS account. There is one global file per type
  (`fixed` / `mobile`) per quarter, about 190 MB (mobile) and 365 MB (fixed) in Parquet.
- **Resolution:** zoom-16 Web Mercator tiles. That is 610.8 m at the equator and **about
  560 m across in Dhaka** (23.8°N). It is neighbourhood-level, not street- or café-level.
- **Cadence:** quarterly, published shortly after each quarter ends. Q3 2026 (Jul to Sep) was
  posted on 2026-10-09. Expect the data to be 0 to 3 months stale, plus the publishing lag.
- **Dhaka coverage:** good in the most recent quarter I could measure (Q1 2026). In a box
  around the city core, **about 996 of about 1,564 possible tiles (64%) have fixed data, from
  about 61.9k tests. About 929 tiles (59%) have mobile data, from about 15.8k tests.**
  However, **79% of the mobile tiles have fewer than 20 tests**, and 15% have only one, so
  per-tile mobile figures are noisy.
- **Fit with our domain:** `fixed` corresponds to our Wi-Fi **Connection type** and `mobile`
  to mobile data. There is **no Carrier field**, so the Base layer cannot be split by
  Carrier. It also cannot be tied to a **Spot**, which is fine because the Base layer is
  never mixed into a Spot's figures anyway.

Recommendation: use it as a coarse, quarterly, per-Connection-type heat layer (download,
upload and latency per tile). Fade or hide tiles with low `tests` counts. Show Ookla's
attribution on the map. Treat the NonCommercial clause as a hard constraint on the
project's business model.

## Details

### Licence and attribution

- The licence is **CC BY-NC-SA 4.0**
  ([Ookla open data README, "License"](https://github.com/teamookla/ookla-open-data#license);
  [AWS Open Data Registry entry](https://registry.opendata.aws/speedtest-global-performance/)).
  - **BY:** attribution is required.
  - **NC:** no use "primarily intended for or directed towards commercial advantage or
    monetary compensation"
    ([CC BY-NC-SA 4.0 legal code, §1(k)](https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode)).
  - **SA:** adapted material (for example, our re-tiled or styled Base layer data) must be
    shared under the same or a compatible licence.
- Ookla's suggested attribution, from the
  [README, "Suggested Attribution"](https://github.com/teamookla/ookla-open-data#suggested-attribution),
  is a template:
  > Speedtest® by Ookla® Global Fixed and Mobile Network Performance Maps was accessed on
  > [DAY MONTH YEAR] from AWS. Based on [LICENSEE'S] analysis of Speedtest® by Ookla® Global
  > Fixed and Mobile Network Performance Maps for [DATA TIME PERIOD]. Ookla trademarks used
  > under license and reprinted with permission.

  For a map, a short credit with a link to a fuller "About the Base layer" page holding this
  text is the usual way to satisfy CC BY.
- The contact for licensing questions, including commercial use, is `opendata@ookla.com`
  ([AWS registry](https://registry.opendata.aws/speedtest-global-performance/)).

### File format and how to fetch

From the [README](https://github.com/teamookla/ookla-open-data) and the
[AWS registry](https://registry.opendata.aws/speedtest-global-performance/):

- **Bucket:** `s3://ookla-open-data` (us-west-2). It is public and accepts
  `--no-sign-request`. The same keys are served over HTTPS at
  `https://ookla-open-data.s3.amazonaws.com/<key>`.
- **Key pattern:**
  `FORMAT/performance/type=TYPE/year=YYYY/quarter=Q/FILENAME`, where `FORMAT` is `parquet`
  or `shapefiles` and `TYPE` is `fixed` or `mobile`. For example:
  `parquet/performance/type=mobile/year=2026/quarter=3/2026-07-01_performance_mobile_tiles.parquet`.
- **Formats:** Parquet, with a WKT `tile` polygon in EPSG:4326, or Shapefile (`.zip` holding
  `.shp/.shx/.dbf/.prj`).
- **Schema:** `avg_d_kbps`, `avg_u_kbps`, `avg_lat_ms`, `tests`, `devices`, `quadkey`, and
  `tile_x`/`tile_y` centroids (added from Q3 2023). Parquet also has the sparsely populated
  `avg_lat_down_ms`/`avg_lat_up_ms` (added from Q4 2022).
- **No regional extracts.** Each file is global, so we must filter to Dhaka ourselves. A
  `quadkey` prefix or bounding-box filter in DuckDB over HTTPS range reads avoids pulling the
  whole file. Sizes from a bucket listing on 2026-10-10:

  | Quarter | Mobile Parquet | Fixed Parquet | Published |
  |---|---|---|---|
  | 2026 Q1 | 175 MB | 349 MB | 2026-04-13 |
  | 2026 Q2 | 185 MB | 354 MB | 2026-08-19 |
  | 2026 Q3 | 190 MB | 365 MB | 2026-10-09 |

  ([bucket listing](https://ookla-open-data.s3.amazonaws.com/?list-type=2&prefix=parquet/performance/type=mobile/year=2026/))
- **Already-hosted alternative:** Esri's Living Atlas mirrors the data as a public ArcGIS
  FeatureServer that can be queried by bounding box
  ([item](https://www.arcgis.com/home/item.html?id=048da3d1818b4d0b95ec526b9e642719),
  [service](https://services.arcgis.com/jIL9msH9OI208GCb/arcgis/rest/services/Speedtest_by_Ookla_Global_Fixed_and_Mobile_Network_Performance_Map_Tiles/FeatureServer)).
  Esri updates it itself, so it lags: on 2026-10-10 it held data only up to Q1 2026, while S3
  already had Q3 2026. Its older quarters also appear thinned (see the caveat below). Use it
  for exploration, not as the production source.

### Tile resolution

- The tiles are zoom level 16 Web Mercator tiles, "approximately 610.8 meters by 610.8 meters
  at the equator" ([README, "Tiles"](https://github.com/teamookla/ookla-open-data#tiles)).
- Tiles shrink with latitude by cos(lat). At Dhaka (about 23.8°N) a tile is **about 560 m
  wide**, my own calculation: 40,075 km × cos 23.8° / 2¹⁶.
- Each tile holds the average of all tests in it for the quarter. Only tests with
  GPS-quality location are included
  ([AWS registry](https://registry.opendata.aws/speedtest-global-performance/)).
- `fixed` means tests from mobile devices on a non-cellular connection (Wi-Fi or Ethernet).
  `mobile` means tests on a cellular connection
  ([README, "Layers"](https://github.com/teamookla/ookla-open-data)).
- No operator or carrier field is published.

### Update cadence

- Data is updated quarterly, "shortly after the conclusion of the quarter." The series runs
  from Q1 2019 to the latest completed quarter
  ([README](https://github.com/teamookla/ookla-open-data); the
  [AWS registry](https://registry.opendata.aws/speedtest-global-performance/) also says
  "Quarterly").
- The lag is uneven. Q2 2026 appeared on 2026-08-19, about 7 weeks after the quarter ended.
  Q3 2026 appeared on 2026-10-09, about 9 days after (S3 `LastModified`, bucket listing
  above).
- Published quarters can change after release. Ookla may re-aggregate them to honour
  data-subject requests under GDPR, CCPA or LGPD, so totals can differ between downloads
  ([README](https://github.com/teamookla/ookla-open-data)). Store the download date with
  each import.
- **Availability risk:** a README changelog entry dated **2026-04-16** says supported regions
  were updated and "certain geographic areas are no longer available," subject to "applicable
  laws and internal policies"
  ([README, changelog](https://github.com/teamookla/ookla-open-data)). Bangladesh was still
  present in Q1 2026 (measured below). I did not check Q2 or Q3 2026 for Dhaka directly. The
  first import should confirm Dhaka tiles exist in the latest quarter, and the pipeline
  should tolerate a quarter with no Dhaka data.

### Coverage over Dhaka

Method: aggregate queries against the Esri Living Atlas FeatureServer above (layer 0 =
fixed, layer 1 = mobile), using the bounding box lon 90.33–90.51, lat 23.66–23.90. That box
roughly covers the Dhaka North and South city corporations and includes some river and
fringe land. The box holds about 1,564 zoom-16 tiles. Example query:
`.../FeatureServer/1/query?where=CalYear=2026 AND CalQuarter=1&geometry=90.33,23.66,90.51,23.90&geometryType=esriGeometryEnvelope&inSR=4326&returnCountOnly=true&f=json`.

**Q1 2026 (the latest quarter in the mirror):**

| | Tiles with data | Share of box | Tests | Tiles with 1 test | 2–4 | 5–19 | ≥20 |
|---|---|---|---|---|---|---|---|
| Fixed (Wi-Fi) | 996 | ~64% | 61,899 | 82 | 112 | 222 | 580 |
| Mobile | 929 | ~59% | 15,807 | 139 | 187 | 358 | 245 |

Reading this:

- Fixed data is dense: 58% of its tiles have at least 20 tests.
- Mobile data is much thinner per tile: only 26% of its tiles have at least 20 tests, and
  35% have fewer than 5.
- Mobile tiles also cannot be split by Carrier, so they blend all operators.
- The uncovered 36–41% of the box is likely river, wetland and low-density fringe, but I did
  not verify this against a land-use layer.

**Caveat on older quarters:** in the Esri mirror, every quarter from 2019 to 2025 shows
implausibly few Dhaka tiles: between 1 and 174 per quarter. London and Delhi show the same
pattern, for example London mobile with 34 tiles in Q1 2025 and 2,597 in Q1 2026. This
points to the mirror thinning its history, not to a real jump in coverage. **Do not judge
historical coverage from the mirror.** Run the same bounding-box filter against the S3
Parquet files (for example, with DuckDB) to get authoritative per-quarter numbers.

### Implications for Signal Spot

- **Licence gate:** decide now whether Signal Spot will ever be commercial. If it might,
  either contact Ookla (`opendata@ookla.com`) about a licence or plan a different Base
  layer.
- **ShareAlike:** if we publish derived Base layer tiles (for example, as vector tiles), they
  must also be released under CC BY-NC-SA. Our own crowdsourced Readings are separate data
  and are not affected, provided they stay unmixed, which CONTEXT.md already requires.
- **Pipeline:** run a quarterly job that range-reads the two Parquet files, filters by Dhaka
  bounding box or quadkey prefix, and stores about 1–2k rows per type with the quarter and
  download date.
- **Display:** fade or hide tiles below a minimum `tests` count. The minimum is not chosen
  yet; around 5 is a starting point, and it should be agreed on the map issue. Label the
  layer with its quarter so users know its age.
