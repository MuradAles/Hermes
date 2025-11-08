import React from 'react';
import type { Flight } from '../../types';
import './WeatherAlert.css';

export const WeatherAlert: React.FC<{ flight: Flight }> = ({ flight }) => {
  if (flight.safetyStatus === 'safe') return null;

  return (
    <div className={`weather-alert ${flight.safetyStatus}`}>
      <div className="alert-header">
        <span>{flight.safetyStatus === 'dangerous' ? '⚠️' : '⚡'}</span>
        <h4>
          {flight.safetyStatus === 'dangerous' ? 'Flight Not Recommended' : 'Marginal Conditions'}
        </h4>
      </div>
      <p>
        Weather conditions are {flight.safetyStatus === 'dangerous' ? 'unsafe' : 'marginal'} for {flight.trainingLevel} pilots.
      </p>
      <button className="reschedule-btn">Get Reschedule Options</button>
    </div>
  );
};

