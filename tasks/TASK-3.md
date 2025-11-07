# Task 3: 3D Visualization & Polish

**Duration:** 6-8 hours

## Objective
Integrate Cesium 3D globe, display flight paths, add animation, and polish the UI.

---

## Step 1: Cesium Map Setup

**File: `src/components/map/CesiumMap.tsx`**
```typescript
import React, { useEffect, useRef } from 'react';
import { Viewer, Entity } from 'resium';
import { Cartesian3, Color } from 'cesium';
import { useFlights } from '../../hooks/useFlights';
import { useAuth } from '../../hooks/useAuth';
import { Flight } from '../../types';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import './CesiumMap.css';

interface CesiumMapProps {
  selectedFlightId: string | null;
}

export const CesiumMap: React.FC<CesiumMapProps> = ({ selectedFlightId }) => {
  const { user } = useAuth();
  const { flights } = useFlights(user?.uid || '');
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    if (selectedFlightId && viewerRef.current) {
      const flight = flights.find(f => f.id === selectedFlightId);
      if (flight) {
        const viewer = viewerRef.current.cesiumElement;
        viewer.camera.flyTo({
          destination: Cartesian3.fromDegrees(
            flight.departure.lon,
            flight.departure.lat,
            1000000
          ),
          duration: 2
        });
      }
    }
  }, [selectedFlightId, flights]);

  return (
    <Viewer 
      ref={viewerRef}
      full
      timeline={true}
      animation={true}
      homeButton={false}
      geocoder={false}
      sceneModePicker={false}
    >
      {flights.map(flight => (
        <FlightPathEntity 
          key={flight.id} 
          flight={flight}
          isSelected={flight.id === selectedFlightId}
        />
      ))}
    </Viewer>
  );
};

const FlightPathEntity: React.FC<{ flight: Flight; isSelected: boolean }> = ({ 
  flight, 
  isSelected 
}) => {
  const positions = flight.path.waypoints.flatMap(w => [w.lon, w.lat]);
  const color = flight.safetyStatus === 'safe' ? Color.GREEN :
                flight.safetyStatus === 'marginal' ? Color.YELLOW :
                Color.RED;

  return (
    <Entity
      name={`${flight.departure.name} → ${flight.arrival.name}`}
      polyline={{
        positions: Cartesian3.fromDegreesArray(positions),
        width: isSelected ? 8 : 5,
        material: color
      }}
    />
  );
};
```

**File: `src/components/map/CesiumMap.css`**
```css
.cesium-viewer {
  width: 100%;
  height: 100%;
}
```

---

## Step 2: Enhanced Flight Card

**File: `src/components/flights/FlightCard.tsx`** (Update)
```typescript
import React from 'react';
import { Flight } from '../../types';
import './FlightCard.css';

export const FlightCard: React.FC<{ 
  flight: Flight; 
  isSelected: boolean; 
  onSelect: () => void 
}> = ({ flight, isSelected, onSelect }) => {
  const statusIcon = {
    'safe': '✅',
    'marginal': '⚠️',
    'dangerous': '❌'
  }[flight.safetyStatus];

  const statusColor = {
    'safe': '#10b981',
    'marginal': '#f59e0b',
    'dangerous': '#ef4444'
  }[flight.safetyStatus];

  return (
    <div 
      className={`flight-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
      style={{ borderLeft: `4px solid ${statusColor}` }}
    >
      <div className="flight-header">
        <span className="flight-route">
          ✈️ {flight.departure.name?.split(' ')[0]} → {flight.arrival.name?.split(' ')[0]}
        </span>
        <span>{statusIcon}</span>
      </div>
      <div className="flight-time">
        {new Date(flight.scheduledTime).toLocaleDateString()} at{' '}
        {new Date(flight.scheduledTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
      </div>
      <div className="flight-details">
        {Math.round(flight.path.totalDistance)} NM • {Math.round(flight.path.estimatedDuration)} min
      </div>
    </div>
  );
};
```

**File: `src/components/flights/FlightCard.css`**
```css
.flight-card {
  background: #2a2a3e;
  padding: 16px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 12px;
  transition: all 0.2s;
}

.flight-card:hover {
  background: #3a3a4e;
  transform: translateX(4px);
}

.flight-card.selected {
  background: #3a3a4e;
  box-shadow: 0 4px 12px rgba(96, 165, 250, 0.3);
}

.flight-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.flight-route {
  font-weight: 600;
}

.flight-time {
  color: #9ca3af;
  font-size: 14px;
  margin-bottom: 8px;
}

.flight-details {
  font-size: 12px;
  color: #6b7280;
}
```

---

## Step 3: Weather Alert Component

**File: `src/components/weather/WeatherAlert.tsx`**
```typescript
import React from 'react';
import { Flight } from '../../types';
import './WeatherAlert.css';

export const WeatherAlert: React.FC<{ flight: Flight }> = ({ flight }) => {
  if (flight.safetyStatus === 'safe') return null;

  return (
    <div className={`weather-alert ${flight.safetyStatus}`}>
      <div className="alert-header">
        <span>{flight.safetyStatus === 'dangerous' ? '⚠️' : '⚡'}</span>
        <h4>
          {flight.safetyStatus === 'dangerous' ? 'Flight Not Recommended' : 'Marginal Conditions'}
        </h4>
      </div>
      <p>
        Weather conditions are {flight.safetyStatus === 'dangerous' ? 'unsafe' : 'marginal'} for {flight.trainingLevel} pilots.
      </p>
      <button className="reschedule-btn">Get Reschedule Options</button>
    </div>
  );
};
```

**File: `src/components/weather/WeatherAlert.css`**
```css
.weather-alert {
  margin: 20px;
  padding: 16px;
  border-radius: 12px;
  border-left: 4px solid;
}

