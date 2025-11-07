import React, { useState } from 'react';
import type { User } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useFlights } from '../../hooks/useFlights';
import { FlightCard } from '../flights/FlightCard';
import './Sidebar.css';

interface SidebarProps {
  user: User;
  selectedFlightId: string | null;
  onSelectFlight: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, selectedFlightId, onSelectFlight }) => {
  const { signOut } = useAuth();
  const { flights, loading } = useFlights(user.uid);
  const [showNewFlight, setShowNewFlight] = useState(false);

  const handleNewFlight = () => {
    setShowNewFlight(true);
    // TODO: Implement flight form in TASK-2
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="user-info">
          <h3>{user.displayName}</h3>
          <span className="training-level">{user.trainingLevel.replace('-', ' ')}</span>
        </div>
        <button onClick={signOut} className="btn-signout">
          Sign Out
        </button>
      </div>
      
      <button className="new-flight-btn" onClick={handleNewFlight}>
        <span className="plus-icon">+</span>
        New Flight
      </button>
      
      <div className="flights-section">
        <h4 className="flights-title">Your Flights</h4>
        <div className="flights-list">
          {loading ? (
            <div className="loading-flights">Loading flights...</div>
          ) : flights.length === 0 ? (
            <div className="no-flights">
              <p>No flights yet</p>
              <p className="no-flights-hint">Create your first flight to get started</p>
            </div>
          ) : (
            flights.map(flight => (
              <FlightCard
                key={flight.id}
                flight={flight}
                isSelected={flight.id === selectedFlightId}
                onSelect={() => onSelectFlight(flight.id)}
              />
            ))
          )}
        </div>
      </div>
    </aside>
  );
};

