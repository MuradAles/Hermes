# TASKS.md - Implementation Guide

**This file has been split into 4 separate task files for easier navigation:**

1. **[TASK-0.md](./TASK-0.md)** - Project Setup (1-2 hours)
2. **[TASK-1.md](./TASK-1.md)** - Core Infrastructure (6-8 hours)
3. **[TASK-2.md](./TASK-2.md)** - Weather & AI Integration (6-8 hours)
4. **[TASK-3.md](./TASK-3.md)** - 3D Visualization & Polish (6-8 hours)

**Start with TASK-0.md and work through each file sequentially.**

---

## Quick Reference

### Project Duration: 3-5 days
### Difficulty Level: Intermediate to Advanced
### Prerequisites: React, TypeScript, API integration experience

---

## Phase 0: Project Setup (1-2 hours)

### Task 0.1: Initialize Project Structure

**Objective:** Set up React + TypeScript project with Vite

```bash
# Create project
npm create vite@latest flight-scheduler -- --template react-ts

# Navigate to project
cd flight-scheduler

# Install core dependencies
npm install

# Install project dependencies
npm install firebase openai cesium resium

# Install dev dependencies
npm install -D @types/node
```

**Files Created:**
- `package.json`
- `tsconfig.json`
- `vite.config.ts`
- `index.html`
- `src/main.tsx`
- `src/App.tsx`

**Verification:** Run `npm run dev` and see Vite dev server start successfully

---

### Task 0.2: Project Folder Structure

**Objective:** Organize code into logical folders

**Create the following structure:**

```
flight-scheduler/
├── src/
│   ├── components/
│   │   ├── ui/                          # ✨ REUSABLE UI COMPONENTS
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Button.css
│   │   │   │   └── index.ts
│   │   │   ├── Card/
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Card.css
│   │   │   │   └── index.ts
│   │   │   ├── Input/
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Input.css
│   │   │   │   └── index.ts
│   │   │   ├── Select/
│   │   │   │   ├── Select.tsx
│   │   │   │   ├── Select.css
│   │   │   │   └── index.ts
│   │   │   ├── Badge/
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Badge.css
│   │   │   │   └── index.ts
│   │   │   ├── Alert/
│   │   │   │   ├── Alert.tsx
│   │   │   │   ├── Alert.css
│   │   │   │   └── index.ts
│   │   │   ├── Spinner/
│   │   │   │   ├── Spinner.tsx
│   │   │   │   ├── Spinner.css
│   │   │   │   └── index.ts
│   │   │   └── index.ts              # Export all UI components
│   │   │
│   │   ├── auth/
│   │   │   ├── Login.tsx
│   │   │   ├── Login.css
│   │   │   ├── Register.tsx
│   │   │   └── Register.css
│   │   ├── map/
│   │   │   ├── CesiumMap.tsx
│   │   │   ├── FlightPath.tsx
│   │   │   ├── WeatherOverlay.tsx
│   │   │   └── PlaybackControls.tsx
│   │   ├── flights/
│   │   │   ├── FlightForm.tsx
│   │   │   ├── FlightList.tsx
│   │   │   ├── FlightCard.tsx
│   │   │   └── FlightDetails.tsx
│   │   ├── weather/
│   │   │   ├── WeatherReport.tsx
│   │   │   ├── WeatherAlert.tsx
│   │   │   └── SafetyIndicator.tsx
│   │   └── layout/
│   │       ├── Sidebar.tsx
│   │       ├── Header.tsx
│   │       └── Dashboard.tsx
│   │
│   ├── services/             # API & business logic
│   │   ├── firebase.ts
│   │   ├── weatherService.ts
│   │   ├── aiService.ts
│   │   ├── flightService.ts
│   │   └── cesiumService.ts
│   │
│   ├── hooks/                # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useFlights.ts
│   │   ├── useWeather.ts
│   │   └── useCesium.ts
│   │
│   ├── types/                # TypeScript interfaces
│   │   ├── User.ts
│   │   ├── Flight.ts
│   │   ├── Weather.ts
│   │   ├── Airport.ts
│   │   └── index.ts
│   │
│   ├── utils/                # Helper functions
│   │   ├── calculations.ts   # Flight path math
│   │   ├── weatherLogic.ts   # Safety rules
│   │   ├── dateUtils.ts
│   │   └── constants.ts
│   │
│   ├── styles/               # CSS files
│   │   ├── variables.css            # ⭐ COLOR CONSTANTS (5 colors)
│   │   ├── global.css               # Global resets
│   │   └── themes.css               # Theme definitions
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── functions/                # Firebase Functions
│   ├── src/
│   │   ├── index.ts
│   │   ├── weatherAPI.ts
│   │   └── openaiAPI.ts
│   └── package.json
│
├── public/
│   └── assets/
│       └── airplane.glb      # 3D plane model
│
├── .env.local                # Environment variables (gitignored)
├── .env.template             # Template for .env
├── .gitignore
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
└── README.md
```

**Action Items:**
- [ ] Create all folders
- [ ] Create empty TypeScript files for each component/service
- [ ] Add placeholder comments in each file

**Verification:** Project structure matches above

---

### Task 0.3: Environment Variables Setup

**Objective:** Configure API keys and Firebase config

**Create `.env.local`:**

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your_app_id

# Cesium Ion (optional - for premium features)
VITE_CESIUM_ION_TOKEN=your_cesium_token

# Note: OpenWeatherMap and OpenAI keys will be in Firebase Functions
# DO NOT put them in frontend environment variables
```

**Create `.env.template`:**

```bash
# Copy this file to .env.local and fill in your values

# Firebase Configuration
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Cesium Ion Token (optional)
VITE_CESIUM_ION_TOKEN=
```

**Update `.gitignore`:**

```
# Environment variables
.env.local
.env

# Firebase
.firebase/
firebase-debug.log
firestore-debug.log

# Build
dist/
build/

# Dependencies
node_modules/

# IDE
.vscode/
.idea/
```

**Action Items:**
- [ ] Create `.env.local` with your actual keys
- [ ] Create `.env.template` for documentation
- [ ] Update `.gitignore`
- [ ] Verify `.env.local` is gitignored

---

### Task 0.4: Firebase Project Setup

**Objective:** Initialize Firebase project and configure services

**Steps:**

1. **Create Firebase Project:**
   - Go to https://console.firebase.google.com/
   - Click "Add Project"
   - Name: "flight-scheduler-pro"
   - Disable Google Analytics (optional)
   - Create project

2. **Enable Authentication:**
   - Go to Authentication → Get Started
   - Enable Email/Password
   - Enable Google Sign-in
   - Add authorized domain (localhost for dev)

3. **Create Firestore Database:**
   - Go to Firestore Database → Create Database
   - Start in **Production Mode**
   - Choose location (us-central1 recommended)
   - Click Enable

4. **Set up Firestore Rules:**

Create `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Flights collection - users can only access their own flights
    match /flights/{flightId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
    
    // Weather logs - read-only for users, write from functions
    match /weatherLogs/{logId} {
      allow read: if request.auth != null;
      allow write: if false; // Only Cloud Functions can write
    }
    
    // Reschedule history
    match /rescheduleHistory/{historyId} {
      allow read: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
  }
}
```

5. **Initialize Firebase CLI:**

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in project
firebase init

# Select:
# - Firestore
# - Functions (TypeScript)
# - Hosting
# - Emulators (optional for local testing)

# Use existing project: flight-scheduler-pro
```

6. **Configure Firebase Functions:**

Navigate to `functions/` folder:

```bash
cd functions
npm install openai axios
cd ..
```

