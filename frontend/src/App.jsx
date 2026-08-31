import React, { useEffect, useState } from 'react';
import { api } from './services/api.js';
import { getAvailableCropNames, buildCardResult, calculateFarmStatus } from './utils/analysis.js';
import CropCardItem from './components/CropCardItem.jsx';
import CropForm from './components/CropForm.jsx';
import SensorHistory from './components/SensorHistory.jsx';

export default function App() {
  // Crop Cards (SQLite, via GET/POST/PUT/DELETE /api/crops)
  const [crops, setCrops] = useState(null); // null = not loaded yet
  const [cropsLoading, setCropsLoading] = useState(true);
  const [cropsError, setCropsError] = useState(null);

  // Sensor readings (read-only JSON, via GET /api/readings)
  const [readings, setReadings] = useState(null); // null until a fetch has succeeded at least once
  const [readingsError, setReadingsError] = useState(null);
  const [readingsLoading, setReadingsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null); // React state only, resets on reload

  // UI state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCrop, setEditingCrop] = useState(null);
  const [historyCrop, setHistoryCrop] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [banner, setBanner] = useState(null); // { type: 'success' | 'error', message }

  async function loadCrops() {
    setCropsLoading(true);
    try {
      const data = await api.listCrops();
      setCrops(data);
      setCropsError(null);
    } catch (err) {
      setCropsError(err.message);
    } finally {
      setCropsLoading(false);
    }
  }

  async function loadReadings() {
    setReadingsLoading(true);
    try {
      const data = await api.getReadings();
      setReadings(data);
      setReadingsError(null);
      setLastRefresh(new Date());
    } catch (err) {
      // First failure: readings stays null (N/A everywhere, Create disabled, lastRefresh stays Never).
      // Later failure: previous readings/lastRefresh are left untouched by simply not overwriting them.
      setReadingsError(err.message);
    } finally {
      setReadingsLoading(false);
    }
  }

  useEffect(() => {
    loadCrops();
    loadReadings();
  }, []);

  function closeForms() {
    setShowCreateForm(false);
    setEditingCrop(null);
    setFormError(null);
  }

  async function handleCreate(payload) {
    setFormSubmitting(true);
    setFormError(null);
    try {
      await api.createCrop(payload);
      closeForms();
      await loadCrops();
      setBanner({ type: 'success', message: `${payload.crop_name} card created.` });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleUpdate(id, payload) {
    setFormSubmitting(true);
    setFormError(null);
    try {
      await api.updateCrop(id, payload);
      closeForms();
      await loadCrops();
      setBanner({ type: 'success', message: 'Crop card updated.' });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleDelete(crop) {
    const confirmed = window.confirm(`Delete the ${crop.crop_name} card? The sensor data will not be affected.`);
    if (!confirmed) return;
    try {
      await api.deleteCrop(crop.id);
      await loadCrops();
      setBanner({ type: 'success', message: `${crop.crop_name} card deleted.` });
    } catch (err) {
      setBanner({ type: 'error', message: err.message });
    }
  }

  // ---- Loading / error states (per Section 11 of the assignment) ----

  if (cropsLoading && crops === null) {
    return (
      <div className="app-shell">
        <main>
          <p className="loading-state">Loading Crop Cards...</p>
        </main>
      </div>
    );
  }

  if (cropsError) {
    return (
      <div className="app-shell">
        <main>
          <div className="alert alert-error">
            <strong>Could not load Crop Cards:</strong> {cropsError}
          </div>
          <button type="button" className="btn btn-primary" onClick={loadCrops}>
            Retry
          </button>
        </main>
      </div>
    );
  }

  // ---- Dashboard ----

  const results = crops.map((crop) => buildCardResult(crop, readings));
  const farmStatus = calculateFarmStatus(results);
  const availableCropNames = getAvailableCropNames(readings || [], crops);
  const sensorFeedReady = readings !== null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">
          <span className="brand-mark">SF</span> SmartFarm Crop Dashboard
        </span>
      </header>

      <main>
        <section className="summary-bar">
          <div className="summary-stats">
            <span>
              Overall Status: <strong className={`status-pill status-${farmStatus.toLowerCase().replace(/\s+/g, '-')}`}>{farmStatus}</strong>
            </span>
            <span>Crop cards: {crops.length}</span>
            <span>Last sensor refresh: {lastRefresh ? lastRefresh.toLocaleTimeString() : 'Never'}</span>
          </div>
          <div className="summary-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!sensorFeedReady}
              onClick={() => {
                setEditingCrop(null);
                setFormError(null);
                setShowCreateForm(true);
              }}
              title={!sensorFeedReady ? 'Sensor feed unavailable - cannot create a card yet' : undefined}
            >
              Add Crop Card
            </button>
            <button type="button" className="btn btn-secondary" onClick={loadReadings} disabled={readingsLoading}>
              {readingsLoading ? 'Refreshing...' : 'Refresh Sensor Data'}
            </button>
          </div>
        </section>

        {!sensorFeedReady && (
          <div className="alert alert-warning">
            Sensor feed unavailable{readingsError ? `: ${readingsError}` : ''}. Crop Cards are shown without live
            sensor results.
          </div>
        )}
        {sensorFeedReady && readingsError && (
          <div className="alert alert-error">Refresh failed: {readingsError}. Showing the last successful data.</div>
        )}
        {banner && <div className={`alert alert-${banner.type === 'success' ? 'success' : 'error'}`}>{banner.message}</div>}

        {crops.length === 0 ? (
          <div className="empty-state">
            <p>No Crop Cards yet.</p>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!sensorFeedReady}
              onClick={() => setShowCreateForm(true)}
            >
              Add Crop Card
            </button>
          </div>
        ) : (
          <div className="crop-grid">
            {results.map((result) => (
              <CropCardItem
                key={result.crop.id}
                result={result}
                onEdit={setEditingCrop}
                onDelete={handleDelete}
                onViewHistory={setHistoryCrop}
              />
            ))}
          </div>
        )}

        {showCreateForm && (
          <CropForm
            mode="create"
            availableCropNames={availableCropNames}
            initialValues={{}}
            submitting={formSubmitting}
            serverError={formError}
            onSubmit={handleCreate}
            onCancel={closeForms}
          />
        )}

        {editingCrop && (
          <CropForm
            mode="edit"
            availableCropNames={[]}
            initialValues={editingCrop}
            submitting={formSubmitting}
            serverError={formError}
            onSubmit={(payload) => handleUpdate(editingCrop.id, payload)}
            onCancel={closeForms}
          />
        )}

        {historyCrop && (
          <SensorHistory crop={historyCrop} readings={readings || []} onClose={() => setHistoryCrop(null)} />
        )}
      </main>
    </div>
  );
}
