// services/api.js
// Thin wrapper around fetch for talking to the Express backend.
// Requests go through the Vite dev proxy (see vite.config.js), so relative
// /api/... paths reach the backend without CORS trouble in development.

const CROPS_BASE = '/api/crops';
const READINGS_URL = '/api/readings';

async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const api = {
  listCrops: () => fetch(CROPS_BASE).then(handle),
  getCrop: (id) => fetch(`${CROPS_BASE}/${id}`).then(handle),
  createCrop: (payload) =>
    fetch(CROPS_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(handle),
  updateCrop: (id, payload) =>
    fetch(`${CROPS_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(handle),
  deleteCrop: (id) => fetch(`${CROPS_BASE}/${id}`, { method: 'DELETE' }).then(handle),
  getReadings: () => fetch(READINGS_URL).then(handle),
};
