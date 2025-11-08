import React, { useEffect, useState } from 'react';
import { Cartesian3, JulianDate } from 'cesium';
import './AltitudeIndicator.css';

interface AltitudeIndicatorProps {
  viewer: any;
  isPlaying: boolean;
  entityId: string;
}

export const AltitudeIndicator: React.FC<AltitudeIndicatorProps> = ({ viewer, isPlaying, entityId }) => {
  const [altitude, setAltitude] = useState(0);
  const [speed, setSpeed] = useState(0);

  useEffect(() => {
    if (!viewer) return;

    let lastPosition: any = null;
    let lastTime: any = null;

    const interval = setInterval(() => {
      const entity = viewer.entities.getById(entityId);
      if (entity && entity.position) {
        try {
          const currentTime = viewer.clock.currentTime;
          const position = entity.position.getValue(currentTime);
          
          if (position) {
            // Calculate altitude
            const cartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(position);
            const altitudeMeters = cartographic.height;
            const altitudeFeet = Math.max(0, Math.round(altitudeMeters / 0.3048)); // Never go negative
            setAltitude(altitudeFeet);
            
            // Calculate actual speed from position change
            if (lastPosition && lastTime && isPlaying) {
              const timeDiff = JulianDate.secondsDifference(currentTime, lastTime);
              if (timeDiff > 0) {
                const distance = Cartesian3.distance(lastPosition, position);
                const metersPerSecond = distance / timeDiff;
                const knots = Math.round(metersPerSecond * 1.94384); // Convert m/s to knots
                setSpeed(Math.max(0, knots)); // Never negative
              }
            } else if (!isPlaying) {
              // When paused, keep last speed or show 0
              setSpeed(0);
            }
            
            lastPosition = position.clone();
            lastTime = currentTime.clone();
          }
        } catch (error) {
          // Entity might not be ready yet, ignore errors
          console.debug('AltitudeIndicator: Entity not ready yet', error);
        }
      } else if (!isPlaying) {
        // Reset when not playing and entity doesn't exist
        setAltitude(0);
        setSpeed(0);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [viewer, isPlaying, entityId]);

  // Only show when playing and entity exists
  if (!isPlaying) return null;

  return (
    <div className="altitude-indicator">
      <div className="indicator-item">
        <div className="indicator-label">Altitude</div>
        <div className="indicator-value">{altitude.toLocaleString()} ft</div>
      </div>
      <div className="indicator-item">
        <div className="indicator-label">Speed</div>
        <div className="indicator-value">{speed} kts</div>
      </div>
    </div>
  );
};

