# SmartFarm Crop IoT Dashboard

A full-stack crop dashboard for GreenFields Farm. Farm staff manage Crop
Cards (React + Express + SQLite); a static JSON file simulates a read-only
IoT sensor feed. The frontend joins the two by `crop_name`, picks the latest
reading by timestamp, and shows each crop's condition on a dashboard card.

## Installation and run steps

Two applications run side by side during development.

**Backend** (Express + SQLite via sql.js):
```
cd backend
npm install
npm start
```
Runs at **http://localhost:3001**. On first start it creates
`SmartFarmCrop.db` and seeds Tomato, Lettuce and Wheat (Maize is left out so
it can be created through the UI). Restarting never duplicates rows.

To reset the database during development, stop the server and delete
`backend/SmartFarmCrop.db`, then start the server again to reseed.

**Frontend** (React + Vite):
```
cd frontend
npm install
npm run dev
```
Runs at **http://localhost:5173**. A Vite dev proxy (`vite.config.js`)
forwards `/api/*` requests to `http://localhost:3001`, so no CORS
configuration is needed in development (Express also has `cors()` enabled
as a fallback).

## Database

- `backend/init.sql` creates the `crops` table (see schema for the exact
  columns/checks) and seeds Tomato, Lettuce and Wheat only.
- `backend/db.js` runs `init.sql` on every server start (idempotent).
- SQLite stores **Crop Cards only**. It never stores condition,
  recommended water, alerts, or Overall Farm Status - those are calculated
  in React state on every render, from the current Crop Cards and the
  current sensor readings.

## API routes and error format

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/crops` | List all Crop Cards |
| GET | `/api/crops/:id` | Get one Crop Card |
| POST | `/api/crops` | Create a Crop Card (`crop_name` must exist in the sensor feed and not already have a card) |
| PUT | `/api/crops/:id` | Update `location`, `target_min`, `target_max`, `normal_water`, `notes` - `crop_name` is immutable |
| DELETE | `/api/crops/:id` | Delete a Crop Card only (sensor data is untouched) |
| GET | `/api/readings` | Read + structurally validate `data/sensor-readings.json` and return it raw (no CRUD routes exist for readings) |

Every failure returns `{"error": "..."}` with the HTTP status listed in the
assignment brief (400 for validation/immutability, 404 for missing cards,
409 for a duplicate `crop_name`, 500 for a structurally invalid sensor file
or an unexpected server error).

## Data ownership

| Data | Lives in | Who can change it |
|---|---|---|
| Crop Cards | SQLite `crops` table | The user, via Create/Edit/Delete |
| Sensor readings | `backend/data/sensor-readings.json` | Nobody - read-only inside the app |
| Dashboard results (condition, recommended water, alerts, action, Overall Farm Status) | React state only | Recalculated automatically, never persisted |

## crop_name matching and latest-timestamp selection

`crop_name` is the **only** join key, and matching is exact and
case-sensitive (`utils/analysis.js: getLatestReading`). For each Crop Card,
all readings with the same `crop_name` are filtered, then the greatest
timestamp is selected with a string sort (the fixed `YYYY-MM-DDTHH:mm:ss`
format sorts correctly as a string) - the code never assumes the last array
element is the latest. This was verified by deliberately shuffling
`sensor-readings.json` so that, for every crop, the latest reading is
**not** the last occurrence of that crop in the array, and confirming each
dashboard card still showed the correct latest values.

## Dashboard decision priority

Implemented once in `frontend/src/utils/analysis.js` (`analyseCrop`) and
reused by every card and the Sensor History view:

1. `sensor_status` is Offline/Faulty → **Sensor Problem** (stop).
2. Online reading with a value outside its business range (moisture 0-100,
   temperature 0-50, rainfall 0-50) → **Invalid Data** (stop).
3. `soil_moisture < target_min` → **Dry**; between min/max → **Healthy**;
   above `target_max` → **Too Wet**.
4. Additional, independent alerts on a valid Online reading: temperature
   `> 35` → "High temperature"; rainfall `>= 5` → "Rain detected". Neither
   changes recommended water.

Overall Farm Status: No Crops → Sensor Feed Unavailable → Critical (any
Sensor Problem/Invalid Data) → Watch (any Dry/Too Wet/High temperature) →
Normal, checked in that order.

## Sensor JSON: AI generation and correction

**Tool used:** Claude (Anthropic).

**Final prompt** (Section 16 of the assignment brief, used as-is):
```
Generate a valid JSON array containing exactly 20 simulated SmartFarm sensor readings.

