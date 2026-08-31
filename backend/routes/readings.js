// routes/readings.js
// Read-only sensor feed. Never creates POST/PUT/DELETE routes for readings -
// the JSON file is an external, read-only IoT simulation per the assignment.

const express = require('express');
const fs = require('fs');
const path = require('path');
const { isStructurallyValid } = require('../utils/sensorValidation');

const router = express.Router();
const DATA_PATH = path.join(__dirname, '..', 'data', 'sensor-readings.json');

// GET /api/readings - re-reads the file from disk on every request so the
// "Refresh Sensor Data" button picks up a replaced file without a restart.
router.get('/', (req, res) => {
  let raw;
  try {
    raw = fs.readFileSync(DATA_PATH, 'utf8');
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Sensor data file is invalid' });
  }

  let readings;
  try {
    readings = JSON.parse(raw);
  } catch (err) {
    return res.status(500).json({ error: 'Sensor data file is invalid' });
  }

  if (!isStructurallyValid(readings)) {
    return res.status(500).json({ error: 'Sensor data file is invalid' });
  }

  res.json(readings);
});

module.exports = router;
