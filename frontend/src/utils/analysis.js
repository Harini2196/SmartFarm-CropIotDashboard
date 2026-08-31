// analysis.js
// Pure, reusable analysis functions. All dashboard cards and the Sensor
// History view must call these instead of copying the decision rules.

/** Unique JSON crop names minus names already used by existing Crop Cards. */
export function getAvailableCropNames(readings, crops) {
  const used = new Set((crops || []).map((c) => c.crop_name));
  const unique = [...new Set((readings || []).map((r) => r.crop_name))];
  return unique.filter((name) => !used.has(name));
}

/**
 * crop_name is the only join key, and matching is exact and case-sensitive.
 * Because timestamps share one fixed format, the greatest one can be found
 * with a plain string sort - never assume the last array entry is latest.
 */
export function getLatestReading(cropName, readings) {
  const matches = (readings || []).filter((r) => r.crop_name === cropName);
  return [...matches].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0] ?? null;
}

/**
 * The one authoritative decision table (assignment Section 10).
 * Priority: Sensor Problem > Invalid Data > Dry / Healthy / Too Wet.
 * High temperature / Rain detected are additional alerts checked only for a
 * valid Online reading, and never change the recommended water amount.
 */
export function analyseCrop(crop, reading) {
  if (!reading) {
    return {
      condition: 'Sensor Unavailable',
      recommended_water: 'N/A',
      alerts: [],
      action: 'N/A',
    };
  }

  const { soil_moisture, temperature, rainfall, sensor_status } = reading;

  // Priority 1: Sensor Problem
  if (sensor_status === 'Offline' || sensor_status === 'Faulty') {
    return {
      condition: 'Sensor Problem',
      recommended_water: 'N/A',
      alerts: ['Check sensor'],
      action: 'Check sensor',
    };
  }

  // Priority 2: Invalid Data (Online, but a value is outside its sensor business range)
  const invalidFields = [];
  if (soil_moisture < 0 || soil_moisture > 100) invalidFields.push('soil_moisture');
  if (temperature < 0 || temperature > 50) invalidFields.push('temperature');
  if (rainfall < 0 || rainfall > 50) invalidFields.push('rainfall');

  if (invalidFields.length > 0) {
    return {
      condition: 'Invalid Data',
      recommended_water: 'N/A',
      alerts: [`Invalid field: ${invalidFields.join(', ')}`],
      action: 'Check reading',
      invalidFields,
    };
  }

  // Priority 3-5: main moisture-based condition
  let condition;
  let recommended_water;
  let action;
  if (soil_moisture < crop.target_min) {
    condition = 'Dry';
    recommended_water = crop.normal_water;
    action = 'Water crop';
  } else if (soil_moisture > crop.target_max) {
    condition = 'Too Wet';
    recommended_water = 0;
    action = 'Stop watering';
  } else {
    condition = 'Healthy';
    recommended_water = 0;
    action = 'Monitor';
  }

  const alerts = [];
  if (temperature > 35) alerts.push('High temperature');
  if (rainfall >= 5) alerts.push('Rain detected');

  return { condition, recommended_water, alerts, action };
}

/**
 * Overall Farm Status is derived from the current dashboard results.
 * `results` is the array produced by pairing every Crop Card with
 * analyseCrop(crop, latestReading) - one entry per card.
 */
export function calculateFarmStatus(results) {
  if (!results || results.length === 0) return 'No Crops';
  if (results.some((r) => r.condition === 'Sensor Unavailable')) return 'Sensor Feed Unavailable';
  if (results.some((r) => r.condition === 'Sensor Problem' || r.condition === 'Invalid Data')) return 'Critical';
  if (
    results.some(
      (r) => r.condition === 'Dry' || r.condition === 'Too Wet' || (r.alerts || []).includes('High temperature')
    )
  ) {
    return 'Watch';
  }
  return 'Normal';
}

/** Builds the { crop, latest_reading, condition, recommended_water, alerts, action } shape for one card. */
export function buildCardResult(crop, readings) {
  const latest_reading = readings === null ? null : getLatestReading(crop.crop_name, readings);
  const analysis = analyseCrop(crop, latest_reading);
  return { crop, latest_reading, ...analysis };
}
