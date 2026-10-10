# Signal Spot

Helps people find where, nearby, their connection performs best, using measurements other people took on the connection they were on.

## Language

**Reading**:
One measurement of the connection a person is currently on, at one location and moment: download, upload, latency, connection type, and carrier if mobile.
_Avoid_: test, sample, result

**Point**:
The location a Reading was taken at. Every Reading has exactly one.
_Avoid_: pin, coordinate

**Spot**:
A named place (café, library, co-working space) that Readings can optionally be attached to.
_Avoid_: venue, location, place

**Connection type**:
Whether a Reading was taken on Wi-Fi or mobile data.

**Carrier**:
The mobile operator a mobile Reading was taken on. Not meaningful for Wi-Fi Readings.
_Avoid_: operator, network, ISP

**Base layer**:
Third-party network-quality data shown beneath crowdsourced Readings so the map is useful before many Readings exist. Never mixed into a Spot's figures.

## Relationships

- A **Reading** has exactly one **Point** and at most one **Spot**
- A **Spot** has many **Readings**
- A **Reading** has a **Carrier** only when its **Connection type** is mobile

## Flagged ambiguities

- "Connected networks only" was resolved as: a **Reading** measures only the connection the person is on; the app never scans or lists other nearby networks.
