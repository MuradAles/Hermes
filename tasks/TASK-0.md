# Task 0: Project Setup

**Duration:** 1-2 hours

## Objective
Set up the project structure, install dependencies, configure Firebase, and define TypeScript types.

---

## Step 1: Initialize Project

```bash
# Create React + TypeScript project
npm create vite@latest flight-scheduler -- --template react-ts
cd flight-scheduler

# Install dependencies
npm install
npm install firebase openai cesium resium
npm install -D @types/node
```

**Verify:** Run `npm run dev` - should start successfully

---

## Step 2: Create Folder Structure

Create this structure:

```
src/
├── components/
│   ├── ui/          # Button, Card, Input, Badge, Alert, Spinner
│   ├── auth/        # Login, Register
│   ├── map/         # CesiumMap, FlightPath, PlaybackControls
│   ├── flights/     # FlightForm, FlightList, FlightCard
│   ├── weather/     # WeatherAlert, WeatherReport
│   └── layout/      # Sidebar, Dashboard
├── services/        # firebase.ts, weatherService.ts, aiService.ts, flightService.ts
├── hooks/           # useAuth.ts, useFlights.ts
├── types/           # User.ts, Flight.ts, Weather.ts, Airport.ts, index.ts
├── utils/           # calculations.ts, weatherLogic.ts
└── styles/          # variables.css, global.css
```

---

## Step 3: Environment Variables

**File: `.env.local`** (already created by you)
```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_CESIUM_ION_TOKEN=...
```

**File: `.gitignore`**
```
.env.local
.env
node_modules/
dist/
.firebase/
```

---

## Step 4: Firebase Setup

✅ **Already Done:**
- Firebase project created
- Authentication enabled
- Firestore database created

**Still Needed:**
- Initialize Firebase in project

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and initialize
firebase login
firebase init

# Select:
# - Firestore
# - Functions (TypeScript)
# - Hosting
```

---

## Step 5: TypeScript Types

**File: `src/types/User.ts`**
```typescript
export type TrainingLevel = 'student-pilot' | 'private-pilot' | 'instrument-rated';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  trainingLevel: TrainingLevel;
  createdAt: Date;
  lastLogin: Date;
}
```

**File: `src/types/Flight.ts`**
```typescript
import { Location } from './Airport';
import { TrainingLevel } from './User';

export interface Waypoint {
  lat: number;
  lon: number;
  altitude: number;
  time: Date;
  distanceFromStart: number;
}

export interface FlightPath {
  waypoints: Waypoint[];
  totalDistance: number;
  estimatedDuration: number;
}

export interface Flight {
  id: string;
  userId: string;
  departure: Location;
  arrival: Location;
  scheduledTime: Date;
  studentName: string;
  trainingLevel: TrainingLevel;
  path: FlightPath;
  safetyStatus: 'safe' | 'marginal' | 'dangerous';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}
```

**File: `src/types/Weather.ts`**
```typescript
export interface WeatherConditions {
  temperature: number;
  cloudCoverage: number;
  ceiling: number;
  visibility: number;
  windSpeed: number;
  windDirection: number;
  description: string;
  timestamp: Date;
}

export interface WeatherCheckpoint {
  location: { lat: number; lon: number };
  time: Date;
  weather: WeatherConditions;
  safetyStatus: 'safe' | 'marginal' | 'dangerous';
  safetyScore: number;
}
```

**File: `src/types/Airport.ts`**
```typescript
export interface Location {
  lat: number;
  lon: number;
  name?: string;
}
```

**File: `src/types/index.ts`**
```typescript
export * from './User';
export * from './Flight';
export * from './Weather';
export * from './Airport';
```

---

## Checklist

- [ ] Project initialized with Vite
- [ ] Dependencies installed
- [ ] Folder structure created
- [ ] Environment variables set
- [ ] Firebase initialized
- [ ] TypeScript types defined
- [ ] `npm run dev` works

---

**Next:** Move to TASK-1.md for Core Infrastructure

