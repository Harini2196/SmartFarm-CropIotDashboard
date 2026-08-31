// routes/crops.js
// CRUD endpoints for user-managed Crop Cards. Sensor readings are never
// stored or modified here - crop_name is only cross-checked against the
// read-only sensor file at Create time.

const express = require('express');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../db');
const { isStructurallyValid } = require('../utils/sensorValidation');
const { validateCropCreateBody, validateCropUpdateBody } = require('../utils/cropValidation');

const router = express.Router();
const DATA_PATH = path.join(__dirname, '..', 'data', 'sensor-readings.json');

/** Reads + structurally validates the sensor file. Returns a Set of crop names, or null if unreadable/invalid. */
function getValidSensorCropNames() {
  let raw;
  try {
    raw = fs.readFileSync(DATA_PATH, 'utf8');
  } catch (err) {
    return null;
  }

  let readings;
  try {
    readings = JSON.parse(raw);
  } catch (err) {
    return null;
  }

  if (!isStructurallyValid(readings)) return null;
  return new Set(readings.map((r) => r.crop_name));
}

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM crops ORDER BY id ASC').all();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(404).json({ error: 'Crop card not found' });

    const db = getDb();
    const row = db.prepare('SELECT * FROM crops WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'Crop card not found' });

    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', (req, res) => {
  try {
    const body = req.body || {};

    const validationError = validateCropCreateBody(body);
    if (validationError) return res.status(400).json({ error: validationError });

    const validCropNames = getValidSensorCropNames();
    if (!validCropNames) return res.status(500).json({ error: 'Sensor data file is invalid' });

    if (!validCropNames.has(body.crop_name)) {
      return res.status(400).json({ error: 'crop_name does not exist in sensor data' });
    }

    const db = getDb();

    const existing = db.prepare('SELECT id FROM crops WHERE crop_name = ?').get(body.crop_name);
    if (existing) return res.status(409).json({ error: 'crop_name already exists' });

    const data = {
      crop_name: body.crop_name,
      location: body.location,
      target_min: body.target_min,
      target_max: body.target_max,
      normal_water: body.normal_water,
      notes: body.notes ? String(body.notes) : '',
    };

    const info = db
      .prepare(
        `INSERT INTO crops (crop_name, location, target_min, target_max, normal_water, notes)
         VALUES (@crop_name, @location, @target_min, @target_max, @normal_water, @notes)`
      )
      .run(data);

    const row = db.prepare('SELECT * FROM crops WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(404).json({ error: 'Crop card not found' });

    const db = getDb();
    const existing = db.prepare('SELECT * FROM crops WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Crop card not found' });

    const body = req.body || {};

    const attemptsCropNameChange =
      body.crop_name !== undefined && body.crop_name !== null && body.crop_name !== existing.crop_name;
    if (attemptsCropNameChange) {
      return res.status(400).json({ error: 'crop_name cannot be changed' });
    }

    const validationError = validateCropUpdateBody(body);
    if (validationError) return res.status(400).json({ error: validationError });

    const data = {
      id,
      location: body.location,
      target_min: body.target_min,
      target_max: body.target_max,
      normal_water: body.normal_water,
      notes: body.notes ? String(body.notes) : '',
    };

    db.prepare(
      `UPDATE crops SET
         location = @location,
         target_min = @target_min,
         target_max = @target_max,
         normal_water = @normal_water,
         notes = @notes
       WHERE id = @id`
    ).run(data);

    const row = db.prepare('SELECT * FROM crops WHERE id = ?').get(id);
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(404).json({ error: 'Crop card not found' });

    const db = getDb();
    const info = db.prepare('DELETE FROM crops WHERE id = ?').run(id);
    if (info.changes === 0) return res.status(404).json({ error: 'Crop card not found' });

    res.json({ deleted: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
