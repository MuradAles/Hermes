import React, { useState } from 'react';
import type { Flight } from '../../types';
import { weatherService } from '../../services/weatherService';
import { aiService } from '../../services/aiService';
import { calculateFlightPath } from '../../utils/flightPath';
import './RescheduleModal.css';

interface RescheduleModalProps {
  flight: Flight;
  onClose: () => void;
  onReschedule: (oldFlightId: string, newFlightData: any) => Promise<void>;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({ flight, onClose, onReschedule }) => {
  const [mode, setMode] = useState<'choice' | 'manual' | 'ai'>('choice');
  const [loading, setLoading] = useState(false);
  const [aiSearchResults, setAiSearchResults] = useState<Array<{
    scheduledTime: Date;
    safety: { status: string; score: number } | null;
    waypointCount: number;
    topIssues: string[];
    checkpoints: any[] | null;
  }> | null>(null);
  const [aiProgress, setAiProgress] = useState('');
  const [error, setError] = useState('');

  // Manual reschedule state
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  const handleGetAISuggestions = async () => {
    setLoading(true);
    setError('');
    setAiProgress('Initializing AI search...');
    try {
      // Convert Firestore Timestamp to Date
      let scheduledDate: Date;
      if (flight.scheduledTime instanceof Date) {
        scheduledDate = flight.scheduledTime;
      } else if (flight.scheduledTime && typeof flight.scheduledTime === 'object' && 'toDate' in flight.scheduledTime) {
        scheduledDate = (flight.scheduledTime as any).toDate();
      } else {
        scheduledDate = new Date(flight.scheduledTime);
      }

      // Use AI service to find safe flight times (checks 20 time slots across 5 days)
      const result = await aiService.findSafeFlightTime(
        flight.departure,
        flight.arrival,
        flight.trainingLevel,
        scheduledDate, // Start searching from current flight time
        (message) => {
          setAiProgress(message);
        }
      );

      // Store all search results for the table
      if (result.allResults) {
        setAiSearchResults(result.allResults);
      }

      if (result.success) {
        setAiProgress(`✅ ${result.reason} (Checked ${result.attempts} times)`);
      } else {
        setAiProgress('');
        setError(result.reason);
      }

      setMode('ai');
    } catch (err: any) {
      setError(err.message || 'Failed to get AI suggestions');
      setAiProgress('');
    } finally {
      setLoading(false);
    }
  };

  const handleManualReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const newTime = new Date(`${scheduledDate}T${scheduledTime}`);
      
      // Calculate new flight path
      const path = calculateFlightPath(flight.departure, flight.arrival, newTime);
      
      // Check weather along path
      const checkpoints = await weatherService.checkFlightPath(
        path.waypoints,
        flight.trainingLevel
      );
      
      const overallSafety = weatherService.getOverallSafety(checkpoints);

      // ⚠️ SAFETY CHECK: Warn user if conditions are not safe
      if (overallSafety.status === 'dangerous') {
        const confirmed = window.confirm(
          '❌ DANGEROUS WEATHER DETECTED!\n\n' +
          `Safety Score: ${Math.round(overallSafety.score)}/100\n\n` +
          'Weather conditions are unsafe for this flight. ' +
          'Flying in these conditions could be hazardous.\n\n' +
          'Are you ABSOLUTELY SURE you want to schedule this flight?'
        );
        if (!confirmed) {
          setLoading(false);
          return;
        }
      } else if (overallSafety.status === 'marginal') {
        const confirmed = window.confirm(
          '⚠️ MARGINAL WEATHER CONDITIONS\n\n' +
          `Safety Score: ${Math.round(overallSafety.score)}/100\n\n` +
          'Weather conditions are marginal. Extra caution is advised.\n\n' +
          'Do you want to continue with this flight time?'
        );
        if (!confirmed) {
          setLoading(false);
          return;
        }
      }

      const newFlightData = {
        userId: flight.userId,
        departure: flight.departure,
        arrival: flight.arrival,
        scheduledTime: newTime,
        studentName: flight.studentName,
        trainingLevel: flight.trainingLevel,
        path,
        weatherData: checkpoints,
        safetyStatus: overallSafety.status,
        status: 'scheduled' as const,
      };

      await onReschedule(flight.id, newFlightData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to reschedule flight');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Reschedule Flight</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {mode === 'choice' && (
          <div className="reschedule-choice">
            <p className="flight-info">
              {flight.departure.code} → {flight.arrival.code}
            </p>
            <p className="choice-prompt">How would you like to reschedule?</p>
            
            <div className="choice-buttons">
              <button 
                className="choice-btn manual-btn"
                onClick={() => setMode('manual')}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Pick New Time</span>
                <small>Choose your own date and time</small>
              </button>

              <button 
                className="choice-btn ai-btn"
                onClick={handleGetAISuggestions}
                disabled={loading}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>{loading ? 'Searching 20 Time Slots...' : 'Get AI Suggestions'}</span>
                <small>{loading ? 'Checking weather across 5 days' : 'AI checks next 5 days of weather'}</small>
              </button>
            </div>
          </div>
        )}

