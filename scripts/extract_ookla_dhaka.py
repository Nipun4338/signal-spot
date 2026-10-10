"""Cut greater Dhaka out of Ookla's quarterly mobile performance tiles into a static GeoJSON Base layer.

Reads the public Parquet over HTTPS (DuckDB fetches only the row groups it needs), keeps the
zoom-16 tiles whose centroid falls in a box around greater Dhaka, and fails loudly if Dhaka
is missing from the quarter.

Usage:
    python -I scripts/extract_ookla_dhaka.py                 # latest published quarter
    python -I scripts/extract_ookla_dhaka.py --year 2026 --quarter 3

Requires: pip install duckdb
"""

import argparse
import datetime
import json
import math
import sys
import urllib.error
import urllib.request
from pathlib import Path

import duckdb

BUCKET = "https://ookla-open-data.s3.amazonaws.com"
# Greater Dhaka, generous enough to cover Uttara to Keraniganj and Mirpur to Demra.
WEST, SOUTH, EAST, NORTH = 90.30, 23.65, 90.55, 23.92
MIN_TILES = 100
OUT = Path(__file__).resolve().parent.parent / "public" / "base-layer" / "ookla-dhaka-mobile.geojson"
ATTRIBUTION = (
    "Speedtest® by Ookla® Global Fixed and Mobile Network Performance Maps. "
    "Based on Ookla's analysis of Speedtest Intelligence® data. "
    "Licensed under CC BY-NC-SA 4.0. Modified: filtered to greater Dhaka."
)


def parquet_url(year: int, quarter: int) -> str:
    month = (quarter - 1) * 3 + 1
    return (
        f"{BUCKET}/parquet/performance/type=mobile/year={year}/quarter={quarter}/"
        f"{year}-{month:02d}-01_performance_mobile_tiles.parquet"
    )


def exists(url: str) -> bool:
    try:
        with urllib.request.urlopen(urllib.request.Request(url, method="HEAD"), timeout=30) as r:
            return r.status == 200
    except urllib.error.HTTPError:
        return False


def latest_quarter() -> tuple[int, int]:
    today = datetime.date.today()
    year, quarter = today.year, (today.month - 1) // 3 + 1
    for _ in range(8):
        if exists(parquet_url(year, quarter)):
            return year, quarter
        year, quarter = (year, quarter - 1) if quarter > 1 else (year - 1, 4)
    sys.exit("No Ookla mobile Parquet found in the last 8 quarters.")


def quadkey_bounds(quadkey: str) -> tuple[float, float, float, float]:
    x = y = 0
    zoom = len(quadkey)
    for i, digit in enumerate(quadkey):
        mask = 1 << (zoom - i - 1)
        d = int(digit)
        if d & 1:
            x |= mask
        if d & 2:
            y |= mask
    n = 2**zoom

    def lng(px: int) -> float:
        return px / n * 360.0 - 180.0

    def lat(py: int) -> float:
        return math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * py / n))))

    return lng(x), lat(y + 1), lng(x + 1), lat(y)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--year", type=int)
    parser.add_argument("--quarter", type=int, choices=[1, 2, 3, 4])
    args = parser.parse_args()
    if (args.year is None) != (args.quarter is None):
        parser.error("pass both --year and --quarter, or neither")
    year, quarter = (args.year, args.quarter) if args.year else latest_quarter()
    url = parquet_url(year, quarter)
    print(f"Reading {url}")

    con = duckdb.connect()
    con.execute("INSTALL httpfs; LOAD httpfs;")
    rows = con.execute(
        """
        SELECT quadkey, avg_d_kbps, avg_u_kbps, avg_lat_ms, tests, devices
        FROM read_parquet(?)
        WHERE tile_x BETWEEN ? AND ? AND tile_y BETWEEN ? AND ?
        ORDER BY quadkey
        """,
        [url, WEST, EAST, SOUTH, NORTH],
    ).fetchall()

    if len(rows) < MIN_TILES:
        sys.exit(f"Only {len(rows)} Dhaka tiles in {year} Q{quarter}; Ookla may have dropped the region. Not writing.")

    features = []
    for quadkey, down, up, latency, tests, devices in rows:
        w, s, e, n = (round(v, 6) for v in quadkey_bounds(quadkey))
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "quadkey": quadkey,
                    "down_mbps": round(down / 1000, 1),
                    "up_mbps": round(up / 1000, 1),
                    "latency_ms": latency,
                    "tests": tests,
                    "devices": devices,
                },
                "geometry": {"type": "Polygon", "coordinates": [[[w, s], [e, s], [e, n], [w, n], [w, s]]]},
            }
        )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    collection = {
        "type": "FeatureCollection",
        "metadata": {"source": url, "year": year, "quarter": quarter, "attribution": ATTRIBUTION},
        "features": features,
    }
    OUT.write_text(json.dumps(collection, separators=(",", ":")), encoding="utf-8")
    thin = sum(1 for f in features if f["properties"]["tests"] < 20)
    print(f"Wrote {len(features)} tiles ({thin} with < 20 tests) to {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
