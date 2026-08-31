import React from 'react';
import { analyseCrop } from '../utils/analysis.js';

/** All readings matching the selected crop, newest first, each analysed with the same analyseCrop function. */
export default function SensorHistory({ crop, readings, onClose }) {
  const rows = (readings || [])
    .filter((r) => r.crop_name === crop.crop_name)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h3>Sensor History - {crop.crop_name}</h3>
          <button type="button" className="link-btn" onClick={onClose}>
            Close
          </button>
        </div>

        <table className="history-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Moisture</th>
              <th>Temp</th>
              <th>Rainfall</th>
              <th>Status</th>
              <th>Condition</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const { condition } = analyseCrop(crop, r);
              return (
                <tr key={r.timestamp}>
                  <td>{r.timestamp}</td>
                  <td>{r.soil_moisture}%</td>
                  <td>{r.temperature} C</td>
                  <td>{r.rainfall} mm</td>
                  <td>{r.sensor_status}</td>
                  <td>{condition}</td>
                  <td>{r.notes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