        {mode === 'manual' && (
          <div className="manual-reschedule">
            <button className="back-btn" onClick={() => setMode('choice')}>← Back</button>
            <form onSubmit={handleManualReschedule}>
              <div className="form-group">
                <label>Route (Currently locked - reschedule changes time only)</label>
                <input 
                  type="text" 
                  value={`${flight.departure.code} → ${flight.arrival.code}`}
                  readOnly
                  className="readonly-input"
                  title="To change airports, create a new flight instead"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date *</label>
                  <input 
                    type="date" 
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Time *</label>
                  <input 
                    type="time" 
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Checking Weather...' : 'Reschedule Flight'}
              </button>
            </form>
          </div>
        )}

        {mode === 'ai' && (
          <div className="ai-suggestions">
            <button className="back-btn" onClick={() => setMode('choice')}>← Back</button>
            <h3>AI Weather Search Results</h3>
            
            {/* Progress indicator */}
            {loading && aiProgress && (
              <div className="ai-progress">
                <div className="spinner-small"></div>
                <p>{aiProgress}</p>
              </div>
            )}

            {/* AI Search Results Table */}
            {aiSearchResults && aiSearchResults.length > 0 && (
              <div className="ai-results-table-section">
                <p className="table-hint">Click any row to reschedule to that time</p>
                <div className="ai-results-table-container">
                  <table className="ai-results-table">
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>Safety</th>
                        <th>Issues</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...aiSearchResults]
                        .sort((a, b) => {
                          const order = { safe: 0, marginal: 1, dangerous: 2, error: 3 };
                          const aOrder = order[a.safety?.status as keyof typeof order] ?? 3;
                          const bOrder = order[b.safety?.status as keyof typeof order] ?? 3;
                          if (aOrder !== bOrder) return aOrder - bOrder;
                          return (b.safety?.score ?? 0) - (a.safety?.score ?? 0);
                        })
                        .map((result, idx) => (
                        <tr 
                          key={idx} 
                          className={`status-${result.safety?.status || 'error'} clickable-row`}
                          onClick={async () => {
                            // Use the weather data we already have from AI search!
                            if (!result.checkpoints || !result.safety) return;
                            
                            setLoading(true);
                            setError('');
                            try {
                              const newTime = result.scheduledTime;
                              const path = calculateFlightPath(flight.departure, flight.arrival, newTime);

                              if (result.safety.status === 'dangerous') {
                                const confirmed = window.confirm(
                                  '❌ DANGEROUS WEATHER DETECTED!\n\n' +
                                  `Safety Score: ${Math.round(result.safety.score)}/100\n\n` +
                                  'Weather conditions are unsafe for this flight.\n\n' +
                                  'Are you ABSOLUTELY SURE you want to schedule this flight?'
                                );
                                if (!confirmed) {
                                  setLoading(false);
                                  return;
                                }
                              } else if (result.safety.status === 'marginal') {
                                const confirmed = window.confirm(
                                  '⚠️ MARGINAL WEATHER CONDITIONS\n\n' +
                                  `Safety Score: ${Math.round(result.safety.score)}/100\n\n` +
                                  'Weather conditions are marginal. Extra caution is advised.\n\n' +
                                  'Do you want to continue with this flight time?'
                                );
                                if (!confirmed) {
                                  setLoading(false);
                                  return;
                                }
                              }

                              const newFlightData = {
                                userId: flight.userId,
                                departure: flight.departure,
                                arrival: flight.arrival,
                                scheduledTime: newTime,
                                studentName: flight.studentName,
                                trainingLevel: flight.trainingLevel,
                                path,
                                weatherData: result.checkpoints,
                                safetyStatus: result.safety.status,
                                status: 'scheduled' as const,
                              };

                              await onReschedule(flight.id, newFlightData);
                              onClose();
                            } catch (err: any) {
                              setError(err.message || 'Failed to reschedule flight');
                            } finally {
                              setLoading(false);
                            }
                          }}
                          title="Click to reschedule to this time"
                        >
                          <td className="time-cell">
                            <div className="date">{result.scheduledTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                            <div className="time">{result.scheduledTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>
                          <td className="safety-cell">
                            <div className="safety-badge">
                              <span className="badge-icon">
                                {result.safety?.status === 'safe' && '✅'}
                                {result.safety?.status === 'marginal' && '⚠️'}
                                {result.safety?.status === 'dangerous' && '❌'}
                                {!result.safety && '❓'}
                              </span>
                              <div className="badge-info">
                                <div className="badge-label">
                                  {result.safety?.status === 'safe' && 'Safe'}
                                  {result.safety?.status === 'marginal' && 'Marginal'}
                                  {result.safety?.status === 'dangerous' && 'Dangerous'}
                                  {!result.safety && 'Error'}
                                </div>
                                <div className="badge-score">
                                  {result.safety ? `${Math.round(result.safety.score)}%` : 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="issues-cell">
                            {result.topIssues.length > 0 ? (
                              <div className="issues-list">
                                {result.topIssues.slice(0, 2).map((issue, i) => (
                                  <div key={i} className="issue-item">{issue}</div>
                                ))}
                              </div>
                            ) : (
                              <span className="no-issues">✓ All Clear</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

