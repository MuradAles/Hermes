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
  Cartographic,
  createWorldImageryAsync,
  IonImageryProvider
} from 'cesium';
import { useFlights } from '../../hooks/useFlights';
import { useAuth } from '../../hooks/useAuth';
import { AnimatedFlight } from './AnimatedFlight';
import { AltitudeIndicator } from './AltitudeIndicator';
import { AirportMarkers } from './AirportMarkers';
import { FlightControls } from './FlightControls';
import { PlaneSelector, AVAILABLE_PLANES } from './PlaneSelector';
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
  const [selectedPlaneModel, setSelectedPlaneModel] = useState(AVAILABLE_PLANES[0].uri);
  
  const selectedFlight = flights.find(f => f.id === selectedFlightId);

  // Set Cesium Ion access token BEFORE Viewer initializes
  // This ensures Cesium uses Ion World Imagery by default instead of Bing Maps
  useEffect(() => {
    const token = import.meta.env.VITE_CESIUM_ION_TOKEN || '';
    
    if (token) {
      Ion.defaultAccessToken = token;
      console.log('✅ Cesium Ion token set');
    } else {
      console.warn('⚠️ No Cesium Ion token found - imagery may use fallback providers');
    }
    
    // Note: CORS errors from Bing Maps are expected when Ion falls back
    // We'll handle this by forcing Ion World Imagery in the next effect
  }, []);

  // Force Ion World Imagery and prevent Bing Maps fallback
  useEffect(() => {
    const checkViewer = setInterval(() => {
      if (!viewerRef.current?.cesiumElement) return;
      
      const viewer = viewerRef.current.cesiumElement;
      const token = import.meta.env.VITE_CESIUM_ION_TOKEN || '';
      
      if (!token) {
        clearInterval(checkViewer);
        return;
      }
      
      // Always ensure we're using Ion World Imagery
      const baseLayer = viewer.imageryLayers.get(0);
      if (!baseLayer) {
        clearInterval(checkViewer);
        return;
      }
      
      const provider = baseLayer.imageryProvider;
      if (!provider) {
        clearInterval(checkViewer);
        return;
      }
      
      // Check provider type and URL
      const providerUrl = provider.url || provider._url || '';
      const providerType = provider.constructor?.name || '';
      
      // If it's using Bing Maps (virtualearth.net) or BingMapsImageryProvider, replace it
      const isBingMaps = providerUrl.includes('virtualearth.net') || 
                        providerType.includes('BingMaps') ||
                        providerType.includes('Bing');
      
      // Also check if it's not Ion Imagery Provider
      const isIonImagery = providerType.includes('IonImagery') || provider instanceof IonImageryProvider;
      
      if (isBingMaps || !isIonImagery) {
        clearInterval(checkViewer);
        console.log('🔄 Replacing provider with Ion World Imagery...');
        
        // Use Ion World Imagery explicitly - this prevents Bing Maps fallback
        createWorldImageryAsync().then((imageryProvider) => {
          // Remove all existing layers
          viewer.imageryLayers.removeAll();
          
          // Add Ion World Imagery
          const imageryLayer = viewer.imageryLayers.addImageryProvider(imageryProvider);
          
          // Suppress error events for failed tiles (non-critical)
          imageryProvider.errorEvent.addEventListener((error: any) => {
            // These errors are expected and don't affect functionality
            // Failed tiles will just show as blank/missing, which is fine
            if (error && error.message) {
              const msg = error.message.toLowerCase();
              if (msg.includes('cors') || 
                  msg.includes('timeout') || 
                  msg.includes('504') ||
                  msg.includes('failed to obtain')) {
                // Silently ignore - these are non-critical tile loading failures
                return;
              }
            }
          });
          
          console.log('✅ Ion World Imagery provider configured');
        }).catch((error) => {
          console.error('❌ Failed to create world imagery:', error);
          console.warn('⚠️ Ensure VITE_CESIUM_ION_TOKEN is set correctly');
        });
      } else {
        // Provider is Ion Imagery - add error handling to suppress noise
        clearInterval(checkViewer);
        
        if (provider.errorEvent) {
          provider.errorEvent.addEventListener((error: any) => {
            // Suppress non-critical tile loading errors
            if (error && error.message) {
              const msg = error.message.toLowerCase();
              if (msg.includes('cors') || 
                  msg.includes('timeout') || 
                  msg.includes('504') ||
                  msg.includes('failed to obtain')) {
                return; // Silently ignore
              }
            }
          });
        }
        
        console.log('✅ Ion Imagery provider confirmed');
      }
    }, 100);

    return () => clearInterval(checkViewer);
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
    if (!followPlane || !viewerRef.current || !isPlaying || !selectedFlight) {
      return;
    }
    
    const viewer = viewerRef.current.cesiumElement;
    if (!viewer || !viewer.entities) return;
    
    // Use stable entity ID matching AnimatedFlight component (model changes don't affect ID)
    const entityId = `animated-plane-${selectedFlight.id}`;
    const entity = viewer.entities.getById(entityId);
    if (!entity) return;
    
    // Make sure camera is in free mode (not locked to any transform)
    viewer.camera.lookAtTransform(Matrix4.IDENTITY);
    
    const planePosition = entity.position?.getValue(viewer.clock.currentTime);
    if (!planePosition) return;
    
    let isUserInteracting = false;
    let interactionTimeout: number | undefined;
    let isFollowingActive = false;
    
    // Override zoom to zoom towards plane instead of mouse position
    const handleWheel = (event: WheelEvent) => {
      try {
        const currentPlanePosition = entity.position?.getValue(viewer.clock.currentTime);
        if (!currentPlanePosition) return;
        
        // Prevent default zoom behavior
        event.preventDefault();
        event.stopPropagation();
        
        // Calculate zoom direction towards plane
        const cameraPosition = viewer.camera.position;
        const directionToPlane = Cartesian3.subtract(
          currentPlanePosition,
          cameraPosition,
          new Cartesian3()
        );
        const distanceToPlane = Cartesian3.magnitude(directionToPlane);
        
        // Safety check: ensure valid distance
        if (!distanceToPlane || distanceToPlane === 0 || !isFinite(distanceToPlane) || distanceToPlane === Infinity) {
          return;
        }
        
        // Calculate zoom amount (negative deltaY = zoom in, positive = zoom out)
        // Use smaller zoom factor for smoother zooming
        const zoomFactor = event.deltaY > 0 ? 1.05 : 0.95;
        const newDistance = distanceToPlane * zoomFactor;
        
        // Ensure new distance is valid
        if (!isFinite(newDistance) || newDistance <= 0 || newDistance === Infinity) {
          return;
        }
        
        // Normalize direction vector
        const normalizedDirection = Cartesian3.normalize(directionToPlane, new Cartesian3());
        
        // Check if normalization succeeded
        if (!normalizedDirection) {
          return;
        }
        
        // Calculate movement amount - ensure it's a valid number
        const movementAmount = Number(newDistance - distanceToPlane);
        
        // Check if movement amount is valid
        if (!isFinite(movementAmount) || movementAmount === Infinity || movementAmount === -Infinity) {
          return;
        }
        
        // Move camera along the direction to plane
        // Ensure scalar is a valid number
        const scalar = Number(movementAmount);
        if (!isFinite(scalar)) {
          return;
        }
        
        const movement = Cartesian3.multiplyByScalar(
          normalizedDirection,
          scalar,
          new Cartesian3()
        );
        
        // Verify movement vector is valid before applying
        if (movement && 
            isFinite(movement.x) && 
            isFinite(movement.y) && 
            isFinite(movement.z) &&
            movement.x !== Infinity && movement.y !== Infinity && movement.z !== Infinity) {
          viewer.camera.move(movement);
        }
      } catch (error) {
        // Silently fail if there's any error during zoom
        console.debug('Zoom error:', error);
      }
    };
    
    // Add wheel event listener to canvas
    const canvas = viewer.canvas;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    
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
      
      // Use postRender event to sync camera updates with scene rendering
      // This ensures camera updates happen at the same time as entity position updates
      const followHandler = () => {
        if (!isFollowingActive || !followPlane || !isPlaying) return;
        
        // Get plane position at current clock time (synchronized with scene render)
        const currentPlanePosition = entity.position?.getValue(viewer.clock.currentTime);
        
        if (!currentPlanePosition) return;
        
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
          // Quick check: only update if plane moved significantly (performance optimization)
          const distance = Cartesian3.distance(currentPlanePosition, lastPlanePosition);
          
          // Only update camera if plane moved more than 1 meter (reduces unnecessary updates)
          if (distance > 1.0) {
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
      };
      
      // Use postRender event instead of requestAnimationFrame for better synchronization
      viewer.scene.postRender.addEventListener(followHandler);
      
      // Store handler for cleanup
      (viewer as any)._followHandler = followHandler;
    };
    
    // Start following immediately
    startFollowing();
    
    return () => {
      isFollowingActive = false;
      if (interactionTimeout) {
        clearTimeout(interactionTimeout);
      }
      // Remove postRender event listener
      const followHandler = (viewer as any)._followHandler;
      if (followHandler) {
        viewer.scene.postRender.removeEventListener(followHandler);
        delete (viewer as any)._followHandler;
      }
      canvas.removeEventListener('wheel', handleWheel);
      viewer.camera.moveStart.removeEventListener(handleMoveStart);
      viewer.camera.moveEnd.removeEventListener(handleMoveEnd);
    };
  }, [followPlane, isPlaying, selectedFlight]);

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
            key={`path-${selectedFlight.id}`} 
            flight={selectedFlight}
            isSelected={true}
          />
        )}
        
        {selectedFlight && (
          <AirportMarkers key={`airports-${selectedFlight.id}`} flight={selectedFlight} />
        )}
        
        {selectedFlight && (
          <AnimatedFlight 
            key={`animated-${selectedFlight.id}`}
            flight={selectedFlight}
            viewer={viewerRef.current?.cesiumElement}
            isPlaying={isPlaying}
            modelUri={selectedPlaneModel}
          />
        )}
      </Viewer>
      
      {selectedFlight && (
        <PlaneSelector
          selectedPlane={selectedPlaneModel}
          onPlaneChange={setSelectedPlaneModel}
        />
      )}
      
      {selectedFlight && viewerRef.current && (
        <AltitudeIndicator 
          viewer={viewerRef.current.cesiumElement}
          isPlaying={isPlaying}
          entityId={`animated-plane-${selectedFlight.id}`}
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
        width: isSelected ? 3 : 2, // Thinner line
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

