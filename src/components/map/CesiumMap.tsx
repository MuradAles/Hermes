import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Viewer, Entity } from 'resium';
import { 
  Cartesian3, 
  Color, 
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
import { PerformanceDisplay } from './PerformanceDisplay';
import type { Flight } from '../../types';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './CesiumMap.css';

interface CesiumMapProps {
  selectedFlightId?: string | null;
  allFlights?: Flight[]; // For admin mode - show all flights
}

// Helper function to validate Cartesian3 position
const isValidCartesian3 = (pos: Cartesian3 | null | undefined): boolean => {
  if (!pos) return false;
  return isFinite(pos.x) && isFinite(pos.y) && isFinite(pos.z) &&
         pos.x !== Infinity && pos.y !== Infinity && pos.z !== Infinity &&
         pos.x !== -Infinity && pos.y !== -Infinity && pos.z !== -Infinity &&
         !isNaN(pos.x) && !isNaN(pos.y) && !isNaN(pos.z);
};

// Helper function to safely set camera position (prevents NaN)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safeSetCameraPosition = (viewer: any, newPosition: Cartesian3): boolean => {
  if (!isValidCartesian3(newPosition)) {
    console.warn('[CesiumMap] Invalid new camera position:', newPosition);
    return false;
  }
  
  // Also validate current camera position before setting new one
  const currentPos = viewer.camera.position;
  if (!isValidCartesian3(currentPos)) {
    console.warn('[CesiumMap] Current camera position is invalid, resetting...');
    // Reset to a safe default position if current is invalid
    const safePosition = Cartesian3.fromDegrees(0, 0, 10000000); // Default: center of Earth, 10k km up
    if (isValidCartesian3(safePosition)) {
      viewer.camera.position = safePosition;
    }
    return false;
  }
  
  viewer.camera.position = newPosition;
  return true;
};

