import React, { useEffect, useRef, useState } from 'react';
import { Viewer, Entity } from 'resium';
import { 
  Cartesian3, 
  Color, 
  Cesium3DTileset, 
  ShadowMode,
  Matrix4,
  Math as CesiumMath,
  Ion,
  ArcType,
  PolylineDashMaterialProperty,
  Cartographic
} from 'cesium';
import { useFlights } from '../../hooks/useFlights';
import { useAuth } from '../../hooks/useAuth';
import { AnimatedFlight } from './AnimatedFlight';
import { AltitudeIndicator } from './AltitudeIndicator';
import { AirportMarkers } from './AirportMarkers';
import { FlightControls } from './FlightControls';
import type { Flight } from '../../types';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './CesiumMap.css';

interface CesiumMapProps {
  selectedFlightId: string | null;
}

export const CesiumMap: React.FC<CesiumMapProps> = ({ selectedFlightId }) => {
  const { user } = useAuth();
  const { flights } = useFlights(user?.uid || '');
  const viewerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [followPlane, setFollowPlane] = useState(false);
  const [initialCameraSet, setInitialCameraSet] = useState(false);
  
  const selectedFlight = flights.find(f => f.id === selectedFlightId);

  // Set Cesium Ion access token
  useEffect(() => {
    const token = import.meta.env.VITE_CESIUM_ION_TOKEN || '';
    
    if (token) {
      Ion.defaultAccessToken = token;
      console.log('✅ Cesium Ion token set');
    } else {
      console.warn('⚠️ No Cesium Ion token found');
    }
  }, []);

  // Load asset 2275207 when viewer is ready
  useEffect(() => {
    // Check periodically until viewer is ready
    const checkViewer = setInterval(() => {
      if (!viewerRef.current) return;
      
      const viewer = viewerRef.current.cesiumElement;
      if (!viewer) return;

      // Viewer is ready!
      clearInterval(checkViewer);
      
      // Small delay to ensure viewer is fully initialized
      setTimeout(async () => {
        try {
          console.log('📦 Loading asset 2275207...');
          const tileset = viewer.scene.primitives.add(
            await Cesium3DTileset.fromIonAssetId(2275207)
          );
          
          tileset.shadows = ShadowMode.ENABLED;
          console.log('✅ Asset 2275207 added to scene!');
          
          // Check if readyPromise exists before using it
          if (tileset.readyPromise) {
            tileset.readyPromise.then(() => {
              console.log('🏙️ Tileset ready!');
            }).catch((err: any) => {
              console.error('❌ Tileset ready promise failed:', err);
            });
          } else {
            console.log('🏙️ Tileset added (readyPromise not available)');
          }
        } catch (error) {
          console.error('❌ Failed to load asset:', error);
        }
      }, 500);
    }, 100); // Check every 100ms

    return () => clearInterval(checkViewer);
  }, []);

  // Initial camera setup when flight is first selected
  useEffect(() => {
    if (selectedFlightId && viewerRef.current && !initialCameraSet) {
      const flight = flights.find(f => f.id === selectedFlightId);
      if (flight) {
        const viewer = viewerRef.current.cesiumElement;
        
        // Calculate midpoint between departure and arrival
        const midLon = (flight.departure.lon + flight.arrival.lon) / 2;
        const midLat = (flight.departure.lat + flight.arrival.lat) / 2;
        
        // Calculate distance to determine view height
        const distance = Math.sqrt(
          Math.pow(flight.arrival.lon - flight.departure.lon, 2) +
          Math.pow(flight.arrival.lat - flight.departure.lat, 2)
        ) * 111000; // Rough conversion to meters
        
        const viewHeight = Math.max(distance * 2, 800000); // Higher view for better flight path visibility
        
        viewer.camera.flyTo({
          destination: Cartesian3.fromDegrees(
            midLon,
            midLat,
            viewHeight
          ),
          duration: 2,
          // Camera always looks straight down at Earth's center (top-down view)
          orientation: {
            heading: 0,
            pitch: CesiumMath.toRadians(-90), // -90° = straight down at Earth's core
            roll: 0
          }
        });
        
        setInitialCameraSet(true);
      }
    }
    
    // Reset when flight changes
    if (selectedFlightId) {
      setInitialCameraSet(false);
    }
  }, [selectedFlightId, flights, initialCameraSet]);

  // Follow plane with smooth tracking and full camera control
  useEffect(() => {
    if (!followPlane || !viewerRef.current || !isPlaying) {
      return;
    }
    
    const viewer = viewerRef.current.cesiumElement;
    if (!viewer || !viewer.entities) return;
    
    const entity = viewer.entities.getById('animated-plane');
    if (!entity) return;
    
    // Make sure camera is in free mode (not locked to any transform)
    viewer.camera.lookAtTransform(Matrix4.IDENTITY);
    
    const planePosition = entity.position?.getValue(viewer.clock.currentTime);
    if (!planePosition) return;
    
    let animationFrameId: number;
    let isUserInteracting = false;
    let interactionTimeout: number | undefined;
    let isFollowingActive = false;
    
    // Detect when user starts interacting with camera
    const handleMoveStart = () => {
      isUserInteracting = true;
      if (interactionTimeout) {
        clearTimeout(interactionTimeout);
      }
    };
    
    // Detect when user stops interacting
    const handleMoveEnd = () => {
      interactionTimeout = window.setTimeout(() => {
        isUserInteracting = false;
      }, 150); // Short delay
    };
    
    // Listen for camera movement
    viewer.camera.moveStart.addEventListener(handleMoveStart);
    viewer.camera.moveEnd.addEventListener(handleMoveEnd);
    
    const startFollowing = () => {
      isFollowingActive = true;
      let lastPlanePosition: Cartesian3 | null = null;
      let isInitialized = false;
      
      const followAnimation = () => {
        if (!isFollowingActive || !followPlane || !isPlaying) return;
        
        const currentPlanePosition = entity.position?.getValue(viewer.clock.currentTime);
        
        if (currentPlanePosition) {
          // First frame: Set up top-down view
          if (!isInitialized) {
            lastPlanePosition = currentPlanePosition.clone();
            
            // Get plane's cartographic position
            const ellipsoid = viewer.scene.globe.ellipsoid;
            const planeCartographic = ellipsoid.cartesianToCartographic(currentPlanePosition);
            
            // Position camera directly above the plane
            const cameraHeight = 100000; // 100km above the plane
            const cameraCartographic = new Cartographic(
              planeCartographic.longitude,
              planeCartographic.latitude,
              planeCartographic.height + cameraHeight
            );
            
            const cameraPosition = ellipsoid.cartographicToCartesian(cameraCartographic);
            
            // Set camera to look straight down
            viewer.camera.position = cameraPosition;
            viewer.camera.direction = Cartesian3.normalize(
              Cartesian3.subtract(currentPlanePosition, cameraPosition, new Cartesian3()),
              new Cartesian3()
            );
            
            // Set up vector to point north
            viewer.camera.up = Cartesian3.normalize(
              new Cartesian3(-Math.sin(planeCartographic.longitude), Math.cos(planeCartographic.longitude), 0),
              new Cartesian3()
            );
            
            viewer.camera.right = Cartesian3.cross(
              viewer.camera.direction,
              viewer.camera.up,
              new Cartesian3()
            );
            
            isInitialized = true;
          } else if (lastPlanePosition) {
            // Calculate how much the plane moved
            const planeMovement = Cartesian3.subtract(
              currentPlanePosition, 
              lastPlanePosition, 
              new Cartesian3()
            );
            
            // Move camera by the same amount (follow plane's position)
            // But keep the user's camera orientation (direction, up, right)
            const newCameraPos = Cartesian3.add(
              viewer.camera.position, 
              planeMovement, 
              new Cartesian3()
            );
            
            // Only update position, preserve user's rotation
            viewer.camera.position = newCameraPos;
            
            // Update the last plane position
            lastPlanePosition = currentPlanePosition.clone();
          }
        }
        
        // Continue animation
        animationFrameId = requestAnimationFrame(followAnimation);
      };
      
      followAnimation();
    };
    
    // Start following immediately
    startFollowing();
    
    return () => {
      isFollowingActive = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (interactionTimeout) {
        clearTimeout(interactionTimeout);
      }
      viewer.camera.moveStart.removeEventListener(handleMoveStart);
      viewer.camera.moveEnd.removeEventListener(handleMoveEnd);
    };
  }, [followPlane, isPlaying]);

  // Update clock speed when speed changes
  useEffect(() => {
    if (viewerRef.current?.cesiumElement) {
      const viewer = viewerRef.current.cesiumElement;
      viewer.clock.multiplier = speed;
    }
  }, [speed]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setFollowPlane(false); // Stop following when stopped
    if (viewerRef.current?.cesiumElement) {
      const viewer = viewerRef.current.cesiumElement;
      // Stop animation
      viewer.clock.shouldAnimate = false;
      // Reset to start
      if (viewer.clock.startTime) {
        viewer.clock.currentTime = viewer.clock.startTime.clone();
      }
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
  };

  const handleFollowPlane = () => {
    setFollowPlane(!followPlane);
  };

  return (
    <>
      <Viewer 
        ref={viewerRef}
        full
        timeline={false}
        animation={false}
        homeButton={false}
        geocoder={false}
        sceneModePicker={false}
        baseLayerPicker={false}
        navigationHelpButton={false}
        fullscreenButton={false}
        vrButton={false}
        infoBox={false}
        selectionIndicator={false}
      >
        {/* Only render selected flight */}
        {selectedFlight && (
          <FlightPathEntity 
            key={selectedFlight.id} 
            flight={selectedFlight}
            isSelected={true}
          />
        )}
        
        {selectedFlight && (
          <AirportMarkers flight={selectedFlight} />
        )}
        
        {selectedFlight && (
          <AnimatedFlight 
            flight={selectedFlight}
            viewer={viewerRef.current?.cesiumElement}
            isPlaying={isPlaying}
          />
        )}
      </Viewer>
      
      {selectedFlight && viewerRef.current && (
        <AltitudeIndicator 
          viewer={viewerRef.current.cesiumElement}
          isPlaying={isPlaying}
        />
      )}
      
      {selectedFlight && viewerRef.current && (
        <FlightControls
          viewer={viewerRef.current.cesiumElement}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onStop={handleStop}
          speed={speed}
          onSpeedChange={handleSpeedChange}
          followPlane={followPlane}
          onFollowPlane={handleFollowPlane}
        />
      )}
    </>
  );
};

const FlightPathEntity: React.FC<{ flight: Flight; isSelected: boolean }> = React.memo(({ 
  flight, 
  isSelected 
}) => {
  const totalDistance = flight.path.totalDistance;
  const cruiseAltitude = 40000; // feet - high cruise altitude for visibility
  const groundLevel = 500; // feet - airport ground level (near zero)
  
  // Calculate altitude for each waypoint to create smooth takeoff -> cruise -> landing arc
  const positions: number[] = [];
  const numWaypoints = flight.path.waypoints.length;
  
  flight.path.waypoints.forEach((waypoint, index) => {
    // Calculate progress through the flight (0 = start, 1 = end)
    const progress = index / (numWaypoints - 1);
    
    let altitude = groundLevel;
    
    // Create parabolic arc: starts at ground, peaks at middle, ends at ground
    // First 20% is takeoff/climb, middle 60% is cruise, last 20% is descent/landing
    
    if (progress < 0.2) {
      // TAKEOFF & CLIMB: ground level -> cruise altitude
      const climbProgress = progress / 0.2; // 0 to 1 during climb
      altitude = groundLevel + (climbProgress * (cruiseAltitude - groundLevel));
    } else if (progress > 0.8) {
      // DESCENT & LANDING: cruise altitude -> ground level
      const descentProgress = (progress - 0.8) / 0.2; // 0 to 1 during descent
      altitude = cruiseAltitude - (descentProgress * (cruiseAltitude - groundLevel));
    } else {
      // CRUISE: maintain high altitude
      altitude = cruiseAltitude;
    }
    
    // Convert feet to meters and add to positions
    const altitudeMeters = altitude * 0.3048;
    positions.push(waypoint.lon, waypoint.lat, altitudeMeters);
  });
  
  const color = flight.safetyStatus === 'safe' ? Color.GREEN :
                flight.safetyStatus === 'marginal' ? Color.YELLOW :
                Color.RED;

  return (
    <Entity
      name={`${flight.departure.name} → ${flight.arrival.name}`}
      polyline={{
        positions: Cartesian3.fromDegreesArrayHeights(positions),
        width: isSelected ? 10 : 6,
        material: isSelected 
          ? new PolylineDashMaterialProperty({
              color: color,
              dashLength: 16.0,
              gapColor: color.withAlpha(0.0)
            })
          : color,
        clampToGround: false,
        arcType: ArcType.NONE, // Use actual 3D positions with altitude
        granularity: 0.001 // Smooth curve
      }}
    />
  );
}, (prevProps, nextProps) => {
  // Only re-render if flight ID or selection state changes
  return prevProps.flight.id === nextProps.flight.id && 
         prevProps.isSelected === nextProps.isSelected;
});

