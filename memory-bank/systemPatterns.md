# System Patterns: Flight Schedule Pro

## Architecture Overview

The application follows a layered architecture with clear separation of concerns:

```
Frontend (React + TypeScript)
├── UI Components Layer (reusable components)
├── Feature Components Layer (auth, flights, weather, map)
├── Services Layer (API calls, business logic)
└── Hooks Layer (custom React hooks for state management)

Backend (Firebase)
├── Authentication (Firebase Auth)
├── Database (Firestore)
└── Functions (Cloud Functions for API calls)

External Services
├── OpenWeatherMap API (weather data)
├── OpenAI API (rescheduling suggestions)
└── Cesium Ion (3D terrain and imagery)
```

## Component Hierarchy

```
App.tsx
├── Login Component (if not authenticated)
└── Dashboard Component (if authenticated)
    ├── Sidebar Component
    │   ├── User Info
    │   ├── New Flight Button
    │   ├── Flight Form (conditional)
    │   └── Flight List
    │       └── Flight Card (multiple)
    └── Map Container
        └── Cesium Map
            ├── Flight Paths (multiple)
            ├── Weather Overlay
            ├── Animated Plane (conditional)
            └── Timeline Controls (conditional)
```

## Design Patterns

### 1. Service Layer Pattern
- All API calls and business logic abstracted into service modules
- Services: `firebase.ts`, `weatherService.ts`, `aiService.ts`, `flightService.ts`
- Components interact with services, not directly with APIs

### 2. Custom Hooks Pattern
- State management and side effects encapsulated in custom hooks
- Hooks: `useAuth.ts`, `useFlights.ts`, `useWeather.ts`, `useCesium.ts`
- Promotes reusability and testability

### 3. Component Composition
- Small, focused components that compose into larger features
- UI components are reusable building blocks
- Feature components handle specific domain logic

### 4. Real-Time Data Pattern
- Firestore real-time listeners for flight data
- Automatic UI updates when data changes
- No manual refresh required

### 5. Color-Coded Status System
- Consistent color usage across the application:
  - **Blue (#60a5fa):** Primary actions, interactive elements
  - **Green (#10b981):** Safe status, success
  - **Yellow (#f59e0b):** Marginal conditions, warnings
  - **Red (#ef4444):** Dangerous status, errors
  - **Gray (#9ca3af):** Text, borders, backgrounds

## Data Flow

1. **User Input** → Component → Service → API
2. **API Response** → Service → Hook → Component State
3. **State Change** → Component Re-render → UI Update
4. **Real-Time Update** → Firestore Listener → Hook → Component State

## State Management Strategy

- **Local State:** `useState` for component-specific state
- **Shared State:** Custom hooks with context or prop drilling
- **Server State:** Firestore real-time listeners via hooks
- **No Global State Library:** Keeping it simple with React hooks

## File Organization Pattern

```
src/
├── components/
│   ├── ui/              # Reusable UI components
│   ├── auth/            # Authentication components
│   ├── flights/          # Flight-related components
│   ├── weather/         # Weather-related components
│   ├── map/             # 3D map components
│   └── layout/          # Layout components
├── services/            # API and business logic
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
├── utils/               # Helper functions
└── styles/              # CSS files
```

## Key Technical Decisions

1. **React + TypeScript:** Type safety and modern React features
2. **Vite:** Fast development and build tooling
3. **Cesium + Resium:** 3D visualization with React integration
4. **Firebase:** Backend-as-a-Service for rapid development
5. **Plain CSS:** No CSS framework dependencies for flexibility
6. **Service Layer:** Centralized API logic for maintainability
7. **Custom Hooks:** Reusable state management patterns

## Security Patterns

- **Firebase Auth:** Secure authentication with email/password and Google
- **Firestore Rules:** User data isolation by authentication
- **API Keys:** Stored in environment variables, never in client code
- **HTTPS Only:** All connections encrypted
- **Input Validation:** All user inputs validated before processing

## Performance Patterns

- **Lazy Loading:** Components loaded on demand
- **Caching:** Weather data cached for 30 minutes
- **Rate Limiting:** API calls throttled to stay within limits
- **Optimistic Updates:** UI updates immediately, syncs with server
- **Efficient Queries:** Firestore queries optimized with indexes

## Error Handling Patterns

- **Try-Catch Blocks:** All async operations wrapped
- **Error Boundaries:** React error boundaries for component errors
- **Graceful Degradation:** Fallback UI when APIs fail
- **User-Friendly Messages:** Clear error messages for users
- **Logging:** Errors logged for debugging

