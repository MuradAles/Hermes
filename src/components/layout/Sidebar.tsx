import React, { useState } from 'react';
import type { User, Flight } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useFlights } from '../../hooks/useFlights';
import { FlightCard } from '../flights/FlightCard';
import { FlightForm } from '../flights/FlightForm';
import { WeatherAlert } from '../weather/WeatherAlert';
import { RescheduleModal } from '../flights/RescheduleModal';
import './Sidebar.css';

interface SidebarProps {
  user: User;
  selectedFlightId: string | null;
  onSelectFlight: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, selectedFlightId, onSelectFlight }) => {
  const { signOut } = useAuth();
  const { flights, loading, deleteFlight, rescheduleFlight } = useFlights(user.uid);
  const [showNewFlight, setShowNewFlight] = useState(false);
  const [flightToReschedule, setFlightToReschedule] = useState<Flight | null>(null);

  const selectedFlight = flights.find(f => f.id === selectedFlightId);

  const handleNewFlight = () => {
    setShowNewFlight(true);
  };

  const handleCloseForm = () => {
    setShowNewFlight(false);
  };

  const handleDeleteFlight = async (flightId: string) => {
    try {
      await deleteFlight(flightId);
      // If the deleted flight was selected, clear selection
      if (selectedFlightId === flightId) {
        onSelectFlight('');
      }
    } catch (error) {
      console.error('Error deleting flight:', error);
      alert('Failed to delete flight. Please try again.');
    }
  };

  const handleReschedule = (flight: Flight) => {
    setFlightToReschedule(flight);
  };

  const handleCloseReschedule = () => {
    setFlightToReschedule(null);
  };

  const handleConfirmReschedule = async (oldFlightId: string, newFlightData: any) => {
    try {
      await rescheduleFlight(oldFlightId, newFlightData);
      // If rescheduled flight was selected, clear selection
      if (selectedFlightId === oldFlightId) {
        onSelectFlight('');
      }
    } catch (error) {
      console.error('Error rescheduling flight:', error);
      throw error; // Re-throw to show error in modal
    }
  };

  return (
    <>
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

        {selectedFlight && <WeatherAlert flight={selectedFlight} />}
        
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
                  onDelete={handleDeleteFlight}
                  onReschedule={handleReschedule}
                />
              ))
            )}
          </div>
        </div>
      </aside>

      {showNewFlight && <FlightForm user={user} onClose={handleCloseForm} />}
      {flightToReschedule && (
        <RescheduleModal
          flight={flightToReschedule}
          onClose={handleCloseReschedule}
          onReschedule={handleConfirmReschedule}
        />
      )}
    </>
  );
};

