import React, { useState } from 'react';

const emptyValues = {
  crop_name: '',
  location: '',
  target_min: '',
  target_max: '',
  normal_water: '',
  notes: '',
};

/** Client-side validation mirroring the backend rules, for instant feedback. The backend re-validates independently. */
function validate(values, mode) {
  const errors = [];

  if (mode === 'create' && !values.crop_name) {
    errors.push('Please select a crop name.');
  }
  if (!values.location || !values.location.trim() || values.location.length > 100) {
    errors.push('Location is required (1-100 characters).');
  }

  const min = Number(values.target_min);
  const max = Number(values.target_max);
  if (values.target_min === '' || Number.isNaN(min) || min < 0 || min > 100) {
    errors.push('Target min must be a number between 0 and 100.');
  }
  if (values.target_max === '' || Number.isNaN(max) || max < 0 || max > 100) {
    errors.push('Target max must be a number between 0 and 100.');
  }
  if (!errors.length && min >= max) {
    errors.push('Target min must be less than target max.');
  }

  const water = Number(values.normal_water);
  if (values.normal_water === '' || Number.isNaN(water) || water <= 0 || water > 10000) {
    errors.push('Normal water must be a number greater than 0 and at most 10000 litres.');
  }

  if (values.notes && values.notes.length > 500) {
    errors.push('Notes must be at most 500 characters.');
  }

  return errors;
}

export default function CropForm({ mode, availableCropNames, initialValues, onSubmit, onCancel, submitting, serverError }) {
  const [values, setValues] = useState({ ...emptyValues, ...initialValues });
  const [errors, setErrors] = useState([]);

  function update(field, value) {
    setValues((v) => ({ ...v, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate(values, mode);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors([]);

    const payload = {
      location: values.location.trim(),
      target_min: Number(values.target_min),
      target_max: Number(values.target_max),
      normal_water: Number(values.normal_water),
      notes: values.notes ? values.notes.trim() : '',
    };
    if (mode === 'create') payload.crop_name = values.crop_name;

    onSubmit(payload);
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <fieldset>
        <legend>{mode === 'create' ? 'Add Crop Card' : `Edit ${values.crop_name}`}</legend>

        {errors.length > 0 && (
          <div className="alert alert-error">
            <strong>Please fix the following:</strong>
            <ul>
              {errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        )}
        {errors.length === 0 && serverError && <div className="alert alert-error">{serverError}</div>}

        <label htmlFor="crop_name">
          Crop name <span className="req">*</span>
        </label>
        {mode === 'create' ? (
          <select id="crop_name" value={values.crop_name} onChange={(e) => update('crop_name', e.target.value)}>
            <option value="">Select a crop...</option>
            {availableCropNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        ) : (
          <input type="text" id="crop_name" value={values.crop_name} readOnly disabled />
        )}
        {mode === 'create' && availableCropNames.length === 0 && (
          <p className="hint">Every crop in the sensor feed already has a card.</p>
        )}

        <label htmlFor="location">
          Location <span className="req">*</span>
        </label>
        <input
          type="text"
          id="location"
          maxLength={100}
          value={values.location}
          onChange={(e) => update('location', e.target.value)}
        />

        <label htmlFor="target_min">
          Target moisture min (%) <span className="req">*</span>
        </label>
        <input
          type="number"
          id="target_min"
          min={0}
          max={100}
          value={values.target_min}
          onChange={(e) => update('target_min', e.target.value)}
        />

        <label htmlFor="target_max">
          Target moisture max (%) <span className="req">*</span>
        </label>
        <input
          type="number"
          id="target_max"
          min={0}
          max={100}
          value={values.target_max}
          onChange={(e) => update('target_max', e.target.value)}
        />

        <label htmlFor="normal_water">
          Normal water amount (L) <span className="req">*</span>
        </label>
        <input
          type="number"
          id="normal_water"
          min={0}
          max={10000}
          value={values.normal_water}
          onChange={(e) => update('normal_water', e.target.value)}
        />

        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          rows={3}
          maxLength={500}
          value={values.notes}
          onChange={(e) => update('notes', e.target.value)}
        />

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : mode === 'create' ? 'Create Crop Card' : 'Save changes'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        </div>
      </fieldset>
    </form>
  );
}