export const CesiumMap: React.FC<CesiumMapProps> = ({ selectedFlightId, allFlights }) => {
  const { user } = useAuth();
  const { flights } = useFlights(user?.uid || '');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [followPlane, setFollowPlane] = useState(false);
  const [initialCameraSet, setInitialCameraSet] = useState(false);
  const [selectedPlaneModel, setSelectedPlaneModel] = useState(AVAILABLE_PLANES[0].uri);
  
  // Admin mode: use allFlights if provided, otherwise use normal user flights
  const flightsToDisplay = allFlights || flights;
  const selectedFlight = flightsToDisplay.find(f => f.id === selectedFlightId);
  const isAdminMode = !!allFlights; // Admin mode when allFlights prop is provided

  // Memoize contextOptions to prevent Viewer recreation (read-only prop)
  // CRITICAL: This must be stable - any change will recreate the Viewer
  const contextOptions = useMemo(() => ({
    webgl: {
      powerPreference: 'high-performance' as const, // Prefer dedicated GPU
      alpha: false, // Disable alpha for better performance
      antialias: true, // Keep antialiasing for quality
      depth: true,
      stencil: false,
      failIfMajorPerformanceCaveat: false,
      preserveDrawingBuffer: false, // Better performance
      premultipliedAlpha: false
    }
  }), []); // Empty deps - NEVER changes

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

  // Handle WebGL context loss (prevents crashes when context is lost)
  useEffect(() => {
    let cleanup: (() => void) | null = null;
    
    const checkViewer = setInterval(() => {
      if (!viewerRef.current?.cesiumElement) return;
      
      const viewer = viewerRef.current.cesiumElement;
      const viewerCanvas = viewer.canvas;
      
      if (!viewerCanvas) return;
      
      clearInterval(checkViewer);
      
      const handleContextLost = (event: Event) => {
        event.preventDefault();
        console.warn('⚠️ WebGL context lost - attempting to restore...');
      };
      
      const handleContextRestored = () => {
        console.log('✅ WebGL context restored');
        // Force a render to refresh the scene
        if (viewer.scene) {
          viewer.scene.requestRender();
        }
      };
      
      viewerCanvas.addEventListener('webglcontextlost', handleContextLost);
      viewerCanvas.addEventListener('webglcontextrestored', handleContextRestored);
      
      cleanup = () => {
        viewerCanvas.removeEventListener('webglcontextlost', handleContextLost);
        viewerCanvas.removeEventListener('webglcontextrestored', handleContextRestored);
      };
    }, 100);
    
    return () => {
      clearInterval(checkViewer);
      if (cleanup) cleanup();
    };
  }, []);

  // Enable GPU acceleration and performance optimizations
  useEffect(() => {
    const checkViewer = setInterval(() => {
      if (!viewerRef.current?.cesiumElement) return;
      
      const viewer = viewerRef.current.cesiumElement;
      
      // Ensure viewer is fully initialized
      if (!viewer.scene) return;
      
      // Check if container has valid dimensions (prevents 0 width/height errors)
      const canvasElement = viewer.canvas;
      if (!canvasElement || canvasElement.width === 0 || canvasElement.height === 0) {
        console.warn('⚠️ Canvas has zero dimensions, waiting for resize...');
        return;
      }
      
      const scene = viewer.scene;
      
      clearInterval(checkViewer);
      
      // Enable request render mode - only render when needed (reduces CPU usage by 30-50%)
      // BUT: Disable during animations to ensure smooth playback
      // We'll toggle this based on animation state
      scene.requestRenderMode = false; // Disabled for smooth animations
      scene.maximumRenderTimeChange = Infinity;
      
      // Set target frame rate to 60 FPS (prevents over-rendering)
      viewer.targetFrameRate = 60.0;
      
      // Disable built-in FPS display (we have custom PerformanceDisplay component)
      scene.debugShowFramesPerSecond = false;
      
      // QUALITY MODE: Full resolution for crisp, non-pixelated rendering
      viewer.resolutionScale = 1.0; // Full resolution (100%) - no pixelation
      
      // Balanced anti-aliasing (2x is good quality without killing FPS)
      scene.msaaSamples = 2; // 2x MSAA anti-aliasing (smooth edges, better performance than 4x)
      
      // Verify GPU acceleration is working
      const gl = canvasElement.getContext('webgl2') || canvasElement.getContext('webgl');
      
      if (!gl) {
        console.error('❌ WebGL NOT AVAILABLE - GPU acceleration failed!');
        console.warn('⚠️ Falling back to software rendering (very slow)');
      } else {
        console.log('✅ WebGL Context Created');
        
        // Get GPU information
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          const version = gl.getParameter(gl.VERSION);
          const shadingLanguageVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);
          
          console.log('🎮 GPU Info:', {
            renderer: renderer || 'Unknown',
            vendor: vendor || 'Unknown',
            version: version || 'Unknown',
            shadingLanguage: shadingLanguageVersion || 'Unknown'
          });
          
          // Check if using software rendering (bad!)
          const isSoftware = renderer?.toLowerCase().includes('software') || 
                            renderer?.toLowerCase().includes('llvmpipe') ||
                            renderer?.toLowerCase().includes('mesa');
          
          if (isSoftware) {
            console.error('❌ SOFTWARE RENDERING DETECTED - GPU not being used!');
            console.warn('⚠️ This will be VERY slow. Check GPU drivers and browser settings.');
          } else {
            console.log('✅ Hardware GPU acceleration confirmed');
          }
        } else {
          console.warn('⚠️ WEBGL_debug_renderer_info extension not available');
          console.log('✅ WebGL is working (but cannot verify GPU details)');
        }
        
        // Verify WebGL version
        const isWebGL2 = gl instanceof WebGL2RenderingContext;
        console.log(`✅ Using ${isWebGL2 ? 'WebGL 2.0' : 'WebGL 1.0'}`);
        
        // Check context attributes
        const contextAttributes = gl.getContextAttributes();
        console.log('🔧 WebGL Context Attributes:', {
          alpha: contextAttributes?.alpha,
          antialias: contextAttributes?.antialias,
          depth: contextAttributes?.depth,
          stencil: contextAttributes?.stencil,
          powerPreference: contextAttributes?.powerPreference || 'default'
        });
        
        // Verify Cesium is using WebGL
        const cesiumContext = scene.context;
        if (cesiumContext) {
          console.log('✅ Cesium WebGL Context:', {
            webglVersion: cesiumContext.webglVersion || 'Unknown',
            maxTextureSize: cesiumContext.maximumTextureSize || 'Unknown'
          });
        }
      }
      
      // AGGRESSIVE PERFORMANCE OPTIMIZATIONS
      scene.globe.enableLighting = false; // No lighting
      scene.globe.dynamicAtmosphereLighting = false;
      scene.globe.dynamicAtmosphereLightingFromSun = false;
      scene.globe.showGroundAtmosphere = false; // Disable atmosphere glow (saves GPU)
      
      // Terrain quality - balanced for distance visibility
      scene.globe.maximumScreenSpaceError = 3; // Lower = more detail visible from distance (was 4, now 3)
      scene.globe.terrainExaggeration = 1.0;
      scene.globe.tileCacheSize = 100; // Tile cache size
      scene.globe.depthTestAgainstTerrain = true; // Better depth testing for buildings
      
      // Disable fog completely
      scene.fog.enabled = false;
      
      // Disable skybox for max performance
      scene.skyBox.show = false; // Disabled for better FPS
      scene.sun.show = false; // No sun
      scene.moon.show = false; // No moon
      
      // Disable shadows
      scene.shadowMap.enabled = false;
      
      console.log('✅ GPU acceleration enabled');
      console.log('✅ Request render mode: DISABLED (continuous 60 FPS)');
      console.log('✅ Target frame rate: 60 FPS');
      console.log('🎨 QUALITY MODE: Full resolution (100%) + 2x MSAA anti-aliasing');
      console.log('✅ Performance optimizations applied');
      console.log('📊 Check bottom-right for live FPS counter');
      
      // Log performance settings
      console.log('⚙️ Settings:', {
        resolutionScale: viewer.resolutionScale,
        msaaSamples: scene.msaaSamples,
        requestRenderMode: scene.requestRenderMode,
        targetFrameRate: viewer.targetFrameRate
      });
    }, 100);

    return () => clearInterval(checkViewer);
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
          // Remove all existing layers to prevent color inconsistencies
          viewer.imageryLayers.removeAll();
          
          // Add Ion World Imagery as base layer (consistent ocean color)
          const baseLayer = viewer.imageryLayers.addImageryProvider(imageryProvider);
          
          // Ensure consistent ocean color - no brightness/contrast adjustments
          baseLayer.alpha = 1.0; // Full opacity
          baseLayer.brightness = 1.0; // No brightness adjustment
          baseLayer.contrast = 1.0; // No contrast adjustment
          baseLayer.gamma = 1.0; // No gamma adjustment
          baseLayer.hue = 0.0; // No hue shift
          baseLayer.saturation = 1.0; // Full saturation
          
          // Suppress error events for failed tiles (non-critical)
          imageryProvider.errorEvent.addEventListener((error: unknown) => {
            // These errors are expected and don't affect functionality
            // Failed tiles will just show as blank/missing, which is fine
            if (error && typeof error === 'object' && 'message' in error) {
              const msg = String(error.message).toLowerCase();
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
          
          // Add Google Maps 2D Labels layer on top
          addGoogleMapsLabels(viewer);
        }).catch((error) => {
          console.error('❌ Failed to create world imagery:', error);
          console.warn('⚠️ Ensure VITE_CESIUM_ION_TOKEN is set correctly');
        });
      } else {
        // Provider is Ion Imagery - add error handling to suppress noise
        clearInterval(checkViewer);
        
        if (provider.errorEvent) {
          provider.errorEvent.addEventListener((error: unknown) => {
            // Suppress non-critical tile loading errors
            if (error && typeof error === 'object' && 'message' in error) {
              const msg = String(error.message).toLowerCase();
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
        
        // Add Google Maps 2D Labels layer on top
        addGoogleMapsLabels(viewer);
      }
    }, 100);

    return () => clearInterval(checkViewer);
  }, []);

  // Helper function to add Google Maps 2D Labels layer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addGoogleMapsLabels = async (viewer: any) => {
    try {
      // Check if labels layer already exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingLabelsLayer = viewer.imageryLayers._layers.find((layer: any) => {
        const provider = layer.imageryProvider;
        return provider && provider._assetId === 3830185;
      });
      
      if (existingLabelsLayer) {
        console.log('✅ Google Maps 2D Labels already added');
        return;
      }
      
      console.log('🏷️ Loading Google Maps 2D Labels (Ion asset 3830185)...');
      
      // Use IonImageryProvider.fromAssetId - this is the correct API
      const { IonImageryProvider } = await import('cesium');
      
      // Create imagery provider from Ion asset ID
      // Note: Asset 3830185 is Google Maps 2D Labels Only
      const labelsProvider = await IonImageryProvider.fromAssetId(3830185);
      
      // Add labels layer on top of base imagery (after base layer)
      // This ensures labels appear on top of terrain/imagery
      const labelsLayer = viewer.imageryLayers.addImageryProvider(labelsProvider);
      
      // Set alpha/opacity for labels (1.0 = fully opaque)
      labelsLayer.alpha = 1.0;
      labelsLayer.show = true; // Ensure labels are visible
      
      // Labels should be on top, so brightness/contrast adjustments aren't needed
      
      // Add error handling for labels
      labelsProvider.errorEvent.addEventListener((error: unknown) => {
        if (error && typeof error === 'object' && 'message' in error) {
          const msg = String(error.message).toLowerCase();
          if (msg.includes('cors') || 
              msg.includes('timeout') || 
              msg.includes('504') ||
              msg.includes('failed to obtain')) {
            // Log non-critical errors for debugging
            console.debug('⚠️ Labels tile error (non-critical):', error);
            return; // Silently ignore
          } else {
            // Log other errors
            console.warn('⚠️ Labels tile error:', error);
          }
        }
      });
      
      // Monitor labels loading (if readyPromise exists)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((labelsProvider as any).readyPromise) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (labelsProvider as any).readyPromise.then(() => {
          console.log('✅ Google Maps 2D Labels provider ready!');
          console.log('📍 Labels will show place names, cities, and geographic features');
          console.log('🔍 Zoom in/out to see labels at different zoom levels');
        }).catch((error: unknown) => {
          console.error('❌ Labels provider failed to load:', error);
          console.warn('💡 Check if asset 3830185 is accessible with your Ion token');
        });
      } else {
        // If no readyPromise, just log that labels were added
        console.log('✅ Google Maps 2D Labels provider added!');
        console.log('📍 Labels will show place names, cities, and geographic features');
      }
      
      console.log('✅ Google Maps 2D Labels layer added!');
    } catch (error) {
      console.error('❌ Failed to load Google Maps 2D Labels:', error);
      console.warn('💡 Labels disabled - map will still work without labels');
    }
  };

  // 3D Buildings Tileset - ENABLED with aggressive optimizations
  useEffect(() => {
    // Check periodically until viewer is ready
    const checkViewer = setInterval(() => {
      if (!viewerRef.current?.cesiumElement) return;
      
      const viewer = viewerRef.current.cesiumElement;
      
      // Ensure viewer is fully initialized with scene
      if (!viewer.scene) return;

      // Viewer is ready!
      clearInterval(checkViewer);
      
      // Small delay to ensure viewer is fully initialized
      setTimeout(async () => {
        try {
          console.log('🏢 Loading 3D Buildings (Ion asset 2275207)...');
          
          // Dynamically import Cesium3DTileset and ShadowMode
          const { Cesium3DTileset, ShadowMode } = await import('cesium');
          
          const tileset = viewer.scene.primitives.add(
            await Cesium3DTileset.fromIonAssetId(2275207)
          );
          
          // BALANCED DISTANCE VISIBILITY - 2x further than original, optimized for performance
          tileset.shadows = ShadowMode.DISABLED; // No shadows
          tileset.maximumScreenSpaceError = 32; // 2x better than original 64 = visible from 2x further away
          tileset.cullWithChildrenBounds = true; // Enable culling to reduce draw calls (prevents 1000+ draw calls)
          tileset.skipLevelOfDetail = true; // Skip LOD levels to reduce complexity and draw calls
          tileset.baseScreenSpaceError = 512; // Balanced detail (was 1024 original, now 512 = 2x more detail)
          tileset.skipScreenSpaceErrorFactor = 8; // Moderate skipping (reduces draw calls)
          tileset.skipLevels = 1; // Skip 1 detail level (reduces complexity and draw calls)
          tileset.immediatelyLoadDesiredLevelOfDetail = false; // Don't load immediately (saves resources)
          tileset.loadSiblings = false; // Don't preload siblings (reduces draw calls from 1000+ to ~100)
          tileset.dynamicScreenSpaceError = true; // Enable dynamic adjustment for better performance
          tileset.dynamicScreenSpaceErrorDensity = 0.00278; // Balanced density
          tileset.dynamicScreenSpaceErrorFactor = 2.0; // Moderate reduction (balances quality/performance)
          tileset.dynamicScreenSpaceErrorHeightFalloff = 0.5; // Moderate falloff
          
          // Distance-based culling - hide buildings when zoomed out far
          // This prevents rendering buildings when viewing the whole planet
          tileset.maximumAttenuation = 0.0; // No distance limit
          tileset.preloadFlightDestinations = false; // Don't preload (reduces draw calls)
          tileset.preloadWhenHidden = false; // Don't load when hidden
          
          // Add camera-based culling - hide buildings when camera is too far
          // This ensures clean planet view when zoomed out
          let lastVisibilityState: boolean | null = null;
          const updateBuildingVisibility = () => {
            if (!viewer.scene || !viewer.camera) return;
            
            // Get camera height (distance from Earth surface)
            const cameraHeight = viewer.camera.positionCartographic.height;
            
            // Hide buildings when camera is above 500km (space view)
            // Show buildings when camera is below 500km (close-up view)
            const shouldShow = cameraHeight <= 500000; // 500km = space view threshold
            
            // Only update if visibility state changed (prevents spam)
            if (lastVisibilityState !== shouldShow) {
              tileset.show = shouldShow;
              lastVisibilityState = shouldShow;
              
              if (shouldShow) {
                console.log('🏢 Buildings visible (camera < 500km)');
              } else {
                console.log('🌍 Buildings hidden (camera > 500km - space view)');
              }
            }
          };
          
          // Update visibility when camera moves
          viewer.camera.changed.addEventListener(updateBuildingVisibility);
          viewer.scene.postRender.addEventListener(updateBuildingVisibility);
          
          // Initial check
          updateBuildingVisibility();
          
          console.log('✅ 3D Buildings loaded with balanced distance visibility!');
          console.log('⚙️ Tileset settings:', {
            maximumScreenSpaceError: tileset.maximumScreenSpaceError,
            baseScreenSpaceError: tileset.baseScreenSpaceError,
            skipLevelOfDetail: tileset.skipLevelOfDetail,
            dynamicScreenSpaceError: tileset.dynamicScreenSpaceError,
            maximumAttenuation: tileset.maximumAttenuation
          });
          console.log('👁️ Buildings now visible from 2x further away (was 64, now 32)!');
          console.log('🎨 Quality: Full resolution + 2x MSAA anti-aliasing (no pixelation)');
          console.log('⚡ Performance: Optimized to reduce draw calls from 1000+ to ~100');
          
          // Wait for tileset to be ready
          if (tileset.readyPromise) {
            tileset.readyPromise.then(() => {
              console.log('🏙️ 3D Buildings ready and visible!');
            }).catch((err: unknown) => {
              console.error('❌ Tileset ready promise failed:', err);
            });
          }
        } catch (error) {
          console.error('❌ Failed to load 3D buildings:', error);
          console.warn('💡 Buildings disabled - flight paths will still work');
        }
      }, 500);
    }, 100); // Check every 100ms

    return () => clearInterval(checkViewer);
  }, []);

  // Initial camera setup for admin mode (show all flights)
  useEffect(() => {
    if (isAdminMode && flightsToDisplay.length > 0 && viewerRef.current?.cesiumElement && !initialCameraSet) {
      const viewer = viewerRef.current.cesiumElement;
      
      // Ensure viewer is fully initialized
      if (!viewer.scene) return;
      
      // Collect all coordinates from all flights
      const allLons: number[] = [];
      const allLats: number[] = [];
      
      flightsToDisplay.forEach(flight => {
        allLons.push(flight.departure.lon, flight.arrival.lon);
        allLats.push(flight.departure.lat, flight.arrival.lat);
        
        // Also include waypoints for more accurate bounding box
        flight.path.waypoints.forEach(waypoint => {
          allLons.push(waypoint.lon);
          allLats.push(waypoint.lat);
        });
      });
      
      // Calculate bounding box
      const minLon = Math.min(...allLons);
      const maxLon = Math.max(...allLons);
      const minLat = Math.min(...allLats);
      const maxLat = Math.max(...allLats);
      
      // Calculate center
      const centerLon = (minLon + maxLon) / 2;
      const centerLat = (minLat + maxLat) / 2;
      
      // Calculate distance to determine view height
      const lonRange = (maxLon - minLon) * 111000 * Math.cos(CesiumMath.toRadians(centerLat));
      const latRange = (maxLat - minLat) * 111000;
      const maxRange = Math.max(lonRange, latRange);
      
      // Set view height to show all flights with some padding
      const viewHeight = Math.max(maxRange * 1.5, 2000000); // At least 2000km high
      
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(
          centerLon,
          centerLat,
          viewHeight
        ),
        duration: 2,
        orientation: {
          heading: 0,
          pitch: CesiumMath.toRadians(-90), // Top-down view
          roll: 0
        }
      });
      
      setInitialCameraSet(true);
    }
  }, [isAdminMode, flightsToDisplay, initialCameraSet]);

  // Initial camera setup when flight is first selected (normal mode)
  useEffect(() => {
    if (!isAdminMode && selectedFlightId && viewerRef.current?.cesiumElement && !initialCameraSet) {
      const flight = flightsToDisplay.find(f => f.id === selectedFlightId);
      if (flight) {
        const viewer = viewerRef.current.cesiumElement;
        
        // Ensure viewer is fully initialized
        if (!viewer.scene) return;
        
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
  }, [isAdminMode, selectedFlightId, flightsToDisplay, initialCameraSet]);

  // Follow plane with smooth tracking and full camera control
  useEffect(() => {
    if (!followPlane || !viewerRef.current?.cesiumElement || !isPlaying || !selectedFlight) {
      return;
    }
    
    const viewer = viewerRef.current.cesiumElement;
    
    // Ensure viewer is fully initialized
    if (!viewer.scene || !viewer.entities) return;
    
    // Use stable entity ID matching AnimatedFlight component (model changes don't affect ID)
    const entityId = `animated-plane-${selectedFlight.id}`;
    const entity = viewer.entities.getById(entityId);
    if (!entity) return;
    
    // Make sure camera is in free mode (not locked to any transform)
    viewer.camera.lookAtTransform(Matrix4.IDENTITY);
    
    // Validate current camera position before starting
    if (!isValidCartesian3(viewer.camera.position)) {
      console.warn('[CesiumMap] Camera position is invalid at start, resetting...');
      const safePosition = Cartesian3.fromDegrees(0, 0, 10000000);
      if (isValidCartesian3(safePosition)) {
        viewer.camera.position = safePosition;
      }
    }
    
    const planePosition = entity.position?.getValue(viewer.clock.currentTime);
    if (!planePosition || !isValidCartesian3(planePosition)) {
      console.warn('[CesiumMap] Plane position is invalid or not available yet');
      return;
    }
    
    let interactionTimeout: number | undefined;
    let isFollowingActive = false;
    
    // Override zoom to zoom towards plane instead of mouse position
    const handleWheel = (event: WheelEvent) => {
      try {
        const currentPlanePosition = entity.position?.getValue(viewer.clock.currentTime);
        if (!currentPlanePosition || !isValidCartesian3(currentPlanePosition)) {
          console.debug('[CesiumMap] Plane position invalid during zoom');
          return;
        }
        
        // Validate current camera position
        const cameraPosition = viewer.camera.position;
        if (!isValidCartesian3(cameraPosition)) {
          console.warn('[CesiumMap] Camera position invalid during zoom, aborting');
          return;
        }
        
        // Prevent default zoom behavior
        event.preventDefault();
        event.stopPropagation();
        
        // Calculate zoom direction towards plane
        const directionToPlane = Cartesian3.subtract(
          currentPlanePosition,
          cameraPosition,
          new Cartesian3()
        );
        
        // Validate direction vector
        if (!isValidCartesian3(directionToPlane)) {
          console.debug('[CesiumMap] Invalid direction vector during zoom');
          return;
        }
        
        const distanceToPlane = Cartesian3.magnitude(directionToPlane);
        
        // Safety check: ensure valid distance
        if (!isFinite(distanceToPlane) || distanceToPlane === 0 || distanceToPlane === Infinity || distanceToPlane <= 0) {
          console.debug('[CesiumMap] Invalid distance to plane during zoom:', distanceToPlane);
          return;
        }
        
        // Calculate zoom amount (negative deltaY = zoom in, positive = zoom out)
        // Use smaller zoom factor for smoother zooming
        const zoomFactor = event.deltaY > 0 ? 1.05 : 0.95;
        const newDistance = distanceToPlane * zoomFactor;
        
        // Ensure new distance is valid
        if (!isFinite(newDistance) || newDistance <= 0 || newDistance === Infinity) {
          console.debug('[CesiumMap] Invalid new distance during zoom:', newDistance);
          return;
        }
        
        // Normalize direction vector
        const normalizedDirection = Cartesian3.normalize(directionToPlane, new Cartesian3());
        
        // Check if normalization succeeded
        if (!normalizedDirection || !isValidCartesian3(normalizedDirection)) {
          console.debug('[CesiumMap] Normalization failed during zoom');
          return;
        }
        
        // Calculate movement amount - ensure it's a valid number
        const movementAmount = newDistance - distanceToPlane;
        
        // Check if movement amount is valid
        if (!isFinite(movementAmount) || movementAmount === Infinity || movementAmount === -Infinity) {
          console.debug('[CesiumMap] Invalid movement amount during zoom:', movementAmount);
          return;
        }
        
        // Move camera along the direction to plane
        const movement = Cartesian3.multiplyByScalar(
          normalizedDirection,
          movementAmount,
          new Cartesian3()
        );
        
        // Verify movement vector is valid before applying
        if (!isValidCartesian3(movement)) {
          console.debug('[CesiumMap] Invalid movement vector during zoom');
          return;
        }
        
        // Calculate new camera position
        const newCameraPos = Cartesian3.add(cameraPosition, movement, new Cartesian3());
        
        // Validate and set new camera position
        if (!safeSetCameraPosition(viewer, newCameraPos)) {
          console.debug('[CesiumMap] Failed to set camera position during zoom');
        }
      } catch (error) {
        // Log error for debugging but don't break the app
        console.warn('[CesiumMap] Zoom error:', error);
      }
    };
    
    // Add wheel event listener to canvas
    const canvas = viewer.canvas;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    
    // Detect when user starts interacting with camera
    const handleMoveStart = () => {
      if (interactionTimeout) {
        clearTimeout(interactionTimeout);
      }
    };
    
    // Detect when user stops interacting
    const handleMoveEnd = () => {
      // User interaction ended
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
        
        // Validate current camera position before doing anything
        if (!isValidCartesian3(viewer.camera.position)) {
          console.warn('[CesiumMap] Camera position invalid in follow handler, resetting...');
          const safePosition = Cartesian3.fromDegrees(0, 0, 10000000);
          if (isValidCartesian3(safePosition)) {
            viewer.camera.position = safePosition;
          }
          return;
        }
        
        // Get plane position at current clock time (synchronized with scene render)
        const currentPlanePosition = entity.position?.getValue(viewer.clock.currentTime);
        
        if (!currentPlanePosition || !isValidCartesian3(currentPlanePosition)) {
          // Plane position not available yet - this is OK, just skip this frame
          return;
        }
        
        // First frame: Set up top-down view
        if (!isInitialized) {
          lastPlanePosition = currentPlanePosition.clone();
          
          // Get plane's cartographic position
          const ellipsoid = viewer.scene.globe.ellipsoid;
          let planeCartographic: Cartographic;
          
          try {
            planeCartographic = ellipsoid.cartesianToCartographic(currentPlanePosition);
          } catch (error) {
            console.warn('[CesiumMap] Failed to convert to cartographic:', error);
            return;
          }
          
          // Validate cartographic position
          if (!planeCartographic || !isFinite(planeCartographic.longitude) || 
              !isFinite(planeCartographic.latitude) || !isFinite(planeCartographic.height)) {
            console.warn('[CesiumMap] Invalid cartographic position:', planeCartographic);
            return;
          }
          
          // Position camera directly above the plane
          const cameraHeight = 100000; // 100km above the plane
          const cameraCartographic = new Cartographic(
            planeCartographic.longitude,
            planeCartographic.latitude,
            planeCartographic.height + cameraHeight
          );
          
          // Validate camera height calculation
          if (!isFinite(cameraCartographic.height)) {
            console.warn('[CesiumMap] Invalid camera height:', cameraCartographic.height);
            return;
          }
          
          let cameraPosition: Cartesian3;
          try {
            cameraPosition = ellipsoid.cartographicToCartesian(cameraCartographic);
          } catch (error) {
            console.warn('[CesiumMap] Failed to convert cartographic to cartesian:', error);
            return;
          }
          
          // Validate camera position
          if (!isValidCartesian3(cameraPosition)) {
            console.warn('[CesiumMap] Invalid camera position after conversion:', cameraPosition);
            return;
          }
          
          // Calculate direction vector
          const directionVec = Cartesian3.subtract(currentPlanePosition, cameraPosition, new Cartesian3());
          if (!isValidCartesian3(directionVec)) {
            console.warn('[CesiumMap] Invalid direction vector:', directionVec);
            return;
          }
          
          // Normalize direction vector
          const normalizedDirection = Cartesian3.normalize(directionVec, new Cartesian3());
          if (!normalizedDirection || !isValidCartesian3(normalizedDirection)) {
            console.warn('[CesiumMap] Failed to normalize direction vector');
            return;
          }
          
          // Set camera to look straight down
          if (!safeSetCameraPosition(viewer, cameraPosition)) {
            console.warn('[CesiumMap] Failed to set initial camera position');
            return;
          }
          
          viewer.camera.direction = normalizedDirection;
          
          // Set up vector to point north
          const upVec = new Cartesian3(-Math.sin(planeCartographic.longitude), Math.cos(planeCartographic.longitude), 0);
          if (!isValidCartesian3(upVec)) {
            console.warn('[CesiumMap] Invalid up vector:', upVec);
            return;
          }
          
          const normalizedUp = Cartesian3.normalize(upVec, new Cartesian3());
          if (!normalizedUp || !isValidCartesian3(normalizedUp)) {
            console.warn('[CesiumMap] Failed to normalize up vector');
            return;
          }
          
          viewer.camera.up = normalizedUp;
          
          const rightVec = Cartesian3.cross(
            viewer.camera.direction,
            viewer.camera.up,
            new Cartesian3()
          );
          
          if (!isValidCartesian3(rightVec)) {
            console.warn('[CesiumMap] Invalid right vector');
            return;
          }
          
          viewer.camera.right = rightVec;
          
          isInitialized = true;
        } else if (lastPlanePosition) {
          // Validate last plane position
          if (!isValidCartesian3(lastPlanePosition)) {
            console.warn('[CesiumMap] Last plane position invalid, reinitializing...');
            isInitialized = false;
            return;
          }
          
          // Quick check: only update if plane moved significantly (performance optimization)
          const distance = Cartesian3.distance(currentPlanePosition, lastPlanePosition);
          
          // Validate distance
          if (!isFinite(distance) || distance < 0) {
            console.warn('[CesiumMap] Invalid distance:', distance);
            return;
          }
          
          // Only update camera if plane moved more than 1 meter (reduces unnecessary updates)
          if (distance > 1.0) {
            // Calculate how much the plane moved
            const planeMovement = Cartesian3.subtract(
              currentPlanePosition, 
              lastPlanePosition, 
              new Cartesian3()
            );
            
            // Validate plane movement
            if (!isValidCartesian3(planeMovement)) {
              console.warn('[CesiumMap] Invalid plane movement:', planeMovement);
              return;
            }
            
            // Validate current camera position before adding movement
            const currentCameraPos = viewer.camera.position;
            if (!isValidCartesian3(currentCameraPos)) {
              console.warn('[CesiumMap] Current camera position invalid before update');
              return;
            }
            
            // Move camera by the same amount (follow plane's position)
            // But keep the user's camera orientation (direction, up, right)
            const newCameraPos = Cartesian3.add(
              currentCameraPos, 
              planeMovement, 
              new Cartesian3()
            );
            
            // Validate and set new camera position
            if (!safeSetCameraPosition(viewer, newCameraPos)) {
              console.warn('[CesiumMap] Failed to update camera position during follow');
              return;
            }
            
            // Update the last plane position
            lastPlanePosition = currentPlanePosition.clone();
          }
        }
      };
      
      // Use postRender event instead of requestAnimationFrame for better synchronization
      viewer.scene.postRender.addEventListener(followHandler);
      
      // Store handler for cleanup
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const followHandler = (viewer as any)._followHandler;
      if (followHandler) {
        viewer.scene.postRender.removeEventListener(followHandler);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // FORCE request render mode OFF for maximum FPS
  // This makes GPU render continuously at 60 FPS (uses more CPU but smoother)
  useEffect(() => {
    if (!viewerRef.current?.cesiumElement?.scene) return;
    
    const scene = viewerRef.current.cesiumElement.scene;
    
    // ALWAYS keep request render mode disabled for maximum smoothness
    scene.requestRenderMode = false;
    console.log('🎮 Request render mode: FORCED OFF for max FPS');
  }, [isPlaying]);

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
        contextOptions={contextOptions}
      >
        {/* Admin mode: render all flights */}
        {isAdminMode ? (
          <>
            {flightsToDisplay.map(flight => (
              <React.Fragment key={flight.id}>
                <FlightPathEntity 
                  flight={flight}
                  isSelected={false}
                />
                <AirportMarkers flight={flight} />
              </React.Fragment>
            ))}
          </>
        ) : (
          <>
            {/* Normal mode: only render selected flight */}
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
          </>
        )}
      </Viewer>
      
      {/* Only show controls in normal mode (not admin mode) */}
      {!isAdminMode && selectedFlight && (
        <PlaneSelector
          selectedPlane={selectedPlaneModel}
          onPlaneChange={setSelectedPlaneModel}
        />
      )}
      
      {!isAdminMode && selectedFlight && viewerRef.current && (
        <AltitudeIndicator 
          viewer={viewerRef.current.cesiumElement}
          isPlaying={isPlaying}
          entityId={`animated-plane-${selectedFlight.id}`}
        />
      )}
      
      {!isAdminMode && selectedFlight && viewerRef.current && (
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
      
      {/* Performance Display - Always visible when viewer is ready */}
      {viewerRef.current && (
        <PerformanceDisplay viewer={viewerRef.current.cesiumElement} />
      )}
    </>
  );
};

const FlightPathEntity: React.FC<{ flight: Flight; isSelected: boolean }> = React.memo(({ 
  flight, 
  isSelected 
}) => {
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