**Action Items:**
- [ ] Firebase project created
- [ ] Authentication enabled (Email + Google)
- [ ] Firestore database created
- [ ] Firestore rules configured
- [ ] Firebase CLI initialized
- [ ] Functions dependencies installed

---

### Task 0.5: TypeScript Types Definition

**Objective:** Define all TypeScript interfaces

**File: `src/types/User.ts`**

```typescript
export type TrainingLevel = 'student-pilot' | 'private-pilot' | 'instrument-rated';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  trainingLevel: TrainingLevel;
  createdAt: Date;
  lastLogin: Date;
}
```

**File: `src/types/Airport.ts`**

```typescript
export interface Airport {
  code: string;      // e.g., "ORD", "JFK"
  name: string;      // e.g., "Chicago O'Hare International"
  city: string;
  country: string;
  lat: number;
  lon: number;
  elevation?: number; // feet
}

export interface Location {
  lat: number;
  lon: number;
  name?: string;
}
```

**File: `src/types/Weather.ts`**

```typescript
export interface WeatherConditions {
  temperature: number;        // Fahrenheit
  cloudCoverage: number;     // Percentage (0-100)
  ceiling: number;           // Feet AGL
  visibility: number;        // Miles
  windSpeed: number;         // Knots
  windDirection: number;     // Degrees
  precipitation: number;     // mm/hour
  description: string;       // e.g., "Clear skies"
  icon: string;             // Weather icon code
  timestamp: Date;
}

export interface WeatherCheckpoint {
  location: Location;
  time: Date;
  weather: WeatherConditions;
  safetyStatus: 'safe' | 'marginal' | 'dangerous';
  safetyScore: number;       // 0-100
  reason?: string;           // If unsafe, why?
}

export type SafetyStatus = 'safe' | 'marginal' | 'dangerous';

export interface WeatherReport {
  flightId: string;
  overallSafety: SafetyStatus;
  overallScore: number;
  checkpoints: WeatherCheckpoint[];
  dangerousSegments: DangerousSegment[];
  recommendations: string[];
  generatedAt: Date;
}

export interface DangerousSegment {
  fromLocation: Location;
  toLocation: Location;
  timeRange: {
    start: Date;
    end: Date;
  };
  reason: string;
  severity: 'moderate' | 'severe' | 'extreme';
}
```

**File: `src/types/Flight.ts`**

```typescript
import { Location } from './Airport';
import { WeatherReport } from './Weather';
import { TrainingLevel } from './User';

export interface Waypoint {
  lat: number;
  lon: number;
  altitude: number;      // Feet
  time: Date;           // ETA at this waypoint
  distanceFromStart: number; // Nautical miles
}

export interface FlightPath {
  waypoints: Waypoint[];
  totalDistance: number;    // Nautical miles
  estimatedDuration: number; // Minutes
}

export type FlightStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

export interface Flight {
  id: string;
  userId: string;
  
  // Flight details
  departure: Location;
  arrival: Location;
  scheduledTime: Date;
  
  // Student info
  studentName: string;
  trainingLevel: TrainingLevel;
  
  // Flight planning
  path: FlightPath;
  
  // Weather & safety
  weatherReport?: WeatherReport;
  lastWeatherCheck?: Date;
  safetyStatus: SafetyStatus;
  
  // Metadata
  status: FlightStatus;
  createdAt: Date;
  updatedAt: Date;
  
  // Optional
  aircraftType?: string;
  instructorName?: string;
  notes?: string;
}

export interface RescheduleOption {
  newTime: Date;
  reasoning: string;
  expectedWeather: string;
  safetyImprovement: string;
  confidence: number;  // 0-100
}

export interface RescheduleHistory {
  id: string;
  flightId: string;
  userId: string;
  originalTime: Date;
  newTime: Date;
  reason: string;
  aiSuggestions: RescheduleOption[];
  selectedOption?: RescheduleOption;
  timestamp: Date;
}
```

**File: `src/types/index.ts`**

```typescript
// Re-export all types
export * from './User';
export * from './Airport';
export * from './Weather';
export * from './Flight';
```

**Action Items:**
- [ ] All type files created
- [ ] Types are properly exported
- [ ] No TypeScript errors
- [ ] Types imported successfully in other files

---

## Day 1: Core Infrastructure & Foundation (8 hours)

### Task 1.0: Setup UI Components Library (1 hour) ⭐

**Objective:** Create reusable UI component library with design system

**IMPORTANT:** Do this FIRST before any other components!

**Step 1: Create Color Constants**

**File: `src/styles/variables.css`**

```css
/* ===== 5 PRIMARY COLORS ===== */
:root {
  /* 1. Primary Blue - Main actions */
  --color-primary: #60a5fa;
  --color-primary-hover: #3b82f6;
  --color-primary-light: rgba(96, 165, 250, 0.1);
  
  /* 2. Success Green - Safe status */
  --color-success: #10b981;
  --color-success-hover: #059669;
  --color-success-light: rgba(16, 185, 129, 0.1);
  
  /* 3. Warning Yellow - Marginal status */
  --color-warning: #f59e0b;
  --color-warning-hover: #d97706;
  --color-warning-light: rgba(245, 158, 11, 0.1);
  
  /* 4. Danger Red - Unsafe status */
  --color-danger: #ef4444;
  --color-danger-hover: #dc2626;
  --color-danger-light: rgba(239, 68, 68, 0.1);
  
  /* 5. Neutral Gray - Text, borders */
  --color-neutral: #9ca3af;
  
  /* Background colors */
  --bg-primary: #0a0a0a;
  --bg-secondary: #1a1a2e;
  --bg-tertiary: #2a2a3e;
  --bg-hover: #3a3a4e;
  
  /* Text colors */
  --text-primary: #ffffff;
  --text-secondary: #e5e7eb;
  --text-muted: #9ca3af;
  
  /* Spacing */
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  
  /* Border radius */
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;
  
  /* Transitions */
  --transition-base: 0.2s ease;
}
```

**Step 2: Create Reusable Components**

See `UI_STRUCTURE.md` for complete code of all components:
- Button (with variants: primary, secondary, danger, success, ghost)
- Card (with hover and selection states)
- Input (with labels and icons)
- Badge (for status indicators)
- Alert (for notifications)
- Spinner (for loading states)

**Step 3: Create index.ts for exports**

**File: `src/components/ui/index.ts`**

```typescript
export * from './Button';
export * from './Card';
export * from './Input';
export * from './Badge';
export * from './Alert';
export * from './Spinner';
```

**Action Items:**
- [ ] All UI components created
- [ ] CSS variables defined
- [ ] Components export from single entry point
- [ ] Test each component renders

**Usage Example:**
```typescript
import { Button, Card, Badge } from '@/components/ui';

<Button variant="primary" size="md">Click Me</Button>
<Card hoverable><p>Content</p></Card>
<Badge variant="success">Safe</Badge>
```

---

### Task 1.1: Firebase Service Setup (1 hour)

**Objective:** Initialize Firebase and create authentication service

