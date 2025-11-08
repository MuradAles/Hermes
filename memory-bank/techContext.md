# Technical Context: Flight Schedule Pro

## Technology Stack

### Frontend
- **Framework:** React 19.1.1 with TypeScript 5.9.3
- **Build Tool:** Vite 7.1.7
- **3D Visualization:** Cesium.js with Resium (React wrapper)
- **Styling:** Plain CSS (no framework dependencies)
- **State Management:** React Hooks (useState, useEffect, useContext)
- **Package Manager:** npm

### Backend & Database
- **Database:** Firebase Firestore (NoSQL)
- **Authentication:** Firebase Authentication
- **Hosting:** Firebase Hosting
- **Functions:** Firebase Cloud Functions (TypeScript, Node.js 20)
- **Storage:** Firebase Storage (if needed for assets)

### External APIs & Services
- **Weather Data:** OpenWeatherMap API
  - Free tier: 1,000 calls/day
  - Current weather API
  - Forecast API (5-day, 3-hour intervals)
  - Weather map tiles for visualization
- **AI Service:** OpenAI API
  - GPT-3.5 or GPT-4
  - Pay-per-use model (~$0.002 per request)
  - Flight rescheduling suggestions
- **3D Assets:** Cesium Ion (Free tier)
  - 3D terrain data
  - Building data
  - Satellite imagery (Ion World Imagery)
  - 50,000 tile requests/month limit
  - **Note:** Bing Maps fallback disabled, using Ion World Imagery exclusively

### 3D Model Assets
- **Format Support:** .glb (binary GLTF) and .gltf (text GLTF)
- **Storage:** Models stored in `public/assets/` folder
- **Available Models:** 5 aircraft models (G3 JSC Air, Sierra ARC Air, WB57 JSC Air, C20A AFRC UAVSAR, G4 NOAA Air)
- **Model Properties:** Scale 2000x, minimumPixelSize 128px, maximumScale 20000

### Development Tools
- **Version Control:** Git
- **Linting:** ESLint 9.36.0
- **Type Checking:** TypeScript
- **Environment Variables:** Vite environment variables (VITE_*)

## Development Setup

### Prerequisites
- Node.js 20+ (required for Firebase Functions)
- npm or yarn
- Firebase CLI
- Git

### Project Structure
```
hermes/ (project root)
├── src/
│   ├── components/      # React components
│   │   ├── ui/         # Reusable UI components
│   │   ├── auth/       # Authentication components
│   │   ├── map/        # Cesium map components
│   │   ├── flights/    # Flight management components
│   │   ├── weather/    # Weather display components
│   │   └── layout/     # Layout components
│   ├── services/        # API and business logic
│   ├── hooks/          # Custom React hooks
│   ├── types/          # TypeScript interfaces ✅
│   │   ├── User.ts
│   │   ├── Flight.ts
│   │   ├── Weather.ts
│   │   ├── Airport.ts
│   │   └── index.ts
│   ├── utils/          # Helper functions
│   └── styles/         # CSS files
├── functions/          # Firebase Cloud Functions ✅
│   ├── src/
│   │   └── index.ts
│   └── package.json
├── public/             # Static assets
├── tasks/              # Project documentation
├── firebase.json       # Firebase config ✅
├── .firebaserc         # Firebase project ref ✅
├── firestore.rules     # Firestore security rules ✅
└── firestore.indexes.json # Firestore indexes ✅
```

### Environment Variables

Required environment variables (`.env.local`): ✅ CONFIGURED
```
VITE_FIREBASE_API_KEY=          # ✅ Set
VITE_FIREBASE_AUTH_DOMAIN=      # ✅ Set
VITE_FIREBASE_PROJECT_ID=       # ✅ Set
VITE_FIREBASE_STORAGE_BUCKET=   # ✅ Set
VITE_FIREBASE_MESSAGING_SENDER_ID= # ✅ Set
VITE_FIREBASE_APP_ID=           # ✅ Set
VITE_CESIUM_ION_TOKEN=          # ✅ Set (Optional)
```

Firebase Functions environment variables (set via Firebase CLI):
```
openweather.key=        # OpenWeatherMap API key
openai.key=            # OpenAI API key
```

## Dependencies

### Production Dependencies
- `react`: ^19.1.1
- `react-dom`: ^19.1.1
- `cesium`: ^1.135.0 ✅
- `resium`: ^1.19.0 ✅
- `firebase`: ^12.5.0 ✅
- `openai`: ^6.8.1 ✅

### Development Dependencies
- `typescript`: ~5.9.3
- `vite`: ^7.1.7
- `@vitejs/plugin-react`: ^5.0.4
- `eslint`: ^9.36.0
- `@types/node`: ^24.6.0
- `@types/react`: ^19.1.16
- `@types/react-dom`: ^19.1.9

## Build & Deployment

### Development
```bash
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Firebase Deployment
```bash
firebase login                    # Authenticate
firebase init                     # Initialize project
firebase deploy --only functions  # Deploy functions
firebase deploy --only hosting    # Deploy frontend
firebase deploy                   # Deploy everything
```

## Technical Constraints

### API Rate Limits
- **OpenWeatherMap:** 1,000 calls/day (free tier)
- **OpenAI:** Pay-per-use, no hard limit but cost-conscious
- **Cesium Ion:** 50,000 tile requests/month (free tier)

### Performance Requirements
- Initial page load: < 5 seconds
- Weather API response: < 3 seconds
- Globe rendering: 30-60 FPS
- Flight path calculation: < 1 second
- Database queries: < 500ms

### Browser Compatibility
- Chrome 90+ (primary)
- Firefox 88+ (secondary)
- Safari 14+ (secondary)
- Edge 90+ (secondary)
- WebGL support required for 3D visualization

### Device Requirements
- Modern devices with WebGL support
- Stable internet connection required
- May not work on very old devices
- Large initial download for Cesium library (~2-3MB)

## Development Workflow

1. **Setup:** Clone repo, install dependencies, configure environment variables
2. **Development:** Use Vite dev server for hot module replacement
3. **Testing:** Manual testing in browser, Firebase emulators for local testing
4. **Build:** TypeScript compilation and Vite build
5. **Deploy:** Firebase deployment for hosting and functions

## Code Standards

- **TypeScript:** Strict type checking enabled
- **ESLint:** Configured with React and TypeScript rules
- **File Naming:** PascalCase for components, camelCase for utilities
- **Component Structure:** Functional components with hooks
- **CSS:** Plain CSS with CSS variables for theming
- **Comments:** Code should be self-documenting, comments for complex logic

## Security Considerations

- API keys stored in environment variables
- Firebase security rules for Firestore
- User data isolated by authentication
- No sensitive data in client-side code
- HTTPS only for all connections
- Input validation on all user inputs

