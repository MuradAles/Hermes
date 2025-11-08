import React, { useEffect, useState, useRef } from 'react';
import { FrameRateMonitor } from 'cesium';
import './PerformanceDisplay.css';

interface PerformanceDisplayProps {
  viewer: any;
}

export const PerformanceDisplay: React.FC<PerformanceDisplayProps> = ({ viewer }) => {
  const [fps, setFps] = useState(0);
  const [frameTime, setFrameTime] = useState(0);
  const [drawCalls, setDrawCalls] = useState(0);
  const [triangles, setTriangles] = useState(0);
  const frameRateMonitorRef = useRef<FrameRateMonitor | null>(null);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!viewer?.scene) return;

    const scene = viewer.scene;
    
    // Create FrameRateMonitor for accurate FPS tracking
    const monitor = new FrameRateMonitor({
      scene: scene,
      samplingWindow: 1.0, // 1 second window
      quietPeriod: 0.0,
      warmupPeriod: 0.0,
      minimumFrameRateDuringWarmup: 0,
      minimumFrameRateAfterWarmup: 0,
    });
    
    frameRateMonitorRef.current = monitor;

    // Track frame time and other metrics using postRender
    const updatePerformance = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastFrameTimeRef.current;
      
      // Update frame time (time between frames in ms)
      if (deltaTime > 0) {
        setFrameTime(deltaTime);
        lastFrameTimeRef.current = currentTime;
      }
      
      // Get FPS from FrameRateMonitor
      const currentFps = monitor.lastFramesPerSecond;
      if (currentFps !== undefined && !isNaN(currentFps) && currentFps > 0) {
        setFps(Math.round(currentFps));
      }
      
      // Get draw calls and triangles from frame state
      const frameState = scene.frameState;
      if (frameState) {
        // Draw calls = number of render commands
        setDrawCalls(frameState.commandList.length || 0);
        
        // Get geometry info - count total primitives and entities
        const primitiveCount = scene.primitives.length;
        const entityCount = scene.globe ? 1 : 0; // Globe counts as 1
        
        // Rough triangle estimate: each primitive is ~10K triangles, globe is ~100K
        const estimatedTriangles = (primitiveCount * 10000) + (entityCount * 100000);
        setTriangles(estimatedTriangles);
      }
    };

    // Use Cesium's postRender event to track performance
    scene.postRender.addEventListener(updatePerformance);
    
    // Also use requestAnimationFrame to update display even when not rendering
    // This ensures FPS display updates continuously
    const updateDisplay = () => {
      // Get FPS from monitor (works even when not rendering)
      const currentFps = monitor.lastFramesPerSecond;
      if (currentFps !== undefined && !isNaN(currentFps) && currentFps > 0) {
        setFps(Math.round(currentFps));
      }
      
      // Request next frame
      rafIdRef.current = requestAnimationFrame(updateDisplay);
    };
    rafIdRef.current = requestAnimationFrame(updateDisplay);

    return () => {
      // Cleanup
      if (scene?.postRender) {
        try {
          scene.postRender.removeEventListener(updatePerformance);
        } catch (error) {
          console.debug('PerformanceDisplay cleanup error:', error);
        }
      }
      
      // Cancel requestAnimationFrame
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      
      if (frameRateMonitorRef.current) {
        frameRateMonitorRef.current = null;
      }
    };
  }, [viewer]);

  // Get color based on FPS performance
  const getFpsColor = () => {
    if (fps >= 55) return '#10b981'; // Green - excellent
    if (fps >= 30) return '#f59e0b'; // Yellow - acceptable
    return '#ef4444'; // Red - poor
  };

  // Get color based on frame time
  const getFrameTimeColor = () => {
    if (frameTime < 20) return '#10b981'; // Green - < 20ms
    if (frameTime < 33) return '#f59e0b'; // Yellow - 20-33ms
    return '#ef4444'; // Red - > 33ms
  };

  if (!viewer) return null;

  return (
    <div className="performance-display">
      <div className="performance-item">
        <span className="performance-label">FPS</span>
        <span className="performance-value" style={{ color: getFpsColor() }}>
          {fps}
        </span>
      </div>
      <div className="performance-item">
        <span className="performance-label">Frame</span>
        <span className="performance-value" style={{ color: getFrameTimeColor() }}>
          {frameTime > 0 ? frameTime.toFixed(1) : '0.0'}ms
        </span>
      </div>
      <div className="performance-item">
        <span className="performance-label">Draw Calls</span>
        <span className="performance-value" style={{ color: '#60a5fa' }}>
          {drawCalls}
        </span>
      </div>
      <div className="performance-item">
        <span className="performance-label">Triangles</span>
        <span className="performance-value" style={{ color: '#60a5fa' }}>
          {triangles > 0 ? `${(triangles / 1000).toFixed(1)}K` : '0'}
        </span>
      </div>
    </div>
  );
};