**File: `src/services/firebase.ts`**

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
```

**Action Items:**
- [ ] Firebase initialized
- [ ] Auth service exported
- [ ] Firestore exported
- [ ] Google provider configured
- [ ] No console errors

**Testing:** Import in App.tsx and log `auth` and `db` to verify initialization

---

### Task 1.2: Authentication Components (2 hours)

**Objective:** Build login and registration UI

**File: `src/hooks/useAuth.ts`**

```typescript
import { useState, useEffect } from 'react';
import { 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../services/firebase';
import { User, TrainingLevel } from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data() as User);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    // Update last login
    await setDoc(doc(db, 'users', result.user.uid), {
      lastLogin: new Date()
    }, { merge: true });
  };

  const signUp = async (
    email: string, 
    password: string, 
    displayName: string,
    trainingLevel: TrainingLevel
  ) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create user document in Firestore
    const userData: User = {
      uid: result.user.uid,
      email,
      displayName,
      trainingLevel,
      createdAt: new Date(),
      lastLogin: new Date()
    };
    
    await setDoc(doc(db, 'users', result.user.uid), userData);
    setUser(userData);
  };

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    
    // Check if user document exists
    const userDoc = await getDoc(doc(db, 'users', result.user.uid));
    
    if (!userDoc.exists()) {
      // New user - need to set training level
      return { newUser: true, firebaseUser: result.user };
    }
    
    return { newUser: false, firebaseUser: result.user };
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut
  };
};
```

**File: `src/components/auth/Login.tsx`**

```typescript
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  
  const { signIn, signInWithGoogle } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithGoogle();
      if (result.newUser) {
        // Redirect to training level selection
        // (Handle this in parent component)
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Flight Schedule Pro</h1>
        <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          <button type="submit">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
        
        <div className="divider">OR</div>
        
        <button onClick={handleGoogleSignIn} className="google-button">
          🔗 Continue with Google
        </button>
        
        <p className="toggle-text">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Sign Up' : 'Sign In'}
          </span>
        </p>
      </div>
    </div>
  );
};
```

**File: `src/styles/app.css`** (Basic styles)

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  background: #0a0a0a;
  color: #ffffff;
}

.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%);
}

.login-card {
  background: #1e1e2e;
  padding: 40px;
  border-radius: 16px;
  width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.login-card h1 {
  font-size: 24px;
  margin-bottom: 8px;
  color: #60a5fa;
}

.login-card h2 {
  font-size: 18px;
  margin-bottom: 24px;
  color: #9ca3af;
}

.error-message {
  background: #ef4444;
  color: white;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
}

form input {
  width: 100%;
  padding: 12px;
  margin-bottom: 16px;
  background: #2a2a3e;
  border: 1px solid #3a3a4e;
  border-radius: 8px;
  color: white;
  font-size: 14px;
}

form input:focus {
  outline: none;
  border-color: #60a5fa;
}

button {
  width: 100%;
  padding: 12px;
  background: #60a5fa;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover {
  background: #3b82f6;
}

.google-button {
  background: #ffffff;
  color: #1a1a2e;
  margin-top: 12px;
}

.google-button:hover {
  background: #f3f4f6;
}

.divider {
  text-align: center;
  margin: 20px 0;
  color: #6b7280;
  font-size: 12px;
}

.toggle-text {
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: #9ca3af;
}

.toggle-text span {
  color: #60a5fa;
  cursor: pointer;
  text-decoration: underline;
}
```

**Action Items:**
- [ ] useAuth hook created
- [ ] Login component created
- [ ] Basic styling applied
- [ ] Email/password login works
- [ ] Google sign-in works
- [ ] Error messages display

**Testing:**
- Try logging in with test credentials
- Try Google sign-in
- Verify Firebase console shows new user

---

### Task 1.3: App Layout & Routing (1 hour)

**Objective:** Create main app structure with conditional rendering

**File: `src/App.tsx`**

```typescript
import React from 'react';
import { useAuth } from './hooks/useAuth';
import { Login } from './components/auth/Login';
import { Dashboard } from './components/layout/Dashboard';
import './styles/app.css';

const App: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <Dashboard user={user} />;
};

export default App;
```

**File: `src/components/layout/Dashboard.tsx`**

```typescript
import React, { useState } from 'react';
import { User } from '../../types';
import { Sidebar } from './Sidebar';
import { CesiumMap } from '../map/CesiumMap';
import '../../styles/dashboard.css';

interface DashboardProps {
  user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);

  return (
    <div className="dashboard">
      <Sidebar 
        user={user}
        selectedFlightId={selectedFlightId}
        onSelectFlight={setSelectedFlightId}
      />
      
      <div className="map-container">
        <CesiumMap selectedFlightId={selectedFlightId} />
      </div>
    </div>
  );
};
```

**File: `src/styles/dashboard.css`**

```css
.dashboard {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.map-container {
  flex: 1;
  position: relative;
}

.loading-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #0a0a0a;
}

.spinner {
  border: 4px solid #2a2a3e;
  border-top: 4px solid #60a5fa;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

**Action Items:**
- [ ] App.tsx handles auth state
- [ ] Dashboard layout created
- [ ] Loading screen displays
- [ ] Auth flow works correctly

---

### Task 1.4: Sidebar Component (2 hours)

**Objective:** Build flight list sidebar with user info

**File: `src/components/layout/Sidebar.tsx`**

```typescript
import React, { useState } from 'react';
import { User, Flight } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useFlights } from '../../hooks/useFlights';
import { FlightCard } from '../flights/FlightCard';
import { FlightForm } from '../flights/FlightForm';
import '../../styles/sidebar.css';

