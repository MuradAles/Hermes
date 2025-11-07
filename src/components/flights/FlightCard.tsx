import React from 'react';
import type { Flight } from '../../types';
import './FlightCard.css';

export const FlightCard: React.FC<{ 
  flight: Flight; 
  isSelected: boolean; 
  onSelect: () => void 
}> = ({ flight, isSelected, onSelect }) => {
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe': return '#10b981';
      case 'marginal': return '#f59e0b';
      case 'dangerous': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'safe': return 'Safe to Fly';
      case 'marginal': return 'Marginal';
      case 'dangerous': return 'Dangerous';
      default: return 'Unknown';
    }
  };

  const formatDate = (date: any) => {
    // Handle Firestore Timestamp objects
    let d: Date;
    if (date?.toDate) {
      d = date.toDate(); // Firestore Timestamp
    } else if (date instanceof Date) {
      d = date;
    } else {
      d = new Date(date);
    }
    
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (date: any) => {
    // Handle Firestore Timestamp objects
    let d: Date;
    if (date?.toDate) {
      d = date.toDate(); // Firestore Timestamp
    } else if (date instanceof Date) {
      d = date;
    } else {
      d = new Date(date);
    }
    
    return d.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div 
      className={`flight-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="flight-route">
        <span className="airport-code">{flight.departure.code}</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="airport-code">{flight.arrival.code}</span>
      </div>
      
      <div className="flight-names">
        {flight.departure.name} → {flight.arrival.name}
      </div>
      
      <div className="flight-datetime">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M7 3.5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span>{formatDate(flight.scheduledTime)} at {formatTime(flight.scheduledTime)}</span>
      </div>
      
      <div 
        className="flight-status-badge"
        style={{ 
          background: `${getStatusColor(flight.safetyStatus)}20`,
          color: getStatusColor(flight.safetyStatus)
        }}
      >
        <span className="status-dot" style={{ background: getStatusColor(flight.safetyStatus) }}></span>
        {getStatusLabel(flight.safetyStatus)}
      </div>
    </div>
  );
};

