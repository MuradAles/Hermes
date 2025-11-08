import React, { useEffect, useMemo, useRef } from 'react';
import { Entity } from 'resium';
import { 
  SampledPositionProperty, 
  JulianDate, 
  Cartesian3, 
  VelocityOrientationProperty,
  Color,
  TimeIntervalCollection,
  TimeInterval,
  NearFarScalar
} from 'cesium';
import type { Flight } from '../../types';

interface AnimatedFlightProps {
  flight: Flight;
  viewer: any;
  isPlaying: boolean;
}

// Calculate altitude at a given point in the flight (matches FlightPathEntity)
const calculateAltitude = (
  progress: number, // 0 to 1 representing progress through flight
  cruiseAltitude: number = 40000, // feet - high cruise altitude
  groundLevel: number = 500 // feet - airport ground level
): number => {
  // Create parabolic arc: starts at ground, peaks at middle, ends at ground
  // First 20% is takeoff/climb, middle 60% is cruise, last 20% is descent/landing
  
  if (progress < 0.2) {
    // TAKEOFF & CLIMB: ground level -> cruise altitude
    const climbProgress = progress / 0.2; // 0 to 1 during climb
    return groundLevel + (climbProgress * (cruiseAltitude - groundLevel));
  } else if (progress > 0.8) {
    // DESCENT & LANDING: cruise altitude -> ground level
    const descentProgress = (progress - 0.8) / 0.2; // 0 to 1 during descent
    return cruiseAltitude - (descentProgress * (cruiseAltitude - groundLevel));
  } else {
    // CRUISE: maintain high altitude
    return cruiseAltitude;
  }
};

export const AnimatedFlight: React.FC<AnimatedFlightProps> = React.memo(({ flight, viewer, isPlaying }) => {
  const cruiseAltitude = 40000; // feet - high cruise altitude for visibility
  const groundLevel = 500; // feet - airport ground level (near zero)
  const clockInitializedRef = useRef(false); // Track if clock has been initialized
  
  // Create position property with samples - memoized to avoid recreating on every render
  const positionProperty = useMemo(() => {
    const prop = new SampledPositionProperty();
    
    const waypoints = flight.path.waypoints;
    const numWaypoints = waypoints.length;
    
    // Create position samples with altitude matching the flight path display
    waypoints.forEach((waypoint, index) => {
      // Calculate progress through the flight (0 = start, 1 = end)
      const progress = index / (numWaypoints - 1);
      
      // Calculate altitude using same formula as FlightPathEntity
      const altitude = calculateAltitude(progress, cruiseAltitude, groundLevel);
      const altitudeMeters = altitude * 0.3048; // Convert feet to meters
      
      // Time for this waypoint (assuming 450 knots average speed for faster animation)
      const distancePercentage = progress;
      const totalDistance = flight.path.totalDistance;
      const timeSeconds = (distancePercentage * totalDistance / 450) * 3600; // NM / knots * 3600 sec/hr
      const time = JulianDate.addSeconds(
        JulianDate.fromDate(new Date()), 
        timeSeconds, 
        new JulianDate()
      );
      
      const position = Cartesian3.fromDegrees(
        waypoint.lon, 
        waypoint.lat, 
        altitudeMeters
      );
      prop.addSample(time, position);
    });
    
    return prop;
  }, [flight.path.waypoints, flight.path.totalDistance]);

  // Initialize clock only once per flight
  useEffect(() => {
    if (!viewer || clockInitializedRef.current) return;
    
    const totalDistance = flight.path.totalDistance;
    const totalDurationSeconds = (totalDistance / 450) * 3600; // Match speed from position calculation
    const startTime = JulianDate.fromDate(new Date());
    const stopTime = JulianDate.addSeconds(startTime, totalDurationSeconds, new JulianDate());
    
    // Initialize clock times once
    viewer.clock.startTime = startTime.clone();
    viewer.clock.stopTime = stopTime.clone();
    viewer.clock.currentTime = startTime.clone();
    viewer.clock.clockRange = 2; // LOOP_STOP - stop at end
    viewer.clock.multiplier = 1; // Default speed
    viewer.clock.shouldAnimate = false; // Start paused
    
    clockInitializedRef.current = true;
    
    // Reset initialization flag when flight changes
    return () => {
      clockInitializedRef.current = false;
    };
  }, [viewer, flight.id, flight.path.totalDistance]);

  // Control animation based on play state (separate effect)
  useEffect(() => {
    if (!viewer || !clockInitializedRef.current) return;
    
    if (isPlaying) {
      viewer.clock.shouldAnimate = true;
    } else {
      viewer.clock.shouldAnimate = false;
    }
  }, [viewer, isPlaying]);

  // ALWAYS render the entity - keep it visible when paused!
  return (
    <Entity
      id="animated-plane"
      position={positionProperty}
      orientation={new VelocityOrientationProperty(positionProperty)}
      box={{
        dimensions: new Cartesian3(5000, 5000, 2500), // Larger: 5km x 5km x 2.5km for visibility
        material: Color.fromCssColorString('#60a5fa'),
        outline: true,
        outlineColor: Color.WHITE,
        outlineWidth: 4,
        // Scale based on distance from camera - stays visible at all zoom levels
        scaleByDistance: new NearFarScalar(10000, 2.0, 5000000, 0.5)
      }}
      path={{
        resolution: 1,
        material: Color.fromCssColorString('#60a5fa').withAlpha(0.8),
        width: 8,
        leadTime: 0,
        trailTime: isPlaying ? 1200 : 0 // Only show trail when playing
      }}
    />
  );
}, (prevProps, nextProps) => {
  // Only re-render if playing state or flight changes
  return prevProps.isPlaying === nextProps.isPlaying &&
         prevProps.flight.id === nextProps.flight.id &&
         prevProps.viewer === nextProps.viewer;
});

