import React, { useState, useEffect } from 'react';
import { flightService } from '../../services/flightService';
import type { Flight } from '../../types';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../services/firebase';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../ui/Toast';
import './AdminDashboard.css';

export const AdminDashboard: React.FC = () => {
  const [allFlights, setAllFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'rescheduled' | 'canceled'>('active');
  const [refreshing, setRefreshing] = useState(false);
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    const unsubscribe = flightService.subscribeToAllFlights((flights) => {
      setAllFlights(flights);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRefreshWeather = async () => {
    setRefreshing(true);
    try {
      const triggerWeatherCheck = httpsCallable(functions, 'triggerWeatherCheck');
      await triggerWeatherCheck();
      showToast('Weather check completed successfully!', 'success');
    } catch (error: any) {
      console.error('Error triggering weather check:', error);
      showToast(`Failed to trigger weather check: ${error.message}`, 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const getFilteredFlights = () => {
    switch (activeTab) {
      case 'active':
        return allFlights.filter(f => f.status === 'scheduled' || f.status === 'completed');
      case 'rescheduled':
        return allFlights.filter(f => f.status === 'rescheduled');
      case 'canceled':
        return allFlights.filter(f => f.status === 'cancelled');
      default:
        return allFlights;
    }
  };

  const formatDate = (date: any) => {
    let d: Date;
    if (date?.toDate) {
      d = date.toDate();
    } else if (date instanceof Date) {
      d = date;
    } else {
      d = new Date(date);
    }
    
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe': return '#10b981';
      case 'marginal': return '#f59e0b';
      case 'dangerous': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'scheduled': '#60a5fa',
      'completed': '#10b981',
      'cancelled': '#ef4444',
      'rescheduled': '#f59e0b',
    };

    return (
      <span 
        className="status-badge" 
        style={{ background: colors[status] || '#6b7280' }}
      >
        {status}
      </span>
    );
  };

  const filteredFlights = getFilteredFlights();

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p className="admin-subtitle">Flight Schedule Pro - System Overview</p>
        </div>
        <div className="admin-actions">
          <button 
            className="btn-refresh"
            onClick={handleRefreshWeather}
            disabled={refreshing}
          >
            {refreshing ? 'Checking Paths...' : '✈️ Check All Flight Paths'}
          </button>
          <button className="btn-home" onClick={handleGoHome}>
            🏠 Home
          </button>
          <button 
            className="btn-alert"
            onClick={() => showToast('🚨 TEST ALERT: Weather monitoring system is active!', 'info')}
          >
            🔔 Test Alert
          </button>
        </div>
      </div>

      <div className="admin-tabs">
        <button 
          className={`tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active Flights
          <span className="tab-count">
            {allFlights.filter(f => f.status === 'scheduled' || f.status === 'completed').length}
          </span>
        </button>
        <button 
          className={`tab ${activeTab === 'rescheduled' ? 'active' : ''}`}
          onClick={() => setActiveTab('rescheduled')}
        >
          Rescheduled
          <span className="tab-count">
            {allFlights.filter(f => f.status === 'rescheduled').length}
          </span>
        </button>
        <button 
          className={`tab ${activeTab === 'canceled' ? 'active' : ''}`}
          onClick={() => setActiveTab('canceled')}
        >
          Canceled
          <span className="tab-count">
            {allFlights.filter(f => f.status === 'cancelled').length}
          </span>
        </button>
      </div>

      <div className="admin-content">
        {loading ? (
          <div className="admin-loading">Loading flights...</div>
        ) : filteredFlights.length === 0 ? (
          <div className="admin-empty">
            <p>No {activeTab} flights found</p>
          </div>
        ) : (
          <div className="flights-table-container">
            <table className="flights-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Level</th>
                  <th>Route</th>
                  <th>Scheduled</th>
                  <th>Safety</th>
                  <th>Status</th>
                  <th>Alert</th>
                </tr>
              </thead>
              <tbody>
                {filteredFlights.map(flight => (
                  <tr key={flight.id}>
                    <td className="student-cell">
                      <div className="student-name">{flight.studentName}</div>
                      <div className="student-email">{flight.userId.slice(0, 8)}...</div>
                    </td>
                    <td>
                      <span className="training-level-badge">
                        {flight.trainingLevel.toUpperCase()}
                      </span>
                    </td>
                    <td className="route-cell">
                      <span className="route">
                        {flight.departure.code} → {flight.arrival.code}
                      </span>
                      <div className="route-distance">
                        {Math.round(flight.path.totalDistance)} NM
                      </div>
                    </td>
                    <td>{formatDate(flight.scheduledTime)}</td>
                    <td>
                      <div 
                        className="safety-indicator"
                        style={{ 
                          background: getStatusColor(flight.safetyStatus),
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          display: 'inline-block'
                        }}
                        title={flight.safetyStatus}
                      />
                      <span className="safety-text">{flight.safetyStatus}</span>
                    </td>
                    <td>{getStatusBadge(flight.status)}</td>
                    <td>
                      {flight.needsRescheduling ? (
                        <span className="alert-badge">⚠️ Needs Reschedule</span>
                      ) : (
                        <span className="no-alert">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-stats">
        <div className="stat-card">
          <div className="stat-label">Total Flights</div>
          <div className="stat-value">{allFlights.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active</div>
          <div className="stat-value">
            {allFlights.filter(f => f.status === 'scheduled').length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Need Reschedule</div>
          <div className="stat-value">
            {allFlights.filter(f => f.needsRescheduling).length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completed</div>
          <div className="stat-value">
            {allFlights.filter(f => f.status === 'completed').length}
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

