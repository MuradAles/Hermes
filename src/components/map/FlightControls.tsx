import React, { useEffect, useState } from 'react';
import { JulianDate } from 'cesium';
import './FlightControls.css';

interface FlightControlsProps {
  viewer: any;
  isPlaying: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  followPlane: boolean;
  onFollowPlane: () => void;
}

export const FlightControls: React.FC<FlightControlsProps> = ({
  viewer,
  isPlaying,
  onPlayPause,
  onStop,
  speed,
  onSpeedChange,
  followPlane,
  onFollowPlane
}) => {
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('00:00');
  const [totalTime, setTotalTime] = useState('00:00');

  // Update progress bar and time display
  useEffect(() => {
    if (!viewer) return;

    const interval = setInterval(() => {
      const clock = viewer.clock;
      if (!clock.startTime || !clock.stopTime) return;

      const total = JulianDate.secondsDifference(clock.stopTime, clock.startTime);
      const elapsed = JulianDate.secondsDifference(clock.currentTime, clock.startTime);
      
      const progressPercent = Math.max(0, Math.min(100, (elapsed / total) * 100));
      setProgress(progressPercent);

      // Format times
      setCurrentTime(formatTime(elapsed));
      setTotalTime(formatTime(total));
    }, 100);

    return () => clearInterval(interval);
  }, [viewer]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.floor(Math.abs(seconds) % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!viewer) return;
    
    const percent = parseFloat(e.target.value);
    const clock = viewer.clock;
    
    if (!clock.startTime || !clock.stopTime) return;
    
    const total = JulianDate.secondsDifference(clock.stopTime, clock.startTime);
    const targetSeconds = (percent / 100) * total;
    
    clock.currentTime = JulianDate.addSeconds(
      clock.startTime,
      targetSeconds,
      new JulianDate()
    );
    
    setProgress(percent);
  };

  const speedOptions = [0.25, 0.5, 1, 2, 5, 10, 20];

  return (
    <div className="flight-controls">
      {/* Timeline Scrubber */}
      <div className="timeline-container">
        <span className="time-display">{currentTime}</span>
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progress}
          onChange={handleSeek}
          className="timeline-scrubber"
        />
        <span className="time-display">{totalTime}</span>
      </div>

      {/* Control Buttons */}
      <div className="controls-container">
        {/* Play/Pause Button */}
        <button 
          className="control-btn play-pause-btn"
          onClick={onPlayPause}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Stop Button */}
        <button 
          className="control-btn stop-btn"
          onClick={onStop}
          title="Stop"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" />
          </svg>
        </button>

        {/* Follow Plane Button */}
        <button 
          className={`control-btn follow-btn ${followPlane ? 'active' : ''}`}
          onClick={onFollowPlane}
          title={followPlane ? 'Stop Following' : 'Follow Plane'}
          disabled={!isPlaying}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h4l3-9 4 18 3-9h4" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
          </svg>
        </button>

        {/* Speed Control */}
        <div className="speed-control">
          <span className="speed-label">Speed:</span>
          <div className="speed-buttons">
            {speedOptions.map(option => (
              <button
                key={option}
                className={`speed-btn ${speed === option ? 'active' : ''}`}
                onClick={() => onSpeedChange(option)}
                title={`${option}x speed`}
              >
                {option}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

