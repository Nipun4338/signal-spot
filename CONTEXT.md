# Signal Spot

Helps people find where their connection performs best: which Room of their own Home gets the best Wi-Fi, and where in the city their mobile Carrier is strongest.

## Language

**Reading**:
One measurement of the connection a person is currently on, at one moment: download, upload, latency, jitter, connection type, and Provider.
_Avoid_: test, sample, result

**Connection type**:
Whether a Reading was taken on Wi-Fi or mobile data.

**Provider**:
The company whose network carried a Reading: the internet provider for Wi-Fi, the mobile operator for mobile.
_Avoid_: network, ASN

**Carrier**:
A Provider of mobile data. Only mobile Readings have one.
_Avoid_: operator

### Mobile

**Point**:
The location a mobile Reading was taken at. Every mobile Reading has exactly one.
_Avoid_: pin, coordinate

**Cell**:
A square of the city (the same squares Ookla uses) whose recent mobile Readings for one Carrier are combined into one set of figures. A Cell is only shown once enough Readings fall in it.
_Avoid_: tile, hex, area

**Base layer**:
Third-party mobile network-quality data shown beneath crowdsourced mobile Readings so the map is useful before many exist. Never mixed into crowdsourced figures.

### Wi-Fi

**Home**:
A person's own place (flat, house, office) whose Wi-Fi they are surveying. Private to that person.
_Avoid_: location, site, venue

**Room**:
A named part of a Home (Bedroom, Kitchen, Balcony) that Wi-Fi Readings are taken in.
_Avoid_: zone, area, spot

## Relationships

- A mobile **Reading** has exactly one **Point**; a Wi-Fi **Reading** belongs to exactly one **Room** and has no Point
- A **Home** has many **Rooms**; a **Room** has many **Readings**
- A **Reading** has one **Provider**; when its **Connection type** is mobile, that Provider is a **Carrier**
- Mobile **Readings** are public only as combined map cells, never individually
- A **Home**, its **Rooms** and their **Readings** are never public

## Flagged ambiguities

- "Connected networks only" was resolved as: a **Reading** measures only the connection the person is on; the app never scans or lists other nearby networks.
- "Room/home specific, not a full area" was resolved as: Wi-Fi is surveyed per **Room** inside a person's **Home**; only mobile data is mapped across the city. Public Wi-Fi places (cafés, libraries) are out of scope.
