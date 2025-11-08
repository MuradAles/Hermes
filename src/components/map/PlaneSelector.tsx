import React from 'react';
import './PlaneSelector.css';

export interface PlaneModel {
  name: string;
  uri: string;
}

export const AVAILABLE_PLANES: PlaneModel[] = [
  { name: 'G3 JSC Air', uri: '/assets/G3_JSC_AIR_0824.glb' },
  { name: 'Sierra ARC Air', uri: '/assets/SIERRA_ARC_AIR_0824.glb' },
  { name: 'WB57 JSC Air', uri: '/assets/WB57_JSC_AIR_0824.glb' },
  { name: 'C20A AFRC UAVSAR', uri: '/assets/C20A_AFRC_UAVSAR_AIR_0824.glb' },
  { name: 'G4 NOAA Air', uri: '/assets/G4_NOAA_AIR_0824.glb' },
];

interface PlaneSelectorProps {
  selectedPlane: string;
  onPlaneChange: (planeUri: string) => void;
}

export const PlaneSelector: React.FC<PlaneSelectorProps> = ({ 
  selectedPlane, 
  onPlaneChange 
}) => {
  return (
    <div className="plane-selector">
      <label htmlFor="plane-select" className="plane-selector-label">
        Plane Model
      </label>
      <select
        id="plane-select"
        className="plane-selector-select"
        value={selectedPlane}
        onChange={(e) => onPlaneChange(e.target.value)}
      >
        {AVAILABLE_PLANES.map((plane) => (
          <option key={plane.uri} value={plane.uri}>
            {plane.name}
          </option>
        ))}
      </select>
    </div>
  );
};

