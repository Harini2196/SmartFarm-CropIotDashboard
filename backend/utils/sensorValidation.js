// sensorValidation.js
// Structural validation for backend/data/sensor-readings.json.
//
// This checks *structure* only (array shape, exact field set, correct types,
// valid crop/status enums, valid+distinct-per-crop timestamps, exact crop
// counts) - never the sensor business ranges (0-100 moisture, 0-50 temp,
// 0-50 rainfall). An out-of-range number on an otherwise well-formed Online
// reading is a valid "Invalid Data" case that must still be returned to the
// frontend, per the assignment's structural-error vs invalid-data split.

const VALID_CROP_NAMES = ['Tomato', 'Lettuce', 'Wheat', 'Maize'];
const VALID_STATUSES = ['Online', 'Offline', 'Faulty'];
const REQUIRED_FIELDS = [
  'crop_name',
  'timestamp',
  'soil_moisture',
  'temperature',
  'rainfall',
  'sensor_status',
  'notes',
];
const READINGS_PER_CROP = 5;
const TIMESTAMP_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;

function isValidTimestamp(value) {
  if (typeof value !== 'string') return false;
  const match = TIMESTAMP_RE.exec(value);
  if (!match) return false;

  const [, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr] = match;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  const second = Number(secondStr);

  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second
  );
}

/** Returns true only if `readings` satisfies every structural rule in the spec. */
function isStructurallyValid(readings) {
  if (!Array.isArray(readings) || readings.length !== 20) return false;

  const seenTimestampsByCrop = new Map(VALID_CROP_NAMES.map((name) => [name, new Set()]));
  const countByCrop = new Map(VALID_CROP_NAMES.map((name) => [name, 0]));

  for (const reading of readings) {
    if (typeof reading !== 'object' || reading === null || Array.isArray(reading)) return false;

    const keys = Object.keys(reading);
    if (keys.length !== REQUIRED_FIELDS.length) return false;
    for (const field of REQUIRED_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(reading, field)) return false;
    }

    if (typeof reading.crop_name !== 'string' || !VALID_CROP_NAMES.includes(reading.crop_name)) {
      return false;
    }
    if (!isValidTimestamp(reading.timestamp)) return false;
    if (typeof reading.soil_moisture !== 'number' || !Number.isFinite(reading.soil_moisture)) return false;
    if (typeof reading.temperature !== 'number' || !Number.isFinite(reading.temperature)) return false;
    if (typeof reading.rainfall !== 'number' || !Number.isFinite(reading.rainfall)) return false;
    if (typeof reading.sensor_status !== 'string' || !VALID_STATUSES.includes(reading.sensor_status)) {
      return false;
    }
    if (typeof reading.notes !== 'string') return false;

    const seenTimestamps = seenTimestampsByCrop.get(reading.crop_name);
    if (seenTimestamps.has(reading.timestamp)) return false; // duplicate timestamp within the same crop
    seenTimestamps.add(reading.timestamp);

    countByCrop.set(reading.crop_name, countByCrop.get(reading.crop_name) + 1);
  }

  for (const name of VALID_CROP_NAMES) {
    if (countByCrop.get(name) !== READINGS_PER_CROP) return false;
  }

  return true;
}

module.exports = {
  VALID_CROP_NAMES,
  VALID_STATUSES,
  isStructurallyValid,
};