Use these crop_name values exactly and create exactly 5 readings for each:
Tomato, Lettuce, Wheat, Maize.

Every object must contain exactly these fields:
crop_name, timestamp, soil_moisture, temperature, rainfall, sensor_status, notes.

Use timestamps in YYYY-MM-DDTHH:mm:ss format. Timestamps must be distinct
within each crop. The same timestamp may be used by different crops. Mix the
array order so the latest reading is not always the last object.

Use sensor_status only as Online, Offline or Faulty. Most numeric values must
be realistic: soil_moisture 0-100, temperature 0-50, rainfall 0-50. Include
exactly one structurally valid older reading with one deliberately out-of-range
numeric value. That invalid reading must not be the latest reading for its crop.

Make the latest readings produce these cases with the default Crop Card settings:
- latest Tomato: Online, Dry, temperature above 35 C;
- latest Lettuce: Online and Healthy;
- latest Wheat: Online, Too Wet, rainfall at least 5 mm;
- latest Maize: sensor_status Faulty.

Return only the JSON array. Do not use Markdown or explanation.
```

**Problem found and corrected:** the first draft placed each crop's latest
reading last within its own run of entries, which would have let a buggy
"take the last matching array item" implementation pass by accident. The
array order was manually re-shuffled so that, for every one of the four
crops, the maximum-timestamp reading sits in the middle of the array and is
followed by at least one earlier reading for that same crop - so only a
correct max-by-timestamp comparison passes.

**Verification performed:**
- `node -e` script ran `backend/utils/sensorValidation.js`'s
  `isStructurallyValid()` against the file directly - confirmed 20 objects,
  five per crop, correct fields/types, and all timestamps distinct within
  each crop.
- The same script ran `getLatestReading()` for each crop and printed the
  result, confirming Tomato/Lettuce/Wheat/Maize each resolve to the exact
  reading required by the four latest-case rules above.
- `crop_name` uniqueness/exact matching was verified via `GET /api/crops`
  and `GET /api/readings`: creating a second `Maize` card returns
  `409 {"error":"crop_name already exists"}`, and a lowercase or
  misspelled `crop_name` on create is rejected with
  `400 {"error":"crop_name does not exist in sensor data"}`.
- The intentional invalid reading (`Wheat`, `2026-08-01T09:00:00`,
  `soil_moisture: 120`) is returned by `GET /api/readings` (structurally
  valid) and is correctly labelled "Invalid Data" in Sensor History, while
  not being Wheat's latest reading.

## Implementation decision

Recommended water, condition, alerts and Overall Farm Status are computed
in React on every render from the current Crop Cards + current readings,
and are never written to SQLite. This keeps the backend a thin,
easily-testable CRUD + validation layer, guarantees the dashboard is always
in sync with whatever `GET /api/readings` last returned, and matches the
assignment's explicit data-ownership split (Section 5).

## AI-assisted development

Claude was used throughout for scaffolding the Express routes, the SQLite
schema, the React components, the sensor JSON (see above), and this
README. All generated code was manually reviewed, run, and checked against
the assignment's acceptance tests (Section 18) before being kept.

## One project limitation

The Vite dev proxy assumes the backend always runs on `localhost:3001`; a
production deployment where frontend and backend are on different hosts
would need an environment-configurable API base URL instead of relying on
the proxy.
