import React, { useState, useEffect } from 'react';
import { flightService } from '../../services/flightService';
import type { Flight } from '../../types';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../services/firebase';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../ui/Toast';
import { CesiumMap } from '../map/CesiumMap';
import './AdminDashboard.css';

export const AdminDashboard: React.FC = () => {
  const [allFlights, setAllFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'rescheduled' | 'canceled'>('active');
  const [selectedFlightIds, setSelectedFlightIds] = useState<Set<string>>(new Set());
  const [checkingSelected, setCheckingSelected] = useState(false);
  const [sendingNotifications, setSendingNotifications] = useState(false);
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    const unsubscribe = flightService.subscribeToAllFlights((flights) => {
      setAllFlights(flights);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Enable scrolling for admin page
  useEffect(() => {
    // Allow body and root to scroll
    document.body.style.overflow = 'auto';
    document.body.style.height = 'auto';
    const root = document.getElementById('root');
    if (root) {
      root.style.overflow = 'auto';
      root.style.height = 'auto';
    }

    // Cleanup: restore original styles when component unmounts
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
      if (root) {
        root.style.overflow = '';
        root.style.height = '';
      }
    };
  }, []);

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const isFlightPassed = (flight: Flight): boolean => {
    let scheduledTime: Date;
    if (flight.scheduledTime && typeof flight.scheduledTime === 'object' && 'toDate' in flight.scheduledTime) {
      scheduledTime = (flight.scheduledTime as any).toDate();
    } else if (flight.scheduledTime instanceof Date) {
      scheduledTime = flight.scheduledTime;
    } else {
      scheduledTime = new Date(flight.scheduledTime);
    }
    return scheduledTime < new Date() && flight.status === 'scheduled';
  };

  const handleFlightToggle = (flightId: string) => {
    setSelectedFlightIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(flightId)) {
        newSet.delete(flightId);
      } else {
        newSet.add(flightId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const filtered = getFilteredFlights();
    const allFlightIds = new Set(filtered.map(f => f.id));
    
    if (selectedFlightIds.size === allFlightIds.size && 
        Array.from(allFlightIds).every(id => selectedFlightIds.has(id))) {
      // All selected, deselect all
      setSelectedFlightIds(new Set());
    } else {
      // Select all
      setSelectedFlightIds(new Set(allFlightIds));
    }
  };

  const handleCheckSelectedFlights = async () => {
    if (selectedFlightIds.size === 0) {
      showToast('Please select at least one flight', 'warning');
      return;
    }

    setCheckingSelected(true);
    try {
      const filtered = getFilteredFlights();
      const selectedFlights = filtered.filter(f => selectedFlightIds.has(f.id));
      
      if (selectedFlights.length === 0) {
        showToast('No flights found', 'info');
        return;
      }

      // Check weather for selected flights
      const triggerWeatherCheck = httpsCallable(functions, 'triggerWeatherCheck');
      await triggerWeatherCheck();
      
      showToast(
        `Checking ${selectedFlights.length} selected flight(s)...`,
        'info'
      );

      // Show summary after a short delay
      setTimeout(() => {
        const safeCount = selectedFlights.filter(f => f.safetyStatus === 'safe').length;
        const marginalCount = selectedFlights.filter(f => f.safetyStatus === 'marginal').length;
        const dangerousCount = selectedFlights.filter(f => f.safetyStatus === 'dangerous').length;
        
        showToast(
          `Checked ${selectedFlights.length} flight(s): ${safeCount} safe, ${marginalCount} marginal, ${dangerousCount} dangerous`,
          safeCount === selectedFlights.length ? 'success' : 'warning'
        );
      }, 2000);
    } catch (error: any) {
      console.error('Error checking selected flights:', error);
      showToast(`Failed to check flights: ${error.message}`, 'error');
    } finally {
      setCheckingSelected(false);
    }
  };

  const handleSendNotifications = async () => {
    if (selectedFlightIds.size === 0) {
      showToast('Please select at least one flight', 'warning');
      return;
    }

    setSendingNotifications(true);
    try {
      const filtered = getFilteredFlights();
      const selectedFlights = filtered.filter(f => selectedFlightIds.has(f.id));
      
      if (selectedFlights.length === 0) {
        showToast('No flights found', 'info');
        return;
      }

      const flightIds = Array.from(selectedFlightIds);
      
      showToast(
        `Sending notifications to ${selectedFlights.length} student(s)...`,
        'info'
      );

      // Call Cloud Function to send notifications
      const sendNotifications = httpsCallable(functions, 'sendNotificationsToStudents');
      const result = await sendNotifications({ flightIds });

      const data = result.data as any;
      
      if (data.success) {
        if (data.failed > 0 && data.results) {
          // Show detailed error messages for failed notifications
          const failedResults = data.results.filter((r: any) => !r.success);
          const errorMessages = failedResults.map((r: any) => r.error || 'Unknown error').join('; ');
          
          showToast(
            `⚠️ Notifications sent: ${data.succeeded} succeeded, ${data.failed} failed. Errors: ${errorMessages}`,
            'error'
          );
        } else {
          showToast(
            `✅ Notifications sent: ${data.succeeded} succeeded, ${data.failed} failed`,
            data.failed === 0 ? 'success' : 'warning'
          );
        }
      } else {
        showToast('Failed to send notifications', 'error');
      }
    } catch (error: any) {
      console.error('Error sending notifications:', error);
      showToast(`Failed to send notifications: ${error.message}`, 'error');
    } finally {
      setSendingNotifications(false);
    }
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

  const filteredFlights = getFilteredFlights();

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p className="admin-subtitle">Flight Schedule Pro - System Overview</p>
        </div>
        <div className="admin-actions">
          <button className="btn-home" onClick={handleGoHome}>
            🏠 Home
          </button>
        </div>
      </div>

      <div className="admin-tabs">
        <button 
          className={`tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('active');
            setSelectedFlightIds(new Set()); // Clear selection when switching tabs
          }}
        >
          Active Flights
          <span className="tab-count">
            {allFlights.filter(f => f.status === 'scheduled' || f.status === 'completed').length}
          </span>
        </button>
        <button 
          className={`tab ${activeTab === 'rescheduled' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('rescheduled');
            setSelectedFlightIds(new Set()); // Clear selection when switching tabs
          }}
        >
          Rescheduled
          <span className="tab-count">
            {allFlights.filter(f => f.status === 'rescheduled').length}
          </span>
        </button>
        <button 
          className={`tab ${activeTab === 'canceled' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('canceled');
            setSelectedFlightIds(new Set()); // Clear selection when switching tabs
          }}
        >
          Canceled
          <span className="tab-count">
            {allFlights.filter(f => f.status === 'cancelled').length}
          </span>
        </button>
      </div>

      {/* Selection Controls - Only show for active flights */}
      {activeTab === 'active' && filteredFlights.length > 0 && (
        <div className="selection-controls">
          <div className="selection-info">
            <label className="select-all-checkbox">
              <input
                type="checkbox"
                checked={
                  filteredFlights.length > 0 &&
                  filteredFlights.every(f => selectedFlightIds.has(f.id))
                }
                onChange={handleSelectAll}
              />
              <span>Select All ({selectedFlightIds.size} selected)</span>
            </label>
          </div>
          <div className="selection-actions">
            <button
              className="btn-check-selected"
              onClick={handleCheckSelectedFlights}
              disabled={checkingSelected || selectedFlightIds.size === 0}
            >
              {checkingSelected ? 'Checking...' : `✓ Check Selected (${selectedFlightIds.size})`}
            </button>
            <button
              className="btn-send-notification"
              onClick={handleSendNotifications}
              disabled={sendingNotifications || selectedFlightIds.size === 0}
            >
              {sendingNotifications ? 'Sending...' : `📧 Send Notification (${selectedFlightIds.size})`}
            </button>
          </div>
        </div>
      )}

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
                  {activeTab === 'active' && <th className="checkbox-column"></th>}
                  <th>Student</th>
                  <th>Level</th>
                  <th>Route</th>
                  <th>Scheduled</th>
                  <th>Safety</th>
                </tr>
              </thead>
              <tbody>
                {filteredFlights.map(flight => {
                  const passed = isFlightPassed(flight);
                  const isSelected = selectedFlightIds.has(flight.id);
                  return (
                    <tr 
                      key={flight.id} 
                      className={`${passed ? 'flight-passed' : ''} ${isSelected ? 'row-selected' : ''}`}
                    >
                      {activeTab === 'active' && (
                        <td className="checkbox-column">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleFlightToggle(flight.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                      )}
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
                      <td>
                        <div className="scheduled-time">
                          {formatDate(flight.scheduledTime)}
                          {passed && (
                            <span className="passed-indicator" title="Flight time has passed">
                              ⏰ Passed
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="safety-cell">
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
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

      {/* 3D Map Section - Shows only active flights */}
      <div className="admin-map-section">
        <h2 className="admin-map-title">🌍 Global Flight Map</h2>
        <p className="admin-map-subtitle">View active flights on the 3D globe (scheduled & completed)</p>
        <div className="admin-map-container">
          <CesiumMap allFlights={allFlights.filter(f => f.status === 'scheduled' || f.status === 'completed')} />
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