interface SidebarProps {
  user: User;
  selectedFlightId: string | null;
  onSelectFlight: (flightId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  user, 
  selectedFlightId, 
  onSelectFlight 
}) => {
  const [showNewFlightForm, setShowNewFlightForm] = useState(false);
  const { signOut } = useAuth();
  const { flights, loading } = useFlights(user.uid);

  return (
    <aside className="sidebar">
      {/* User Header */}
      <div className="sidebar-header">
        <div className="user-info">
          <h3>{user.displayName}</h3>
          <p className="training-level">{user.trainingLevel}</p>
        </div>
        <button onClick={signOut} className="sign-out-btn">
          Sign Out
        </button>
      </div>

      {/* New Flight Button */}
      <button 
        className="new-flight-btn"
        onClick={() => setShowNewFlightForm(!showNewFlightForm)}
      >
        ✈️ {showNewFlightForm ? 'Cancel' : 'New Flight'}
      </button>

      {/* New Flight Form */}
      {showNewFlightForm && (
        <FlightForm 
          user={user}
          onClose={() => setShowNewFlightForm(false)}
        />
      )}

      {/* Flights List */}
      <div className="flights-section">
        <h4>Your Flights ({flights.length})</h4>
        
        {loading ? (
          <div className="loading">Loading flights...</div>
        ) : flights.length === 0 ? (
          <div className="empty-state">
            <p>No flights scheduled</p>
            <p>Create your first flight!</p>
          </div>
        ) : (
          <div className="flights-list">
            {flights.map(flight => (
              <FlightCard
                key={flight.id}
                flight={flight}
                isSelected={flight.id === selectedFlightId}
                onSelect={() => onSelectFlight(flight.id)}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
```

**File: `src/styles/sidebar.css`**

```css
.sidebar {
  width: 350px;
  background: #1a1a2e;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #2a2a3e;
  overflow: hidden;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #2a2a3e;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-info h3 {
  font-size: 16px;
  margin-bottom: 4px;
}

.training-level {
  font-size: 12px;
  color: #9ca3af;
  text-transform: capitalize;
}

.sign-out-btn {
  padding: 8px 16px;
  background: #2a2a3e;
  color: #9ca3af;
  font-size: 12px;
}

.new-flight-btn {
  margin: 20px;
  padding: 16px;
  background: #10b981;
  font-size: 16px;
  font-weight: 600;
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
  color: #9ca3af;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.flights-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.empty-state p:first-child {
  font-size: 16px;
  margin-bottom: 8px;
}

.empty-state p:last-child {
  font-size: 14px;
}

/* Scrollbar styling */
.flights-section::-webkit-scrollbar {
  width: 6px;
}

.flights-section::-webkit-scrollbar-track {
  background: #1a1a2e;
}

.flights-section::-webkit-scrollbar-thumb {
  background: #3a3a4e;
  border-radius: 3px;
}
```

**Action Items:**
- [ ] Sidebar component created
- [ ] User info displays
- [ ] Sign out button works
- [ ] New flight button toggles form
- [ ] Styling applied

---

### Task 1.5: Flight Hooks & Service (2 hours)

**Objective:** Create hooks for flight data management

**File: `src/services/flightService.ts`**

```typescript
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { Flight } from '../types';

export const flightService = {
  // Create new flight
  async createFlight(flightData: Omit<Flight, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'flights'), {
      ...flightData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  },

  // Update flight
  async updateFlight(flightId: string, updates: Partial<Flight>): Promise<void> {
    await updateDoc(doc(db, 'flights', flightId), {
      ...updates,
      updatedAt: Timestamp.now()
    });
  },

  // Delete flight
  async deleteFlight(flightId: string): Promise<void> {
    await deleteDoc(doc(db, 'flights', flightId));
  },

  // Subscribe to user's flights
  subscribeToUserFlights(
    userId: string, 
    callback: (flights: Flight[]) => void
  ) {
    const q = query(
      collection(db, 'flights'),
      where('userId', '==', userId),
      orderBy('scheduledTime', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const flights = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Flight[];
      callback(flights);
    });
  }
};
```

**File: `src/hooks/useFlights.ts`**

```typescript
import { useState, useEffect } from 'react';
import { Flight } from '../types';
import { flightService } from '../services/flightService';

export const useFlights = (userId: string) => {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    
    const unsubscribe = flightService.subscribeToUserFlights(
      userId,
      (updatedFlights) => {
        setFlights(updatedFlights);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const createFlight = async (flightData: Omit<Flight, 'id'>) => {
    try {
      const flightId = await flightService.createFlight(flightData);
      return flightId;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateFlight = async (flightId: string, updates: Partial<Flight>) => {
    try {
      await flightService.updateFlight(flightId, updates);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const deleteFlight = async (flightId: string) => {
    try {
      await flightService.deleteFlight(flightId);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    flights,
    loading,
    error,
    createFlight,
    updateFlight,
    deleteFlight
  };
};
```

**Action Items:**
- [ ] Flight service created
- [ ] useFlights hook created
- [ ] Real-time updates work
- [ ] CRUD operations functional

---

## Day 2: Weather & AI Integration (8 hours)

### Task 2.1: Firebase Functions Setup (1 hour)

**Objective:** Set up serverless functions for API calls

**File: `functions/src/index.ts`**

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import OpenAI from 'openai';

admin.initializeApp();

const OPENWEATHER_API_KEY = functions.config().openweather.key;
const OPENAI_API_KEY = functions.config().openai.key;

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});

// Fetch weather data
export const getWeather = functions.https.onCall(async (data, context) => {
  const { lat, lon } = data;
  
  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather`,
      {
        params: {
          lat,
          lon,
          appid: OPENWEATHER_API_KEY,
          units: 'imperial'
        }
      }
    );
    
    return response.data;
  } catch (error: any) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Generate AI rescheduling suggestions
export const generateReschedule = functions.https.onCall(async (data, context) => {
  const { weatherData, trainingLevel, originalTime } = data;
  
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a flight scheduling assistant. Generate 3 alternative flight times based on weather conditions and pilot training level. Return JSON format only.`
        },
        {
          role: 'user',
          content: `Weather conditions: ${JSON.stringify(weatherData)}
          Training level: ${trainingLevel}
          Original time: ${originalTime}
          
          Provide 3 alternative times with reasoning.`
        }
      ],
      temperature: 0.7
    });
    
    return JSON.parse(completion.choices[0].message.content || '{}');
  } catch (error: any) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

**Configure Firebase Functions:**

```bash
# Set API keys
firebase functions:config:set openweather.key="YOUR_OPENWEATHER_KEY"
firebase functions:config:set openai.key="YOUR_OPENAI_KEY"

# Deploy functions
firebase deploy --only functions
```

**Action Items:**
- [ ] Functions code written
- [ ] API keys configured
- [ ] Functions deployed
- [ ] Test function calls work

---

### Task 2.2: Weather Service (2 hours)

**Objective:** Create weather checking service with safety logic

**File: `src/services/weatherService.ts`**

```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { 
  WeatherConditions, 
  WeatherCheckpoint, 
  SafetyStatus,
  TrainingLevel 
} from '../types';

const getWeatherFunction = httpsCallable(functions, 'getWeather');

// Weather minimums by training level
const WEATHER_MINIMUMS = {
  'student-pilot': {
    visibility: 5,      // miles
    ceiling: 3000,      // feet
    windSpeed: 10,      // knots
    requiresClearSkies: true
  },
  'private-pilot': {
    visibility: 3,
    ceiling: 1000,
    windSpeed: 20,
    requiresClearSkies: false
  },
  'instrument-rated': {
    visibility: 0,      // IMC acceptable
    ceiling: 0,
    windSpeed: 35,
    requiresClearSkies: false,
    noThunderstorms: true
  }
};

export const weatherService = {
  // Fetch weather for a location
  async getWeatherAtLocation(lat: number, lon: number): Promise<WeatherConditions> {
    try {
      const result = await getWeatherFunction({ lat, lon });
      const data = result.data as any;
      
      return {
        temperature: data.main.temp,
        cloudCoverage: data.clouds.all,
        ceiling: this.estimateCeiling(data.clouds.all),
        visibility: data.visibility / 1609, // meters to miles
        windSpeed: data.wind.speed * 0.868976, // mph to knots
        windDirection: data.wind.deg,
        precipitation: data.rain?.['1h'] || 0,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        timestamp: new Date(data.dt * 1000)
      };
    } catch (error) {
      console.error('Weather fetch error:', error);
      throw error;
    }
  },

  // Estimate ceiling from cloud coverage
  estimateCeiling(cloudCoverage: number): number {
    if (cloudCoverage < 10) return 10000;
    if (cloudCoverage < 30) return 5000;
    if (cloudCoverage < 60) return 3000;
    if (cloudCoverage < 80) return 1500;
    return 500;
  },

  // Check if weather is safe for training level
  assessSafety(
    weather: WeatherConditions,
    trainingLevel: TrainingLevel
  ): { status: SafetyStatus; score: number; reason?: string } {
    const minimums = WEATHER_MINIMUMS[trainingLevel];
    const issues: string[] = [];
    let score = 100;

    // Check visibility
    if (weather.visibility < minimums.visibility) {
      issues.push(`Low visibility: ${weather.visibility.toFixed(1)} mi (need ${minimums.visibility} mi)`);
      score -= 30;
    }

    // Check ceiling
    if (weather.ceiling < minimums.ceiling) {
      issues.push(`Low ceiling: ${weather.ceiling} ft (need ${minimums.ceiling} ft)`);
      score -= 25;
    }

    // Check wind speed
    if (weather.windSpeed > minimums.windSpeed) {
      issues.push(`High winds: ${weather.windSpeed.toFixed(0)} kt (max ${minimums.windSpeed} kt)`);
      score -= 20;
    }

    // Check for thunderstorms (all levels)
    if (weather.description.includes('thunder')) {
      issues.push('Thunderstorms present');
      score -= 50;
    }

    // Student pilot: needs clear skies
    if (minimums.requiresClearSkies && weather.cloudCoverage > 25) {
      issues.push(`Too many clouds: ${weather.cloudCoverage}% (need clear skies)`);
      score -= 15;
    }

    // Determine status
    let status: SafetyStatus;
    if (score >= 80) status = 'safe';
    else if (score >= 50) status = 'marginal';
    else status = 'dangerous';

    return {
      status,
      score: Math.max(0, score),
      reason: issues.length > 0 ? issues.join('; ') : undefined
    };
  },

  // Check weather along entire flight path
  async checkFlightPath(
    waypoints: { lat: number; lon: number; time: Date }[],
    trainingLevel: TrainingLevel
  ): Promise<WeatherCheckpoint[]> {
    const checkpoints: WeatherCheckpoint[] = [];

    for (const waypoint of waypoints) {
      const weather = await this.getWeatherAtLocation(waypoint.lat, waypoint.lon);
      const safety = this.assessSafety(weather, trainingLevel);

      checkpoints.push({
        location: {
          lat: waypoint.lat,
          lon: waypoint.lon
        },
        time: waypoint.time,
        weather,
        safetyStatus: safety.status,
        safetyScore: safety.score,
        reason: safety.reason
      });

      // Rate limiting - wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return checkpoints;
  }
};
```

**Action Items:**
- [ ] Weather service created
- [ ] Safety logic implemented
- [ ] Training level rules applied
- [ ] Weather fetching works

**Testing:** Call weatherService.getWeatherAtLocation with test coordinates

---

### Task 2.3: Flight Path Calculations (2 hours)

**Objective:** Calculate great circle routes and waypoints

**File: `src/utils/calculations.ts`**

```typescript
import { Waypoint, Location } from '../types';

export const calculations = {
  // Convert degrees to radians
  toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  },

  // Convert radians to degrees
  toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  },

  // Calculate distance between two points (Haversine formula)
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3440.065; // Earth radius in nautical miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
      Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  // Calculate bearing between two points
  calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLon = this.toRadians(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(this.toRadians(lat2));
    const x =
      Math.cos(this.toRadians(lat1)) * Math.sin(this.toRadians(lat2)) -
      Math.sin(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * Math.cos(dLon);

    const bearing = this.toDegrees(Math.atan2(y, x));
    return (bearing + 360) % 360;
  },

  // Calculate intermediate point along great circle
  intermediatePoint(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    fraction: number
  ): { lat: number; lon: number } {
    const φ1 = this.toRadians(lat1);
    const λ1 = this.toRadians(lon1);
    const φ2 = this.toRadians(lat2);
    const λ2 = this.toRadians(lon2);

    const δ = 2 * Math.asin(
      Math.sqrt(
        Math.sin((φ2 - φ1) / 2) ** 2 +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2
      )
    );

    const a = Math.sin((1 - fraction) * δ) / Math.sin(δ);
    const b = Math.sin(fraction * δ) / Math.sin(δ);

    const x = a * Math.cos(φ1) * Math.cos(λ1) + b * Math.cos(φ2) * Math.cos(λ2);
    const y = a * Math.cos(φ1) * Math.sin(λ1) + b * Math.cos(φ2) * Math.sin(λ2);
    const z = a * Math.sin(φ1) + b * Math.sin(φ2);

    const φ3 = Math.atan2(z, Math.sqrt(x ** 2 + y ** 2));
    const λ3 = Math.atan2(y, x);

    return {
      lat: this.toDegrees(φ3),
      lon: this.toDegrees(λ3)
    };
  },

  // Generate waypoints along flight path
  generateWaypoints(
    departure: Location,
    arrival: Location,
    spacingNM: number = 50,
    cruiseAltitude: number = 5000
  ): Waypoint[] {
    const totalDistance = this.calculateDistance(
      departure.lat,
      departure.lon,
      arrival.lat,
      arrival.lon
    );

    const numWaypoints = Math.ceil(totalDistance / spacingNM);
    const waypoints: Waypoint[] = [];

    for (let i = 0; i <= numWaypoints; i++) {
      const fraction = i / numWaypoints;
      const point = this.intermediatePoint(
        departure.lat,
        departure.lon,
        arrival.lat,
        arrival.lon,
        fraction
      );

      waypoints.push({
        lat: point.lat,
        lon: point.lon,
        altitude: cruiseAltitude,
        time: new Date(), // Will be calculated based on speed
        distanceFromStart: totalDistance * fraction
      });
    }

    return waypoints;
  },

  // Calculate ETA for each waypoint
  calculateETAs(
    waypoints: Waypoint[],
    departureTime: Date,
    averageSpeed: number = 120 // knots
  ): Waypoint[] {
    return waypoints.map(waypoint => ({
      ...waypoint,
      time: new Date(
        departureTime.getTime() + 
        (waypoint.distanceFromStart / averageSpeed) * 60 * 60 * 1000
      )
    }));
  }
};
```

**Action Items:**
- [ ] Distance calculation works
- [ ] Waypoint generation works
- [ ] ETA calculation correct
- [ ] Unit tests pass

**Testing:** 
```typescript
const chicago = { lat: 41.9742, lon: -87.9073 };
const newYork = { lat: 40.6413, lon: -73.7781 };
const waypoints = calculations.generateWaypoints(chicago, newYork, 50);
console.log(waypoints); // Should show ~15 waypoints
```

---

### Task 2.4: AI Rescheduling Service (2 hours)

**Objective:** Integrate OpenAI for intelligent rescheduling

**File: `src/services/aiService.ts`**

```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { RescheduleOption, WeatherReport, TrainingLevel } from '../types';

const generateRescheduleFunction = httpsCallable(functions, 'generateReschedule');

export const aiService = {
  async generateRescheduleOptions(
    weatherReport: WeatherReport,
    trainingLevel: TrainingLevel,
    originalTime: Date
  ): Promise<RescheduleOption[]> {
    try {
      const result = await generateRescheduleFunction({
        weatherData: {
          dangerousSegments: weatherReport.dangerousSegments,
          overallSafety: weatherReport.overallSafety,
          overallScore: weatherReport.overallScore
        },
        trainingLevel,
        originalTime: originalTime.toISOString()
      });

      return result.data as RescheduleOption[];
    } catch (error) {
      console.error('AI reschedule error:', error);
      
      // Fallback: Generate simple time-based suggestions
      return this.generateFallbackOptions(originalTime);
    }
  },

  // Fallback if AI fails
  generateFallbackOptions(originalTime: Date): RescheduleOption[] {
    const options: RescheduleOption[] = [];
    
    // Option 1: 2 hours later
    options.push({
      newTime: new Date(originalTime.getTime() + 2 * 60 * 60 * 1000),
      reasoning: 'Weather systems typically move within 2 hours',
      expectedWeather: 'Conditions should improve',
      safetyImprovement: 'Allows time for weather to clear',
      confidence: 70
    });

    // Option 2: 4 hours later
    options.push({
      newTime: new Date(originalTime.getTime() + 4 * 60 * 60 * 1000),
      reasoning: 'Extended delay ensures safer conditions',
      expectedWeather: 'Significantly better conditions expected',
      safetyImprovement: 'High probability of clear weather',
      confidence: 85
    });

    // Option 3: Next day same time
    const nextDay = new Date(originalTime);
    nextDay.setDate(nextDay.getDate() + 1);
    options.push({
      newTime: nextDay,
      reasoning: 'Weather patterns reset daily',
      expectedWeather: 'Fresh weather system, likely improved',
      safetyImprovement: 'New day brings more stable conditions',
      confidence: 90
    });

    return options;
  }
};
```

**Action Items:**
- [ ] AI service created
- [ ] Function calling works
- [ ] Fallback logic implemented
- [ ] Returns valid options

---

### Task 2.5: Flight Form Component (1 hour)

**Objective:** Create form to input new flights

**File: `src/components/flights/FlightForm.tsx`**

```typescript
import React, { useState } from 'react';
import { User, Flight } from '../../types';
import { useFlights } from '../../hooks/useFlights';
import { calculations } from '../../utils/calculations';
import { weatherService } from '../../services/weatherService';
import '../../styles/form.css';

// Common airports
const AIRPORTS = {
  'ORD': { name: 'Chicago O\'Hare', lat: 41.9742, lon: -87.9073 },
  'JFK': { name: 'New York JFK', lat: 40.6413, lon: -73.7781 },
  'LAX': { name: 'Los Angeles', lat: 33.9416, lon: -118.4085 },
  'SEA': { name: 'Seattle-Tacoma', lat: 47.4502, lon: -122.3088 },
  'MIA': { name: 'Miami', lat: 25.7959, lon: -80.2870 },
  'DFW': { name: 'Dallas Fort Worth', lat: 32.8998, lon: -97.0403 }
};

interface FlightFormProps {
  user: User;
  onClose: () => void;
}

export const FlightForm: React.FC<FlightFormProps> = ({ user, onClose }) => {
  const { createFlight } = useFlights(user.uid);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    departureCode: 'ORD',
    arrivalCode: 'JFK',
    date: '',
    time: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const departure = AIRPORTS[formData.departureCode as keyof typeof AIRPORTS];
      const arrival = AIRPORTS[formData.arrivalCode as keyof typeof AIRPORTS];
      
      // Combine date and time
      const scheduledTime = new Date(`${formData.date}T${formData.time}`);

      // Generate flight path
      const waypoints = calculations.generateWaypoints(
        { lat: departure.lat, lon: departure.lon, name: departure.name },
        { lat: arrival.lat, lon: arrival.lon, name: arrival.name },
        50
      );

      const waypointsWithETA = calculations.calculateETAs(
        waypoints,
        scheduledTime,
        120 // 120 knots average speed
      );

      // Check weather along path
      const checkpoints = await weatherService.checkFlightPath(
        waypointsWithETA.map(w => ({
          lat: w.lat,
          lon: w.lon,
          time: w.time
        })),
        user.trainingLevel
      );

      // Determine overall safety
      const unsafeCheckpoints = checkpoints.filter(c => c.safetyStatus === 'dangerous');
      const overallSafety = unsafeCheckpoints.length > 0 ? 'dangerous' : 
                           checkpoints.some(c => c.safetyStatus === 'marginal') ? 'marginal' : 
                           'safe';

      // Create flight
      const flight: Omit<Flight, 'id'> = {
        userId: user.uid,
        departure: {
          lat: departure.lat,
          lon: departure.lon,
          name: departure.name
        },
        arrival: {
          lat: arrival.lat,
          lon: arrival.lon,
          name: arrival.name
        },
        scheduledTime,
        studentName: user.displayName,
        trainingLevel: user.trainingLevel,
        path: {
          waypoints: waypointsWithETA,
          totalDistance: calculations.calculateDistance(
            departure.lat,
            departure.lon,
            arrival.lat,
            arrival.lon
          ),
          estimatedDuration: (waypointsWithETA[waypointsWithETA.length - 1].time.getTime() - 
                             scheduledTime.getTime()) / (60 * 1000)
        },
        weatherReport: {
          flightId: '', // Will be set after creation
          overallSafety,
          overallScore: Math.round(
            checkpoints.reduce((sum, c) => sum + c.safetyScore, 0) / checkpoints.length
          ),
          checkpoints,
          dangerousSegments: [],
          recommendations: [],
          generatedAt: new Date()
        },
        lastWeatherCheck: new Date(),
        safetyStatus: overallSafety,
        status: 'scheduled',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await createFlight(flight);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flight-form">
      <h3>Create New Flight</h3>
      
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>From</label>
          <select
            value={formData.departureCode}
            onChange={(e) => setFormData({ ...formData, departureCode: e.target.value })}
            required
          >
            {Object.entries(AIRPORTS).map(([code, airport]) => (
              <option key={code} value={code}>
                {code} - {airport.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>To</label>
          <select
            value={formData.arrivalCode}
            onChange={(e) => setFormData({ ...formData, arrivalCode: e.target.value })}
            required
          >
            {Object.entries(AIRPORTS).map(([code, airport]) => (
              <option key={code} value={code}>
                {code} - {airport.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
            required
          />
        </div>

        <div className="form-group">
          <label>Time</label>
          <input
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            required
          />
        </div>

        <div className="form-actions">
          <button type="button" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Flight'}
          </button>
        </div>
      </form>
    </div>
  );
};
```

**File: `src/styles/form.css`**

```css
.flight-form {
  background: #2a2a3e;
  padding: 20px;
  border-radius: 12px;
  margin: 0 20px 20px 20px;
}

.flight-form h3 {
  font-size: 16px;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group select,
.form-group input {
  width: 100%;
  padding: 10px;
  background: #1a1a2e;
  border: 1px solid #3a3a4e;
  border-radius: 6px;
  color: white;
  font-size: 14px;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.form-actions button {
  flex: 1;
  padding: 12px;
}

.form-actions button:first-child {
  background: #3a3a4e;
}

.error {
  background: #ef4444;
  color: white;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 14px;
}
```

**Action Items:**
- [ ] Flight form created
- [ ] Airport selection works
- [ ] Date/time inputs functional
- [ ] Form submits and creates flight
- [ ] Weather checking happens
- [ ] Flight appears in sidebar

---

## Day 3: 3D Visualization & Polish (8 hours)

### Task 3.1: Cesium Map Setup (2 hours)

**Objective:** Initialize Cesium globe with basic rendering

**File: `src/components/map/CesiumMap.tsx`**

```typescript
import React, { useEffect, useRef } from 'react';
import { Viewer, Entity, ImageryLayer } from 'resium';
import { Cartesian3, Color, UrlTemplateImageryProvider } from 'cesium';
import { useFlights } from '../../hooks/useFlights';
import { useAuth } from '../../hooks/useAuth';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import '../../styles/map.css';

interface CesiumMapProps {
  selectedFlightId: string | null;
}

export const CesiumMap: React.FC<CesiumMapProps> = ({ selectedFlightId }) => {
  const { user } = useAuth();
  const { flights } = useFlights(user?.uid || '');
  const viewerRef = useRef<any>(null);

  // OpenWeatherMap cloud layer
  const cloudProvider = new UrlTemplateImageryProvider({
    url: 'https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=YOUR_KEY',
    credit: 'Weather data © OpenWeatherMap'
  });

  useEffect(() => {
    if (selectedFlightId && viewerRef.current) {
      const flight = flights.find(f => f.id === selectedFlightId);
      if (flight) {
        // Zoom to flight
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
      navigationHelpButton={false}
      baseLayerPicker={false}
    >
      {/* Weather overlay */}
      <ImageryLayer imageryProvider={cloudProvider} alpha={0.5} />

      {/* Render all flights */}
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

// Component to render individual flight path
const FlightPathEntity: React.FC<{ flight: Flight; isSelected: boolean }> = ({ 
  flight, 
  isSelected 
}) => {
  // Convert waypoints to Cesium positions
  const positions = flight.path.waypoints.flatMap(w => [w.lon, w.lat]);

  // Color based on safety
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

**File: `src/styles/map.css`**

```css
.cesium-viewer {
  width: 100%;
  height: 100%;
}

.cesium-viewer-toolbar {
  top: 10px;
  right: 10px;
}

.cesium-viewer-timelineContainer {
  bottom: 0;
  left: 0;
  right: 0;
}

/* Hide Cesium logo (keep attribution) */
.cesium-viewer-bottom {
  display: flex !important;
  justify-content: space-between;
}
```

**Add Cesium CSS to main.tsx:**

```typescript
import 'cesium/Build/Cesium/Widgets/widgets.css';
```

**Action Items:**
- [ ] Cesium initializes
- [ ] Globe renders
- [ ] Flight paths display
- [ ] Colors match safety status
- [ ] Weather overlay visible

---

### Task 3.2: Flight Card Component (1 hour)

**Objective:** Display individual flights in sidebar

**File: `src/components/flights/FlightCard.tsx`**

```typescript
import React from 'react';
import { Flight } from '../../types';
import '../../styles/flight-card.css';

interface FlightCardProps {
  flight: Flight;
  isSelected: boolean;
  onSelect: () => void;
}

export const FlightCard: React.FC<FlightCardProps> = ({ 
  flight, 
  isSelected, 
  onSelect 
}) => {
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

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

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
        <span className="status-icon">{statusIcon}</span>
      </div>

      <div className="flight-time">
        {formatDate(flight.scheduledTime)} at {formatTime(flight.scheduledTime)}
      </div>

      <div className="flight-details">
        <span>{Math.round(flight.path.totalDistance)} NM</span>
        <span>•</span>
        <span>{Math.round(flight.path.estimatedDuration)} min</span>
      </div>

      {flight.weatherReport && flight.safetyStatus !== 'safe' && (
        <div className="weather-warning">
          Score: {flight.weatherReport.overallScore}/100
        </div>
      )}
    </div>
  );
};
```

**File: `src/styles/flight-card.css`**

```css
.flight-card {
  background: #2a2a3e;
  padding: 16px;
  border-radius: 8px;
  cursor: pointer;
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
  align-items: center;
  margin-bottom: 8px;
}

.flight-route {
  font-size: 16px;
  font-weight: 600;
}

.status-icon {
  font-size: 18px;
}

.flight-time {
  font-size: 14px;
  color: #9ca3af;
  margin-bottom: 8px;
}

.flight-details {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #6b7280;
}

.weather-warning {
  margin-top: 8px;
  padding: 6px 10px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 4px;
  font-size: 12px;
  color: #ef4444;
}
```

**Action Items:**
- [ ] Flight cards display
- [ ] Click selects flight
- [ ] Status icons show
- [ ] Styling looks good

---

### Task 3.3: Animated Flight Playback (3 hours)

**Objective:** Add timeline controls and animated plane

**File: `src/components/map/AnimatedFlight.tsx`**

```typescript
import React, { useEffect } from 'react';
import { Entity } from 'resium';
import { 
  Cartesian3, 
  JulianDate, 
  SampledPositionProperty,
  VelocityOrientationProperty,
  Color,
  CallbackProperty,
  Cartesian2,
  TimeIntervalCollection,
  TimeInterval
} from 'cesium';
import { Flight } from '../../types';

interface AnimatedFlightProps {
  flight: Flight;
  viewer: any;
}

export const AnimatedFlight: React.FC<AnimatedFlightProps> = ({ flight, viewer }) => {
  useEffect(() => {
    if (!viewer) return;

    const startTime = JulianDate.fromDate(new Date(flight.scheduledTime));
    const totalSeconds = flight.path.estimatedDuration * 60;
    const stopTime = JulianDate.addSeconds(startTime, totalSeconds, new JulianDate());

    // Set up clock
    viewer.clock.startTime = startTime.clone();
    viewer.clock.stopTime = stopTime.clone();
    viewer.clock.currentTime = startTime.clone();
    viewer.clock.multiplier = 10; // 10x speed
    viewer.clock.shouldAnimate = false;

    // Timeline range
    viewer.timeline.zoomTo(startTime, stopTime);
  }, [flight, viewer]);

  // Create position property with time samples
  const positionProperty = new SampledPositionProperty();
  
  flight.path.waypoints.forEach((waypoint, index) => {
    const time = JulianDate.fromDate(new Date(waypoint.time));
    const position = Cartesian3.fromDegrees(
      waypoint.lon,
      waypoint.lat,
      waypoint.altitude
    );
    positionProperty.addSample(time, position);
  });

  const startTime = JulianDate.fromDate(new Date(flight.scheduledTime));
  const totalSeconds = flight.path.estimatedDuration * 60;

  return (
    <Entity
      availability={
        new TimeIntervalCollection([
          new TimeInterval({
            start: startTime,
            stop: JulianDate.addSeconds(startTime, totalSeconds, new JulianDate())
          })
        ])
      }
      position={positionProperty}
      orientation={new VelocityOrientationProperty(positionProperty)}
      model={{
        uri: '/assets/airplane.glb',
        minimumPixelSize: 64,
        scale: 100
      }}
      label={{
        text: new CallbackProperty(() => {
          const currentTime = viewer.clock.currentTime;
          const julianSeconds = JulianDate.secondsDifference(
            currentTime,
            startTime
          );
          const progress = (julianSeconds / totalSeconds) * 100;
          
          return `✈️ ${flight.departure.name?.split(' ')[0]} → ${flight.arrival.name?.split(' ')[0]}\n${Math.round(progress)}% Complete`;
        }, false),
        font: '14pt sans-serif',
        fillColor: Color.WHITE,
        outlineColor: Color.BLACK,
        outlineWidth: 2,
        pixelOffset: new Cartesian2(0, -50),
        showBackground: true,
        backgroundColor: new Color(0, 0, 0, 0.7)
      }}
    />
  );
};
```

**File: `src/components/map/PlaybackControls.tsx`**

```typescript
import React, { useState } from 'react';
import '../../styles/playback.css';

interface PlaybackControlsProps {
  viewer: any;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({ viewer }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(10);

  const togglePlay = () => {
    if (viewer) {
      viewer.clock.shouldAnimate = !viewer.clock.shouldAnimate;
      setIsPlaying(!isPlaying);
    }
  };

  const restart = () => {
    if (viewer) {
      viewer.clock.currentTime = viewer.clock.startTime.clone();
      viewer.clock.shouldAnimate = false;
      setIsPlaying(false);
    }
  };

  const changeSpeed = (newSpeed: number) => {
    if (viewer) {
      viewer.clock.multiplier = newSpeed;
      setSpeed(newSpeed);
    }
  };

  return (
    <div className="playback-controls">
      <button onClick={togglePlay} className="play-btn">
        {isPlaying ? '⏸' : '▶️'}
      </button>

      <button onClick={restart} className="restart-btn">
        ⏮
      </button>

      <select 
        value={speed} 
        onChange={(e) => changeSpeed(Number(e.target.value))}
        className="speed-select"
      >
        <option value={1}>1x</option>
        <option value={5}>5x</option>
        <option value={10}>10x</option>
        <option value={30}>30x</option>
      </select>
    </div>
  );
};
```

**File: `src/styles/playback.css`**

```css
.playback-controls {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  background: rgba(26, 26, 46, 0.95);
  padding: 12px 20px;
  border-radius: 50px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

.playback-controls button {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-btn {
  background: #10b981;
}

.play-btn:hover {
  background: #059669;
}

.restart-btn {
  background: #3a3a4e;
}

.speed-select {
  padding: 0 12px;
  background: #2a2a3e;
  border: 1px solid #3a3a4e;
  border-radius: 25px;
  color: white;
  cursor: pointer;
}
```

**Update CesiumMap.tsx to include playback:**

```typescript
// Add to CesiumMap component
const [showPlayback, setShowPlayback] = useState(false);

// In render
{showPlayback && selectedFlightId && (
  <>
    <AnimatedFlight 
      flight={flights.find(f => f.id === selectedFlightId)!}
      viewer={viewerRef.current?.cesiumElement}
    />
    <PlaybackControls viewer={viewerRef.current?.cesiumElement} />
  </>
)}
```

**Action Items:**
- [ ] Plane model displays
- [ ] Animation works smoothly
- [ ] Timeline controls functional
- [ ] Speed adjustment works
- [ ] Camera follows plane (optional)

---

### Task 3.4: Weather Alerts & Details (1 hour)

**Objective:** Show weather warnings and detailed reports

**File: `src/components/weather/WeatherAlert.tsx`**

```typescript
import React from 'react';
import { Flight } from '../../types';
import '../../styles/weather-alert.css';

interface WeatherAlertProps {
  flight: Flight;
  onReschedule: () => void;
}

export const WeatherAlert: React.FC<WeatherAlertProps> = ({ flight, onReschedule }) => {
  if (flight.safetyStatus === 'safe') return null;

  return (
    <div className={`weather-alert ${flight.safetyStatus}`}>
      <div className="alert-header">
        <span className="alert-icon">
          {flight.safetyStatus === 'dangerous' ? '⚠️' : '⚡'}
        </span>
        <h4>
          {flight.safetyStatus === 'dangerous' ? 'Flight Not Recommended' : 'Marginal Conditions'}
        </h4>
      </div>

      <div className="alert-body">
        <p className="alert-message">
          Weather conditions are {flight.safetyStatus === 'dangerous' ? 'unsafe' : 'marginal'} for 
          {' '}{flight.trainingLevel} pilots.
        </p>

        {flight.weatherReport && (
          <div className="weather-summary">
            <div className="score">
              Safety Score: {flight.weatherReport.overallScore}/100
            </div>
            
            {flight.weatherReport.dangerousSegments.length > 0 && (
              <div className="dangerous-segments">
                <strong>Problem Areas:</strong>
                {flight.weatherReport.dangerousSegments.map((segment, i) => (
                  <div key={i} className="segment">
                    • {segment.reason}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button onClick={onReschedule} className="reschedule-btn">
          Get Reschedule Options
        </button>
      </div>
    </div>
  );
};
```

**File: `src/styles/weather-alert.css`**

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

.alert-icon {
  font-size: 24px;
}

.alert-header h4 {
  font-size: 16px;
  margin: 0;
}

.alert-message {
  font-size: 14px;
  color: #d1d5db;
  margin-bottom: 16px;
}

.weather-summary {
  background: rgba(0, 0, 0, 0.3);
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.score {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

.dangerous-segments {
  font-size: 13px;
  margin-top: 8px;
}

.segment {
  margin-top: 4px;
  color: #9ca3af;
}

.reschedule-btn {
  width: 100%;
  background: #60a5fa;
  padding: 12px;
}

.reschedule-btn:hover {
  background: #3b82f6;
}
```

**Action Items:**
- [ ] Weather alerts display
- [ ] Shows for marginal/dangerous flights
- [ ] Reschedule button functional
- [ ] Styling matches design

---

### Task 3.5: Polish & Bug Fixes (1 hour)

**Objective:** Fix bugs, optimize performance, improve UX

**Checklist:**

**Performance:**
- [ ] Limit visible flights to 20 at once
- [ ] Optimize weather API calls (cache for 30 min)
- [ ] Lazy load components
- [ ] Debounce user inputs

**UX Improvements:**
- [ ] Add loading states everywhere
- [ ] Add error boundaries
- [ ] Improve mobile responsiveness
- [ ] Add tooltips for buttons
- [ ] Smooth transitions

**Bug Fixes:**
- [ ] Fix timezone issues in date/time
- [ ] Handle API failures gracefully
- [ ] Fix Cesium camera controls
- [ ] Ensure proper cleanup on unmount

**Code Quality:**
- [ ] Add comments to complex functions
- [ ] Remove console.logs
- [ ] Fix TypeScript warnings
- [ ] Format code consistently

---

## Phase 4: Testing & Deployment (2-4 hours)

### Task 4.1: Testing Scenarios

**Manual Testing Checklist:**

**Authentication:**
- [ ] Sign up with email/password
- [ ] Sign in with Google
- [ ] Sign out and sign back in
- [ ] Invalid credentials show error

**Flight Creation:**
- [ ] Create flight with student pilot level
- [ ] Create flight with instrument rating
- [ ] Try creating flight with past date (should fail)
- [ ] Verify weather checking happens

**Weather Safety:**
- [ ] Student pilot gets stricter rules
- [ ] Instrument rating allows IMC
- [ ] Dangerous weather shows red
- [ ] Safe weather shows green

**3D Visualization:**
- [ ] Globe renders properly
- [ ] Flight paths appear
- [ ] Click flight zooms correctly
- [ ] Weather overlay visible

**Animation:**
- [ ] Play button starts animation
- [ ] Plane moves along path
- [ ] Timeline updates
- [ ] Speed controls work

**Responsive Design:**
- [ ] Works on desktop (1920x1080)
- [ ] Works on laptop (1366x768)
- [ ] Sidebar scrolls on small screens
- [ ] Mobile view (basic support)

---

### Task 4.2: Deployment

**Deploy to Firebase Hosting:**

```bash
# Build production version
npm run build

# Deploy functions
firebase deploy --only functions

# Deploy hosting
firebase deploy --only hosting

# OR deploy everything
firebase deploy
```

**Post-Deployment Checks:**
- [ ] App loads at production URL
- [ ] Authentication works
- [ ] Firestore rules enforced
- [ ] Functions execute correctly
- [ ] No console errors

---

### Task 4.3: Documentation

**Update README.md:**

```markdown
# Flight Schedule Pro - AI Weather Monitoring

## Features
- 3D globe visualization with Cesium
- Real-time weather monitoring
- AI-powered rescheduling
- Training level-based safety rules
- Animated flight playback

## Setup
1. Clone repository
2. Copy `.env.template` to `.env.local`
3. Add Firebase configuration
4. Run `npm install`
5. Run `npm run dev`

## Configuration
See `.env.template` for required environment variables

## Deployment
```bash
npm run build
firebase deploy
```

## Tech Stack
- React + TypeScript
- Cesium.js for 3D visualization
- Firebase (Auth + Firestore + Functions)
- OpenWeatherMap API
- OpenAI API
```

**Create Demo Video:**
- [ ] Record 5-10 minute walkthrough
- [ ] Show user registration
- [ ] Demonstrate flight creation
- [ ] Show weather checking
- [ ] Display 3D visualization
- [ ] Demonstrate playback
- [ ] Show AI rescheduling

---

## Summary Checklist

### Day 1 ✅
- [ ] Project setup complete
- [ ] Firebase configured
- [ ] Authentication working
- [ ] Sidebar layout done
- [ ] Basic flight management

### Day 2 ✅
- [ ] Weather API integrated
- [ ] Safety logic implemented
- [ ] Flight calculations working
- [ ] AI service connected
- [ ] Flight creation functional

### Day 3 ✅
- [ ] Cesium map rendering
- [ ] Flight paths visible
- [ ] Animation working
- [ ] Playback controls functional
- [ ] Weather alerts showing

### Final ✅
- [ ] All features tested
- [ ] Deployed to production
- [ ] Documentation complete
- [ ] Demo video recorded

---

## Troubleshooting

### Common Issues:

**Cesium not loading:**
- Check if Cesium CSS imported in main.tsx
- Verify CORS settings
- Check browser console for errors

**Weather API not working:**
- Verify Firebase Function deployed
- Check API key configuration
- Test function in Firebase console

**Authentication failing:**
- Verify Firebase config in `.env.local`
- Check authorized domains in Firebase console
- Clear browser cache/cookies

**Performance issues:**
- Limit number of visible flights
- Reduce weather check frequency
- Optimize Cesium rendering settings

---

**END OF TASK.MD**

This is your complete implementation guide! Follow it step-by-step and you'll have a fully functional AI Flight Scheduler with 3D visualization in 3-5 days. 🚀