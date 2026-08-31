-- SmartFarm Crop IoT Dashboard database schema
-- Run automatically by db.js on server start (idempotent - safe to re-run)
-- Stores Crop Cards only. Sensor readings live in data/sensor-readings.json.

CREATE TABLE IF NOT EXISTS crops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crop_name TEXT NOT NULL UNIQUE
    CHECK (crop_name IN ('Tomato','Lettuce','Wheat','Maize')),
  location TEXT NOT NULL,
  target_min REAL NOT NULL CHECK (target_min >= 0 AND target_min <= 100),
  target_max REAL NOT NULL CHECK (target_max >= 0 AND target_max <= 100),
  normal_water REAL NOT NULL CHECK (normal_water > 0 AND normal_water <= 10000),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (target_min < target_max)
);

-- Seed Tomato, Lettuce and Wheat only. Maize is deliberately left out so it
-- can be created through the UI. INSERT OR IGNORE relies on the crop_name
-- UNIQUE constraint so re-running this file on every restart never
-- duplicates rows.
INSERT OR IGNORE INTO crops (crop_name, location, target_min, target_max, normal_water, notes)
VALUES ('Tomato', 'Greenhouse A', 55, 75, 500, '');

INSERT OR IGNORE INTO crops (crop_name, location, target_min, target_max, normal_water, notes)
VALUES ('Lettuce', 'Greenhouse B', 60, 80, 400, '');

INSERT OR IGNORE INTO crops (crop_name, location, target_min, target_max, normal_water, notes)
VALUES ('Wheat', 'North Field', 35, 55, 300, '');
