import React, { useState } from 'react';
import type { User } from '../../types';
import { Sidebar } from './Sidebar';
import { CesiumMap } from '../map/CesiumMap';
import './Dashboard.css';

export const Dashboard: React.FC<{ user: User }> = ({ user }) => {
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);

  return (
    <div className="dashboard">
      <Sidebar 
        user={user}
        selectedFlightId={selectedFlightId}
        onSelectFlight={setSelectedFlightId}
      />
      <div className="map-container">
        <CesiumMap selectedFlightId={selectedFlightId} />
      </div>
    </div>
  );
};

