// cropValidation.js
// Backend validation for Crop Card requests. The API must never crash or
// silently accept bad data, even if the frontend is bypassed (e.g. a raw
// POST from Postman/curl). Backend validation is authoritative.

const VALID_CROP_NAMES = ['Tomato', 'Lettuce', 'Wheat', 'Maize'];

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function validateCropName(crop_name) {
  if (typeof crop_name !== 'string' || crop_name.trim() === '') {
    return 'crop_name is required';
  }
  return null;
}

function validateLocation(location) {
  if (typeof location !== 'string' || location.length < 1 || location.length > 100) {
    return 'location is required';
  }
  return null;
}

function validateTargetRange(target_min, target_max) {
  if (!isFiniteNumber(target_min) || target_min < 0 || target_min > 100) {
    return 'target_min must be a number between 0 and 100';
  }
  if (!isFiniteNumber(target_max) || target_max < 0 || target_max > 100) {
    return 'target_max must be a number between 0 and 100';
  }
  if (target_min >= target_max) {
    return 'target_min must be less than target_max';
  }
  return null;
}

function validateNormalWater(normal_water) {
  if (!isFiniteNumber(normal_water) || normal_water <= 0 || normal_water > 10000) {
    return 'normal_water must be a number greater than 0 and at most 10000';
  }
  return null;
}

function validateNotes(notes) {
  if (notes === undefined || notes === null || notes === '') return null;
  if (typeof notes !== 'string' || notes.length > 500) {
    return 'notes must be a string up to 500 characters';
  }
  return null;
}

/** Full validation for POST /api/crops. Returns the first error message, or null. */
function validateCropCreateBody(body) {
  return (
    validateCropName(body.crop_name) ||
    validateLocation(body.location) ||
    validateTargetRange(body.target_min, body.target_max) ||
    validateNormalWater(body.normal_water) ||
    validateNotes(body.notes) ||
    null
  );
}

/** Validation for PUT /api/crops/:id. crop_name immutability is checked separately by the route. */
function validateCropUpdateBody(body) {
  return (
    validateLocation(body.location) ||
    validateTargetRange(body.target_min, body.target_max) ||
    validateNormalWater(body.normal_water) ||
    validateNotes(body.notes) ||
    null
  );
}

module.exports = {
  VALID_CROP_NAMES,
  validateCropCreateBody,
  validateCropUpdateBody,
};
