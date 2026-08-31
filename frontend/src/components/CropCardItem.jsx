import React from 'react';

const CONDITION_CLASS = {
  Dry: 'condition-dry',
  Healthy: 'condition-healthy',
  'Too Wet': 'condition-wet',
  'Sensor Problem': 'condition-problem',
  'Invalid Data': 'condition-problem',
  'Sensor Unavailable': 'condition-unavailable',
};

export default function CropCardItem({ result, onEdit, onDelete, onViewHistory }) {
  const { crop, latest_reading, condition, recommended_water, alerts, action } = result;
  const conditionClass = CONDITION_CLASS[condition] || '';

  return (
    <div className={`crop-card ${conditionClass}`}>
      <div className="crop-card-header">
        <h3>
          {crop.crop_name} - {crop.location}
        </h3>
        <span className={`condition-badge ${conditionClass}`}>{condition}</span>
      </div>

      {latest_reading ? (
        <>
          <p className="crop-card-meta">Latest: {latest_reading.timestamp}</p>
          <p className="crop-card-readings">
            Moisture: {latest_reading.soil_moisture}% &nbsp; Temperature: {latest_reading.temperature} C &nbsp;
            Rainfall: {latest_reading.rainfall} mm
          </p>
          <p className="crop-card-meta">Sensor status: {latest_reading.sensor_status}</p>
        </>
      ) : (
        <p className="crop-card-meta">No sensor data available.</p>
      )}

      <p>
        <strong>Recommended water:</strong> {recommended_water === 'N/A' ? 'N/A' : `${recommended_water} L`}
      </p>
      {alerts && alerts.length > 0 && (
        <p className="crop-card-alerts">
          <strong>Alert:</strong> {alerts.join(', ')}
        </p>
      )}
      <p>
        <strong>Action:</strong> {action}
      </p>

      <p className="crop-card-settings">
        Target: {crop.target_min}-{crop.target_max}% &nbsp; Normal water: {crop.normal_water} L
        {crop.notes ? ` • ${crop.notes}` : ''}
      </p>

      <div className="crop-card-actions">
        <button type="button" className="btn btn-secondary btn-small" onClick={() => onEdit(crop)}>
          Edit
        </button>
        <button type="button" className="btn btn-danger btn-small" onClick={() => onDelete(crop)}>
          Delete
        </button>
        <button type="button" className="link-btn" onClick={() => onViewHistory(crop)}>
          View Sensor History
        </button>
      </div>
    </div>
  );
}
