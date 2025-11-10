import React, { useState } from 'react';
import type { User, Flight, WeatherCheckpoint } from '../../types';
import { useFlights } from '../../hooks/useFlights';
import { calculations } from '../../utils/calculations';
import { weatherService } from '../../services/weatherService';
import { aiService } from '../../services/aiService';
import { AIRPORTS, airportToLocation } from '../../utils/airports';
import './FlightForm.css';

interface FlightFormProps {
  user: User;
  onClose: () => void;
  onPathPreview?: (checkpoints: WeatherCheckpoint[] | null) => void;
}

const TRAINING_LEVEL_NAMES: Record<string, string> = {
  'student-pilot': 'Student Pilot',
  'private-pilot': 'Private Pilot',
  'commercial-pilot': 'Commercial Pilot',
  'instrument-rated': 'Instrument Rated',
  'level-1': 'Student Pilot',
  'level-2': 'Private Pilot',
  'level-3': 'Commercial Pilot',
  'level-4': 'Instrument Rated',
};

export const FlightForm: React.FC<FlightFormProps> = ({ user, onClose, onPathPreview }) => {
  const { createFlight } = useFlights(user.uid);
  const [loading, setLoading] = useState(false);
  const [aiSearching, setAiSearching] = useState(false);
  const [aiProgress, setAiProgress] = useState('');
  const [error, setError] = useState('');
  const [weatherCheckpoints, setWeatherCheckpoints] = useState<WeatherCheckpoint[] | null>(null);
  const [weatherSummary, setWeatherSummary] = useState<{ status: string; score: number } | null>(null);
  const [weatherChecked, setWeatherChecked] = useState(false);
  const [flightData, setFlightData] = useState<Omit<Flight, 'id'> | null>(null);
  const [aiSearchResults, setAiSearchResults] = useState<Array<{
    scheduledTime: Date;
    safety: { status: string; score: number } | null;
    waypointCount: number;
    topIssues: string[];
    checkpoints: WeatherCheckpoint[] | null;
  }> | null>(null);
  // Set default date/time to today
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getTodayTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const [formData, setFormData] = useState({
    departureCode: 'ORD',
    arrivalCode: 'JFK',
    date: getTodayDate(),
    time: getTodayTime(),
  });

  // Step 1: Check weather conditions
  const handleCheckWeather = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setWeatherChecked(false);
    setWeatherCheckpoints(null);
    setWeatherSummary(null);

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

      // Store checkpoints for display
      setWeatherCheckpoints(checkpoints);

      // Determine overall safety
      const overallSafety = weatherService.getOverallSafety(checkpoints);
      setWeatherSummary(overallSafety);

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

      // Prepare flight object (but don't create yet)
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

      setFlightData(flight);
      setWeatherChecked(true);
      
      // Send path preview to parent component for map visualization
      if (onPathPreview) {
        onPathPreview(checkpoints);
      }
      
      console.log('Weather check completed!');
    } catch (err) {
      console.error('Error checking weather:', err);
      setError(err instanceof Error ? err.message : 'Failed to check weather');
      if (onPathPreview) {
        onPathPreview(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // AI-powered safe time finder
  const handleFindSafeTime = async () => {
    setError('');
    setAiSearching(true);
    setAiProgress('Initializing AI search...');
    setWeatherChecked(false);
    setWeatherCheckpoints(null);
    setWeatherSummary(null);

    try {
      // Validate airports
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
      
      // Start from tomorrow if no date selected
      const preferredStartDate = formData.date 
        ? new Date(`${formData.date}T06:00:00`) 
        : new Date(Date.now() + 24 * 60 * 60 * 1000);

      // AI finds safe time (checks all times in parallel for speed!)
      const result = await aiService.findSafeFlightTime(
        departure,
        arrival,
        user.trainingLevel,
        preferredStartDate,
        (message) => {
          setAiProgress(message);
        }
      );

      if (result.success && result.scheduledTime && result.checkpoints) {
        // Found safe time! Update form and show results
        const safeDate = result.scheduledTime;
        const dateStr = safeDate.toISOString().split('T')[0];
        const timeStr = safeDate.toTimeString().slice(0, 5);
        
        setFormData({
          ...formData,
          date: dateStr,
          time: timeStr,
        });

        setWeatherCheckpoints(result.checkpoints);
        const overallSafety = weatherService.getOverallSafety(result.checkpoints);
        setWeatherSummary(overallSafety);
        setWeatherChecked(true);

        // Prepare flight data
        const waypoints = calculations.generateWaypoints(departure, arrival, 50);
        const waypointsWithETA = calculations.calculateETAs(waypoints, safeDate, 120);
        const totalDistance = calculations.calculateDistance(
          departure.lat,
          departure.lon,
          arrival.lat,
          arrival.lon
        );
        const estimatedDuration =
          (waypointsWithETA[waypointsWithETA.length - 1].time.getTime() - safeDate.getTime()) /
          (60 * 1000);

        const flight: Omit<Flight, 'id'> = {
          userId: user.uid,
          departure,
          arrival,
          scheduledTime: safeDate,
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

        setFlightData(flight);
        
        // Send path preview to parent component
        if (onPathPreview) {
          onPathPreview(result.checkpoints);
        }

        // Store AI search results for table display
        if (result.allResults) {
          setAiSearchResults(result.allResults);
        }

        setAiProgress(`✅ ${result.reason} (Checked ${result.attempts} times)`);
      } else {
        setAiProgress('');
        setError(result.reason);
        
        // Store AI search results even if no safe time found
        if (result.allResults) {
          setAiSearchResults(result.allResults);
        }
      }

    } catch (err) {
      console.error('Error finding safe time:', err);
      setError(err instanceof Error ? err.message : 'Failed to find safe time');
      setAiProgress('');
    } finally {
      setAiSearching(false);
    }
  };

  // Step 2: Create the flight after reviewing weather
  const handleCreateFlight = async () => {
    if (!flightData) return;

    setLoading(true);
    setError('');

    try {
      await createFlight(flightData);
      console.log('Flight created successfully!');
      onClose();
    } catch (err) {
      console.error('Error creating flight:', err);
      setError(err instanceof Error ? err.message : 'Failed to create flight');
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

        <form onSubmit={handleCheckWeather} className="flight-form">
          {error && (
            <div className="flight-form-error">
              <span>⚠️</span>
              {error}
            </div>
          )}

          {/* Airport Selection - Side by Side */}
          <div className="airports-row">
            <div className="form-group airport-group">
              <label htmlFor="departure">Departure Airport</label>
              <select
                id="departure"
                value={formData.departureCode}
                onChange={(e) => setFormData({ ...formData, departureCode: e.target.value })}
                disabled={loading || weatherChecked}
                required
              >
                {Object.entries(AIRPORTS).map(([code, airport]) => (
                  <option key={code} value={code}>
                    {code} - {airport.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="airport-arrow">→</div>

            <div className="form-group airport-group">
              <label htmlFor="arrival">Arrival Airport</label>
              <select
                id="arrival"
                value={formData.arrivalCode}
                onChange={(e) => setFormData({ ...formData, arrivalCode: e.target.value })}
                disabled={loading || weatherChecked}
                required
              >
                {Object.entries(AIRPORTS).map(([code, airport]) => (
                  <option key={code} value={code}>
                    {code} - {airport.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Time - More Visible */}
          <div className="datetime-section">
            <label className="datetime-label">Flight Date & Time</label>
            <div className="datetime-row">
              <div className="form-group datetime-group">
                <label htmlFor="date">Date</label>
                <input 
                  id="date"
                  type="date" 
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  disabled={loading || weatherChecked}
                  required
                  className="datetime-input"
                />
              </div>

              <div className="form-group datetime-group">
                <label htmlFor="time">Time</label>
                <input 
                  id="time"
                  type="time" 
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  disabled={loading || weatherChecked}
                  required
                  className="datetime-input"
                />
              </div>
            </div>
          </div>

          <div className="form-info">
            <p>
              <strong>Pilot Certification:</strong> {TRAINING_LEVEL_NAMES[user.trainingLevel] || user.trainingLevel}
            </p>
            {!weatherChecked ? (
              <p className="form-hint">
                ✈️ Weather conditions will be checked along your entire flight path based on your certification level
              </p>
            ) : (
              <p className="form-hint">
                {weatherSummary?.status === 'safe' && '✅ Weather looks good! You can create this flight or try a different time.'}
                {weatherSummary?.status === 'marginal' && '⚠️ Weather is challenging but flyable. You can proceed with caution or try a different time.'}
                {weatherSummary?.status === 'dangerous' && '❌ Weather is too dangerous for your certification level. Please try a different time.'}
              </p>
            )}
          </div>

          {/* AI Find Safe Time Button */}
          {!weatherChecked && (
            <div className="ai-finder-section">
              <button
                type="button"
                onClick={handleFindSafeTime}
                disabled={loading || aiSearching}
                className="btn-primary"
              >
                {aiSearching ? '🔍 Searching...' : '🤖 AI: Find Safe Time For Me'}
              </button>
              <p className="ai-finder-hint">
                Let AI automatically find the best safe flying time in the next 5 days
              </p>
            </div>
          )}

          {/* AI Search Progress */}
          {aiSearching && aiProgress && (
            <div className="ai-progress">
              <div className="spinner-small"></div>
              <p>{aiProgress}</p>
            </div>
          )}

          {/* AI Search Results Table */}
          {aiSearchResults && aiSearchResults.length > 0 && (
            <div className="ai-results-table-section">
              <details open>
                <summary>📊 AI Search Report: View All {aiSearchResults.length} Time Slots Checked (Click to Select)</summary>
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
                          // Sort: Safe first, then Marginal, then Dangerous
                          const order = { safe: 0, marginal: 1, dangerous: 2, error: 3 };
                          const aOrder = order[a.safety?.status as keyof typeof order] ?? 3;
                          const bOrder = order[b.safety?.status as keyof typeof order] ?? 3;
                          if (aOrder !== bOrder) return aOrder - bOrder;
                          // If same status, sort by score (highest first)
                          return (b.safety?.score ?? 0) - (a.safety?.score ?? 0);
                        })
                        .map((result, idx) => (
                        <tr 
                          key={idx} 
                          className={`status-${result.safety?.status || 'error'} clickable-row`}
                          onClick={() => {
                            // Set the form to this time slot
                            const selectedDate = result.scheduledTime;
                            const dateStr = selectedDate.toISOString().split('T')[0];
                            const timeStr = selectedDate.toTimeString().slice(0, 5);
                            
                            setFormData({
                              ...formData,
                              date: dateStr,
                              time: timeStr
                            });
                            
                            // Use the weather data we already have from AI search!
                            if (result.checkpoints && result.safety) {
                              const departureAirport = AIRPORTS[formData.departureCode];
                              const arrivalAirport = AIRPORTS[formData.arrivalCode];
                              const departure = airportToLocation(departureAirport);
                              const arrival = airportToLocation(arrivalAirport);
                              
                              const waypoints = calculations.generateWaypoints(departure, arrival, 50);
                              const waypointsWithETA = calculations.calculateETAs(waypoints, selectedDate, 120);
                              
                              // Use already-checked weather data
                              setWeatherCheckpoints(result.checkpoints);
                              setWeatherSummary(result.safety);
                              
                              const totalDistance = calculations.calculateDistance(
                                departure.lat, departure.lon, arrival.lat, arrival.lon
                              );
                              const estimatedDuration = (waypointsWithETA[waypointsWithETA.length - 1].time.getTime() - selectedDate.getTime()) / (60 * 1000);
                              
                              const flight: Omit<Flight, 'id'> = {
                                userId: user.uid,
                                departure,
                                arrival,
                                scheduledTime: selectedDate,
                                studentName: user.displayName,
                                trainingLevel: user.trainingLevel,
                                path: { waypoints: waypointsWithETA, totalDistance, estimatedDuration },
                                safetyStatus: result.safety.status as 'safe' | 'marginal' | 'dangerous',
                                status: 'scheduled',
                                createdAt: new Date(),
                                updatedAt: new Date(),
                              };
                              
                              setFlightData(flight);
                              setWeatherChecked(true);
                              
                              if (onPathPreview) {
                                onPathPreview(result.checkpoints);
                              }
                            }
                            
                            // Scroll to create flight button
                            setTimeout(() => {
                              const createButton = document.querySelector('.btn-success');
                              if (createButton) {
                                createButton.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                              }
                            }, 100);
                          }}
                          title="Click to select and check this time"
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
              </details>
            </div>
          )}

          {/* Weather Summary Display */}
          {weatherSummary && weatherCheckpoints && (
            <div className={`weather-summary ${weatherSummary.status}`}>
              <div className="weather-summary-header">
                <strong>
                  {weatherSummary.status === 'safe' && '✅ Weather Conditions: SAFE'}
                  {weatherSummary.status === 'marginal' && '⚠️ Weather Conditions: MARGINAL'}
                  {weatherSummary.status === 'dangerous' && '❌ Weather Conditions: DANGEROUS'}
                </strong>
                <span className="weather-score">Safety Score: {Math.round(weatherSummary.score)}/100</span>
              </div>
              
              {weatherSummary.status === 'marginal' && (
                <div className="weather-warning">
                  <p>⚠️ Some waypoints have challenging weather conditions. Flight is possible but caution advised.</p>
                  <details>
                    <summary>View Weather Details ({weatherCheckpoints.length} checkpoints)</summary>
                    <div className="weather-checkpoints">
                      {weatherCheckpoints.filter(c => c.safetyStatus !== 'safe').map((checkpoint, idx) => (
                        <div key={idx} className={`checkpoint-item ${checkpoint.safetyStatus}`}>
                          <span className="checkpoint-status">
                            {checkpoint.safetyStatus === 'safe' ? '✓' : checkpoint.safetyStatus === 'marginal' ? '⚠' : '✗'}
                          </span>
                          <div className="checkpoint-info">
                            <div><strong>Lat/Lon:</strong> {checkpoint.location.lat.toFixed(2)}°, {checkpoint.location.lon.toFixed(2)}°</div>
                            <div><strong>Time:</strong> {checkpoint.time.toLocaleTimeString()}</div>
                            <div><strong>Condition:</strong> {checkpoint.weather.description}</div>
                            {checkpoint.reason && <div className="checkpoint-reason">{checkpoint.reason}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
              
              {weatherSummary.status === 'safe' && (
                <p className="weather-success">
                  ✅ All {weatherCheckpoints.length} waypoints have safe weather conditions for your certification level!
                </p>
              )}

              {weatherSummary.status === 'dangerous' && (
                <div className="danger-report">
                  <p className="danger-report-title">🚨 DANGER REPORT - Why This Flight Is Unsafe:</p>
                  <details open>
                    <summary>View All Dangerous Waypoints ({weatherCheckpoints.filter(c => c.safetyStatus === 'dangerous').length} of {weatherCheckpoints.length})</summary>
                    <div className="danger-checkpoints">
                      {weatherCheckpoints.filter(c => c.safetyStatus === 'dangerous').map((checkpoint, idx) => (
                        <div key={idx} className="danger-checkpoint-item">
                          <div className="danger-checkpoint-header">
                            <span className="danger-icon">❌</span>
                            <strong>Waypoint #{weatherCheckpoints.indexOf(checkpoint) + 1}</strong>
                          </div>
                          <div className="danger-checkpoint-details">
                            <div><strong>Location:</strong> {checkpoint.location.lat.toFixed(4)}°N, {Math.abs(checkpoint.location.lon).toFixed(4)}°W</div>
                            <div><strong>ETA:</strong> {checkpoint.time.toLocaleTimeString()} on {checkpoint.time.toLocaleDateString()}</div>
                            <div><strong>Weather:</strong> {checkpoint.weather.description}</div>
                            <div className="danger-conditions">
                              <strong>🔴 Critical Issues:</strong>
                              <ul>
                                <li>{checkpoint.reason}</li>
                                {checkpoint.weather.visibility < 5 && (
                                  <li>Visibility: {checkpoint.weather.visibility.toFixed(1)} mi (BELOW minimum 5 mi)</li>
                                )}
                                {checkpoint.weather.ceiling < 3000 && (
                                  <li>Cloud Ceiling: {checkpoint.weather.ceiling} ft (BELOW minimum 3000 ft)</li>
                                )}
                                {checkpoint.weather.windSpeed > 10 && (
                                  <li>Wind Speed: {checkpoint.weather.windSpeed.toFixed(0)} kt (ABOVE maximum 10 kt)</li>
                                )}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                  
                  <div className="danger-summary">
                    <p><strong>Summary:</strong> {weatherCheckpoints.filter(c => c.safetyStatus === 'dangerous').length} out of {weatherCheckpoints.length} waypoints have dangerous conditions for Student Pilot certification.</p>
                    <p><strong>Recommendation:</strong> DO NOT FLY. Choose a different time or route.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Selected Flight Summary - Shows when flight is selected from AI search */}
          {flightData && weatherChecked && (
            <div className="selected-flight-summary">
              <div className="selected-flight-header">
                <h3>✈️ Selected Flight</h3>
                <span className={`selected-flight-status status-${weatherSummary?.status || 'unknown'}`}>
                  {weatherSummary?.status === 'safe' && '✅ Safe'}
                  {weatherSummary?.status === 'marginal' && '⚠️ Marginal'}
                  {weatherSummary?.status === 'dangerous' && '❌ Dangerous'}
                </span>
              </div>
              <div className="selected-flight-details">
                <div className="selected-flight-route">
                  <strong>{formData.departureCode}</strong>
                  <span className="arrow">→</span>
                  <strong>{formData.arrivalCode}</strong>
                </div>
                <div className="selected-flight-time">
                  <span className="date-icon">📅</span>
                  {new Date(flightData.scheduledTime).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                  <span className="time-icon">🕐</span>
                  {new Date(flightData.scheduledTime).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
                {weatherSummary && (
                  <div className="selected-flight-safety">
                    Safety Score: <strong>{Math.round(weatherSummary.score)}/100</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="button" onClick={onClose} disabled={loading} className="btn-secondary">
              Cancel
            </button>
            
            {!weatherChecked ? (
              <button type="submit" disabled={loading} className="btn-weather-check">
                {loading ? 'Checking Weather...' : '🌤️ Check Weather'}
              </button>
            ) : (
              <>
                <button 
                  type="button" 
                  onClick={() => {
                    setWeatherChecked(false);
                    setWeatherCheckpoints(null);
                    setWeatherSummary(null);
                    setFlightData(null);
                    setError('');
                  }}
                  disabled={loading} 
                  className="btn-secondary"
                >
                  🔄 Try Different Time
                </button>
                
                {weatherSummary && weatherSummary.status !== 'dangerous' && (
                  <button 
                    type="button" 
                    onClick={handleCreateFlight} 
                    disabled={loading} 
                    className="btn-success"
                  >
                    {loading ? 'Creating Flight...' : '✈️ Create Flight'}
                  </button>
                )}
              </>
            )}
          </div>

          {loading && (
            <div className="loading-indicator">
              <div className="spinner-small"></div>
              <p>{weatherChecked ? 'Creating flight...' : 'Checking weather conditions...'}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

