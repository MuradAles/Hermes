import React, { useEffect, useMemo, useRef } from 'react';
import { Entity } from 'resium';
import { 
  SampledPositionProperty, 
  JulianDate, 
  Cartesian3, 
  VelocityOrientationProperty,
  Color,
  NearFarScalar
} from 'cesium';
import type { Flight } from '../../types';

interface AnimatedFlightProps {
  flight: Flight;
  viewer: any;
  isPlaying: boolean;
  modelUri: string;
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

export const AnimatedFlight: React.FC<AnimatedFlightProps> = React.memo(({ flight, viewer, isPlaying, modelUri }) => {
  const cruiseAltitude = 40000; // feet - high cruise altitude for visibility
  const groundLevel = 500; // feet - airport ground level (near zero)
  const clockInitializedRef = useRef(false); // Track if clock has been initialized
  
  // Create stable entity ID based only on flight (not model) so model changes don't recreate entity
  const entityId = useMemo(() => `animated-plane-${flight.id}`, [flight.id]);
  
  // Update model URI dynamically without recreating the entity
  useEffect(() => {
    if (!viewer) return;
    
    const entity = viewer.entities.getById(entityId);
    if (entity && entity.model) {
      // Update the model URI in place
      entity.model.uri = modelUri;
    }
  }, [viewer, entityId, modelUri]);
  
  // Cleanup entity on unmount or when flight changes (not model)
  useEffect(() => {
    if (!viewer) return;
    
    return () => {
      // Cleanup: remove entity if it exists
      // This handles React StrictMode double-invocation and component remounting
      const entity = viewer.entities.getById(entityId);
      if (entity) {
        viewer.entities.remove(entity);
      }
    };
  }, [viewer, entityId]);
  
  // Create position property with samples - memoized to avoid recreating on every render
  const positionProperty = useMemo(() => {
    // SampledPositionProperty automatically interpolates between samples
    // Creating more samples ensures smooth movement
    const prop = new SampledPositionProperty();
    
    const waypoints = flight.path.waypoints;
    const numWaypoints = waypoints.length;
    
    // Create more samples for smoother animation
    // Interpolate between waypoints to create additional samples
    // Reduced from 10 to 5 for better performance while maintaining smoothness
    const samplesPerSegment = 5; // Create 5 samples between each waypoint pair
    
    for (let i = 0; i < numWaypoints - 1; i++) {
      const currentWaypoint = waypoints[i];
      const nextWaypoint = waypoints[i + 1];
      
      // Create samples between current and next waypoint
      for (let j = 0; j <= samplesPerSegment; j++) {
        const segmentProgress = j / samplesPerSegment;
        
        // Interpolate position between waypoints
        const lon = currentWaypoint.lon + (nextWaypoint.lon - currentWaypoint.lon) * segmentProgress;
        const lat = currentWaypoint.lat + (nextWaypoint.lat - currentWaypoint.lat) * segmentProgress;
        
        // Calculate overall progress through the flight (0 = start, 1 = end)
        const overallProgress = (i + segmentProgress) / (numWaypoints - 1);
        
        // Calculate altitude using same formula as FlightPathEntity, but add small offset to fly above the line
        const altitude = calculateAltitude(overallProgress, cruiseAltitude, groundLevel);
        const altitudeOffsetFeet = 300; // Fly 150 feet above the path line
        const altitudeMeters = (altitude + altitudeOffsetFeet) * 0.3048; // Convert feet to meters
        
        // Time for this sample - use the actual estimatedDuration from flight path (120 knots)
        // estimatedDuration is in minutes, convert to seconds and apply progress
        const totalDurationSeconds = flight.path.estimatedDuration * 60; // Convert minutes to seconds
        const timeSeconds = overallProgress * totalDurationSeconds;
        const time = JulianDate.addSeconds(
          JulianDate.fromDate(new Date()), 
          timeSeconds, 
          new JulianDate()
        );
        
        const position = Cartesian3.fromDegrees(lon, lat, altitudeMeters);
        prop.addSample(time, position);
      }
    }
    
    return prop;
  }, [flight.path.waypoints, flight.path.estimatedDuration]);

  // Initialize clock only once per flight
  useEffect(() => {
    if (!viewer || clockInitializedRef.current) return;
    
    // Use the actual estimatedDuration from flight path (matches schedule display)
    // estimatedDuration is in minutes, convert to seconds
    const totalDurationSeconds = flight.path.estimatedDuration * 60;
    const startTime = JulianDate.fromDate(new Date());
    const stopTime = JulianDate.addSeconds(startTime, totalDurationSeconds, new JulianDate());
    
    // Initialize clock times once
    viewer.clock.startTime = startTime.clone();
    viewer.clock.stopTime = stopTime.clone();
    viewer.clock.currentTime = startTime.clone();
    viewer.clock.clockRange = 1; // CLAMPED - stop at end without looping
    viewer.clock.multiplier = 1; // Default speed
    viewer.clock.shouldAnimate = false; // Start paused
    
    clockInitializedRef.current = true;
    
    // Reset initialization flag when flight changes
    return () => {
      clockInitializedRef.current = false;
    };
  }, [viewer, flight.id, flight.path.estimatedDuration]);

  // Control animation based on play state (separate effect)
  useEffect(() => {
    if (!viewer || !clockInitializedRef.current) return;
    
    if (isPlaying) {
      viewer.clock.shouldAnimate = true;
    } else {
      viewer.clock.shouldAnimate = false;
    }
  }, [viewer, isPlaying]);

  // Create highlight position property that follows the path (without the plane's altitude offset)
  const highlightPositionProperty = useMemo(() => {
    const prop = new SampledPositionProperty();
    
    const waypoints = flight.path.waypoints;
    const numWaypoints = waypoints.length;
    const samplesPerSegment = 5; // Reduced for performance
    
    for (let i = 0; i < numWaypoints - 1; i++) {
      const currentWaypoint = waypoints[i];
      const nextWaypoint = waypoints[i + 1];
      
      for (let j = 0; j <= samplesPerSegment; j++) {
        const segmentProgress = j / samplesPerSegment;
        const lon = currentWaypoint.lon + (nextWaypoint.lon - currentWaypoint.lon) * segmentProgress;
        const lat = currentWaypoint.lat + (nextWaypoint.lat - currentWaypoint.lat) * segmentProgress;
        const overallProgress = (i + segmentProgress) / (numWaypoints - 1);
        
        // Calculate altitude using same formula as FlightPathEntity (path altitude, with additional offset below)
        const altitude = calculateAltitude(overallProgress, cruiseAltitude, groundLevel);
        const additionalOffsetFeet = 25; // Additional 200 feet below the path line
        const altitudeMeters = (altitude - additionalOffsetFeet) * 0.3048; // Convert feet to meters, subtract offset
        
        // Use the actual estimatedDuration from flight path (matches schedule display)
        const totalDurationSeconds = flight.path.estimatedDuration * 60; // Convert minutes to seconds
        const timeSeconds = overallProgress * totalDurationSeconds;
        const time = JulianDate.addSeconds(
          JulianDate.fromDate(new Date()), 
          timeSeconds, 
          new JulianDate()
        );
        
        const position = Cartesian3.fromDegrees(lon, lat, altitudeMeters);
        prop.addSample(time, position);
      }
    }
    
    return prop;
  }, [flight.path.waypoints, flight.path.estimatedDuration, cruiseAltitude, groundLevel]);

  // ALWAYS render the entity - keep it visible when paused!
  return (
    <>
      {/* Highlight point that follows the flight path (below the plane) */}
      <Entity
        id={`${entityId}-highlight`}
        position={highlightPositionProperty}
        point={{
          pixelSize: 12,
          color: Color.fromCssColorString('#60a5fa'),
          outlineColor: Color.WHITE,
          outlineWidth: 3,
          disableDepthTestDistance: Number.POSITIVE_INFINITY, // Always visible
          scaleByDistance: new NearFarScalar(1000, 1.5, 500000, 0.3), // Scale based on distance
        }}
      />
      {/* The plane model */}
      <Entity
        id={entityId}
        position={positionProperty}
        orientation={new VelocityOrientationProperty(positionProperty)}
        model={{
          uri: modelUri, // Dynamic model URI from selector
          minimumPixelSize: 128, // Minimum size in pixels (ensures visibility when zoomed out)
          maximumScale: 20000, // Maximum scale factor
          scale: 2000.0 // Scale multiplier
        }}
        // Removed path property - the static flight path line is handled by FlightPathEntity
        // This prevents a moving trail that follows the plane
      />
    </>
  );
}, (prevProps, nextProps) => {
  // Only re-render if playing state, flight, or model changes
  return prevProps.isPlaying === nextProps.isPlaying &&
         prevProps.flight.id === nextProps.flight.id &&
         prevProps.viewer === nextProps.viewer &&
         prevProps.modelUri === nextProps.modelUri;
});