.weather-alert.dangerous {
  background: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
}

.weather-alert.marginal {
  background: rgba(245, 158, 11, 0.1);
  border-color: #f59e0b;
}

.alert-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.reschedule-btn {
  width: 100%;
  background: #60a5fa;
  padding: 12px;
  margin-top: 12px;
}
```

---

## Step 4: Update Sidebar with Flight Form

**File: `src/components/layout/Sidebar.tsx`** (Update)
```typescript
import React, { useState } from 'react';
import { User } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useFlights } from '../../hooks/useFlights';
import { FlightCard } from '../flights/FlightCard';
import { FlightForm } from '../flights/FlightForm';
import { WeatherAlert } from '../weather/WeatherAlert';
import './Sidebar.css';

interface SidebarProps {
  user: User;
  selectedFlightId: string | null;
  onSelectFlight: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, selectedFlightId, onSelectFlight }) => {
  const { signOut } = useAuth();
  const { flights, loading } = useFlights(user.uid);
  const [showNewFlightForm, setShowNewFlightForm] = useState(false);

  const selectedFlight = flights.find(f => f.id === selectedFlightId);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div>
          <h3>{user.displayName}</h3>
          <p>{user.trainingLevel}</p>
        </div>
        <button onClick={signOut}>Sign Out</button>
      </div>
      
      <button 
        className="new-flight-btn"
        onClick={() => setShowNewFlightForm(!showNewFlightForm)}
      >
        {showNewFlightForm ? 'Cancel' : '+ New Flight'}
      </button>

      {showNewFlightForm && (
        <FlightForm user={user} onClose={() => setShowNewFlightForm(false)} />
      )}

      {selectedFlight && <WeatherAlert flight={selectedFlight} />}
      
      <div className="flights-section">
        <h4>Your Flights ({flights.length})</h4>
        {loading ? <div>Loading...</div> : 
         flights.length === 0 ? <div className="empty">No flights scheduled</div> :
         flights.map(flight => (
          <FlightCard
            key={flight.id}
            flight={flight}
            isSelected={flight.id === selectedFlightId}
            onSelect={() => onSelectFlight(flight.id)}
          />
        ))}
      </div>
    </aside>
  );
};
```

---

## Step 5: Enhanced Styling

**File: `src/styles/variables.css`**
```css
:root {
  --color-primary: #60a5fa;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-neutral: #9ca3af;
  
  --bg-primary: #0a0a0a;
  --bg-secondary: #1a1a2e;
  --bg-tertiary: #2a2a3e;
  
  --text-primary: #ffffff;
  --text-secondary: #e5e7eb;
  --text-muted: #9ca3af;
}
```

**File: `src/styles/app.css`** (Update)
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
}

.dashboard {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.map-container {
  flex: 1;
  position: relative;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
```

**File: `src/components/layout/Sidebar.css`**
```css
.sidebar {
  width: 350px;
  background: var(--bg-secondary);
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--bg-tertiary);
  overflow: hidden;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid var(--bg-tertiary);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.new-flight-btn {
  margin: 20px;
  padding: 16px;
  background: var(--color-success);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.new-flight-btn:hover {
  background: #059669;
}

.flights-section {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.flights-section h4 {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 16px;
  text-transform: uppercase;
}

.empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
}
```

---

## Step 6: Vite Config for Cesium

**File: `vite.config.ts`** (Update)
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    CESIUM_BASE_URL: JSON.stringify('/cesium')
  },
  optimizeDeps: {
    exclude: ['cesium']
  }
});
```

---

## Checklist

- [ ] Cesium map renders
- [ ] Flight paths display on globe
- [ ] Colors match safety status
- [ ] Click flight zooms to location
- [ ] Flight cards show status icons
- [ ] Weather alerts display
- [ ] Flight form integrated
- [ ] Styling polished
- [ ] No console errors

---

## Optional: Animation (Advanced)

If you want animated flight playback, add:

**File: `src/components/map/AnimatedFlight.tsx`**
```typescript
import React from 'react';
import { Entity } from 'resium';
import { SampledPositionProperty, JulianDate, Cartesian3, VelocityOrientationProperty } from 'cesium';
import { Flight } from '../../types';

export const AnimatedFlight: React.FC<{ flight: Flight; viewer: any }> = ({ flight, viewer }) => {
  const positionProperty = new SampledPositionProperty();
  
  flight.path.waypoints.forEach(waypoint => {
    const time = JulianDate.fromDate(new Date(waypoint.time));
    const position = Cartesian3.fromDegrees(waypoint.lon, waypoint.lat, waypoint.altitude);
    positionProperty.addSample(time, position);
  });

  if (viewer) {
    const startTime = JulianDate.fromDate(new Date(flight.scheduledTime));
    viewer.clock.startTime = startTime.clone();
    viewer.clock.stopTime = JulianDate.addSeconds(startTime, flight.path.estimatedDuration * 60, new JulianDate());
    viewer.clock.currentTime = startTime.clone();
  }

  return (
    <Entity
      position={positionProperty}
      orientation={new VelocityOrientationProperty(positionProperty)}
      model={{
        uri: '/assets/airplane.glb',
        minimumPixelSize: 64
      }}
    />
  );
};
```

---

**Next:** Test everything and deploy!

