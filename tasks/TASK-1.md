# Task 1: Core Infrastructure

**Duration:** 6-8 hours

## Objective
Build authentication, UI components, sidebar layout, and basic flight management.

---

## Step 1: Firebase Service

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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
```

---

## Step 2: Authentication Hook

**File: `src/hooks/useAuth.ts`**
```typescript
import { useState, useEffect } from 'react';
import { 
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
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, displayName: string, trainingLevel: TrainingLevel) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
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
    return await signInWithPopup(auth, googleProvider);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  return { user, loading, signIn, signUp, signInWithGoogle, signOut };
};
```

---

## Step 3: Login Component

**File: `src/components/auth/Login.tsx`**
```typescript
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import './Login.css';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        // For signup, you'll need to add training level selection
        await signUp(email, password, email.split('@')[0], 'student-pilot');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Flight Schedule Pro</h1>
        <form onSubmit={handleSubmit}>
          {error && <div className="error">{error}</div>}
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit">{isLogin ? 'Sign In' : 'Sign Up'}</button>
        </form>
        <button onClick={signInWithGoogle}>Continue with Google</button>
        <p onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
        </p>
      </div>
    </div>
  );
};
```

---

## Step 4: App Layout

**File: `src/App.tsx`**
```typescript
import React from 'react';
import { useAuth } from './hooks/useAuth';
import { Login } from './components/auth/Login';
import { Dashboard } from './components/layout/Dashboard';
import './styles/app.css';

const App: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Login />;
  return <Dashboard user={user} />;
};

export default App;
```

---

## Step 5: Sidebar Component

**File: `src/components/layout/Sidebar.tsx`**
```typescript
import React, { useState } from 'react';
import { User } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useFlights } from '../../hooks/useFlights';
import { FlightCard } from '../flights/FlightCard';
import './Sidebar.css';

interface SidebarProps {
  user: User;
  selectedFlightId: string | null;
  onSelectFlight: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, selectedFlightId, onSelectFlight }) => {
  const { signOut } = useAuth();
  const { flights, loading } = useFlights(user.uid);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div>
          <h3>{user.displayName}</h3>
          <p>{user.trainingLevel}</p>
        </div>
        <button onClick={signOut}>Sign Out</button>
      </div>
      
      <button className="new-flight-btn">+ New Flight</button>
      
      <div className="flights-list">
        {loading ? <div>Loading...</div> : 
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

## Step 6: Flight Service & Hook

**File: `src/services/flightService.ts`**
```typescript
import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { Flight } from '../types';

export const flightService = {
  async createFlight(flightData: Omit<Flight, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'flights'), {
      ...flightData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  },

  subscribeToUserFlights(userId: string, callback: (flights: Flight[]) => void) {
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

  useEffect(() => {
    if (!userId) return;
    
    const unsubscribe = flightService.subscribeToUserFlights(userId, (updatedFlights) => {
      setFlights(updatedFlights);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const createFlight = async (flightData: Omit<Flight, 'id'>) => {
    return await flightService.createFlight(flightData);
  };

  return { flights, loading, createFlight };
};
```

---

## Step 7: Dashboard & Flight Card

**File: `src/components/layout/Dashboard.tsx`**
```typescript
import React, { useState } from 'react';
import { User } from '../../types';
import { Sidebar } from './Sidebar';
import { CesiumMap } from '../map/CesiumMap';

export const Dashboard: React.FC<{ user: User }> = ({ user }) => {
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

**File: `src/components/flights/FlightCard.tsx`**
```typescript
import React from 'react';
import { Flight } from '../../types';

export const FlightCard: React.FC<{ 
  flight: Flight; 
  isSelected: boolean; 
  onSelect: () => void 
}> = ({ flight, isSelected, onSelect }) => {
  return (
    <div 
      className={`flight-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="flight-route">
        {flight.departure.name} → {flight.arrival.name}
      </div>
      <div className="flight-time">
        {new Date(flight.scheduledTime).toLocaleString()}
      </div>
      <div className="flight-status">
        Status: {flight.safetyStatus}
      </div>
    </div>
  );
};
```

---

## Basic CSS

**File: `src/styles/app.css`**
```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: sans-serif; background: #0a0a0a; color: #fff; }
.dashboard { display: flex; height: 100vh; }
.map-container { flex: 1; }
.sidebar { width: 350px; background: #1a1a2e; padding: 20px; }
.flight-card { background: #2a2a3e; padding: 16px; margin: 8px 0; border-radius: 8px; cursor: pointer; }
.flight-card.selected { background: #3a3a4e; }
```

---

## Checklist

- [ ] Firebase service initialized
- [ ] Authentication hook working
- [ ] Login component functional
- [ ] App layout with conditional rendering
- [ ] Sidebar displays user info
- [ ] Flight service created
- [ ] useFlights hook working
- [ ] Flight cards display
- [ ] Basic styling applied

---

**Next:** Move to TASK-2.md for Weather & AI Integration

