import React from 'react';
import './CesiumMap.css';

interface CesiumMapProps {
  selectedFlightId: string | null;
}

export const CesiumMap: React.FC<CesiumMapProps> = ({ selectedFlightId }) => {
  return (
    <div className="cesium-map-placeholder">
      <div className="placeholder-content">
        <div className="globe-icon">🌍</div>
        <h2>3D Globe Visualization</h2>
        <p>Cesium map will be implemented in TASK-3</p>
        {selectedFlightId && (
          <div className="selected-flight-info">
            Selected Flight: {selectedFlightId}
          </div>
        )}
      </div>
    </div>
  );
};

