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
