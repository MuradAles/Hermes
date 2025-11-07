import React, { useState } from 'react';
import type { User, Flight } from '../../types';
import { useFlights } from '../../hooks/useFlights';
import { calculations } from '../../utils/calculations';
import { weatherService } from '../../services/weatherService';
import { AIRPORTS, airportToLocation } from '../../utils/airports';
import './FlightForm.css';

interface FlightFormProps {
  user: User;
  onClose: () => void;
}

export const FlightForm: React.FC<FlightFormProps> = ({ user, onClose }) => {
  const { createFlight } = useFlights(user.uid);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    departureCode: 'ORD',
    arrivalCode: 'JFK',
    date: '',
    time: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate form
      if (!formData.date || !formData.time) {
        throw new Error('Please select a date and time');
      }

      if (formData.departureCode === formData.arrivalCode) {
        throw new Error('Departure and arrival airports must be different');
      }

      const departureAirport = AIRPORTS[formData.departureCode];
      const arrivalAirport = AIRPORTS[formData.arrivalCode];

      if (!departureAirport || !arrivalAirport) {
        throw new Error('Invalid airport selection');
      }

      const departure = airportToLocation(departureAirport);
      const arrival = airportToLocation(arrivalAirport);
      const scheduledTime = new Date(`${formData.date}T${formData.time}`);

      // Check if time is in the past
      if (scheduledTime < new Date()) {
        throw new Error('Flight time must be in the future');
      }

      // Generate waypoints along flight path with realistic altitude profile
      const waypoints = calculations.generateWaypoints(departure, arrival, 50);
      const waypointsWithETA = calculations.calculateETAs(waypoints, scheduledTime, 120);

      // Check weather along the flight path
      console.log('Checking weather along flight path...');
      const checkpoints = await weatherService.checkFlightPath(
        waypointsWithETA.map((w) => ({ lat: w.lat, lon: w.lon, time: w.time })),
        user.trainingLevel
      );

      // Determine overall safety
      const overallSafety = weatherService.getOverallSafety(checkpoints);

      // Calculate total distance
      const totalDistance = calculations.calculateDistance(
        departure.lat,
        departure.lon,
        arrival.lat,
        arrival.lon
      );

      // Calculate estimated duration in minutes
      const estimatedDuration =
        (waypointsWithETA[waypointsWithETA.length - 1].time.getTime() - scheduledTime.getTime()) /
        (60 * 1000);

      // Create flight object
      const flight: Omit<Flight, 'id'> = {
        userId: user.uid,
        departure,
        arrival,
        scheduledTime,
        studentName: user.displayName,
        trainingLevel: user.trainingLevel,
        path: {
          waypoints: waypointsWithETA,
          totalDistance,
          estimatedDuration,
        },
        safetyStatus: overallSafety.status,
        status: 'scheduled',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create flight in Firestore
      await createFlight(flight);
      
      console.log('Flight created successfully!');
      onClose();
    } catch (err: any) {
      console.error('Error creating flight:', err);
      setError(err.message || 'Failed to create flight');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flight-form-overlay">
      <div className="flight-form-card">
        <div className="flight-form-header">
          <h2>Create New Flight</h2>
          <button className="close-btn" onClick={onClose} disabled={loading}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flight-form">
          {error && (
            <div className="flight-form-error">
              <span>⚠️</span>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="departure">Departure Airport</label>
            <select
              id="departure"
              value={formData.departureCode}
              onChange={(e) => setFormData({ ...formData, departureCode: e.target.value })}
              disabled={loading}
              required
            >
              {Object.entries(AIRPORTS).map(([code, airport]) => (
                <option key={code} value={code}>
                  {code} - {airport.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="arrival">Arrival Airport</label>
            <select
              id="arrival"
              value={formData.arrivalCode}
              onChange={(e) => setFormData({ ...formData, arrivalCode: e.target.value })}
              disabled={loading}
              required
            >
              {Object.entries(AIRPORTS).map(([code, airport]) => (
                <option key={code} value={code}>
                  {code} - {airport.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="date">Date</label>
              <input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                disabled={loading}
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-group">
              <label htmlFor="time">Time</label>
              <input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-info">
            <p>
              <strong>Training Level:</strong> {user.trainingLevel.replace('-', ' ')}
            </p>
            <p className="form-hint">
              Weather conditions will be checked along your entire flight path
            </p>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} disabled={loading} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Creating Flight...' : 'Create Flight'}
            </button>
          </div>

          {loading && (
            <div className="loading-indicator">
              <div className="spinner-small"></div>
              <p>Checking weather conditions...</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

