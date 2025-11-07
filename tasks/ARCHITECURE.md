# Application Architecture - Mermaid Diagram

## Complete System Architecture

```mermaid
graph TB
    subgraph "Frontend - React App"
        UI[UI Components Layer]
        AUTH[Authentication Layer]
        DASH[Dashboard Layer]
        MAP[3D Map Layer - Cesium]
        
        UI --> AUTH
        AUTH --> DASH
        DASH --> MAP
        
        subgraph "UI Components"
            BTN[Button]
            CARD[Card]
            INPUT[Input]
            BADGE[Badge]
            ALERT[Alert]
            SPIN[Spinner]
        end
        
        subgraph "Feature Components"
            LOGIN[Login/Register]
            SIDEBAR[Sidebar]
            FLIGHTFORM[Flight Form]
            FLIGHTLIST[Flight List]
            FLIGHTCARD[Flight Card]
            WEATHER[Weather Alert]
            PLAYBACK[Playback Controls]
        end
        
        subgraph "3D Visualization"
            GLOBE[Cesium Globe]
            PATHS[Flight Paths]
            OVERLAY[Weather Overlay]
            ANIMATION[Animated Plane]
            TIMELINE[Timeline]
        end
    end
    
    subgraph "Backend - Firebase"
        FIREAUTH[Firebase Auth]
        FIRESTORE[Firestore DB]
        FUNCTIONS[Cloud Functions]
        
        subgraph "Collections"
            USERS[(Users)]
            FLIGHTS[(Flights)]
            WEATHER_LOGS[(Weather Logs)]
            HISTORY[(Reschedule History)]
        end
    end
    
    subgraph "External APIs"
        OPENWEATHER[OpenWeatherMap API]
        OPENAI[OpenAI API]
        CESIUMION[Cesium Ion]
    end
    
    subgraph "Services Layer"
        AUTHSVC[Auth Service]
        FLIGHTSVC[Flight Service]
        WEATHERSVC[Weather Service]
        AISVC[AI Service]
        CESIUMSVC[Cesium Service]
    end
    
    %% Connections
    LOGIN --> FIREAUTH
    SIDEBAR --> FLIGHTLIST
    FLIGHTLIST --> FLIGHTCARD
    FLIGHTFORM --> FLIGHTSVC
    
    GLOBE --> PATHS
    GLOBE --> OVERLAY
    GLOBE --> ANIMATION
    GLOBE --> TIMELINE
    
    AUTHSVC --> FIREAUTH
    FLIGHTSVC --> FIRESTORE
    WEATHERSVC --> FUNCTIONS
    AISVC --> FUNCTIONS
    
    FUNCTIONS --> OPENWEATHER
    FUNCTIONS --> OPENAI
    GLOBE --> CESIUMION
    
    FIRESTORE --> USERS
    FIRESTORE --> FLIGHTS
    FIRESTORE --> WEATHER_LOGS
    FIRESTORE --> HISTORY
    
    %% Color coding
    classDef primary fill:#60a5fa,stroke:#3b82f6,color:#fff
    classDef success fill:#10b981,stroke:#059669,color:#fff
    classDef warning fill:#f59e0b,stroke:#d97706,color:#fff
    classDef danger fill:#ef4444,stroke:#dc2626,color:#fff
    classDef neutral fill:#6b7280,stroke:#4b5563,color:#fff
    
    class UI,DASH,MAP primary
    class FIREAUTH,FIRESTORE,FUNCTIONS success
    class OPENWEATHER,OPENAI,CESIUMION warning
    class AUTHSVC,FLIGHTSVC,WEATHERSVC,AISVC,CESIUMSVC neutral
```

---

## User Flow Diagram

```mermaid
sequenceDiagram
    actor User
    participant UI as Frontend UI
    participant Auth as Firebase Auth
    participant DB as Firestore
    participant Func as Cloud Functions
    participant Weather as OpenWeather API
    participant AI as OpenAI API
    participant Map as Cesium Globe

    User->>UI: Open Application
    UI->>Auth: Check Authentication
    
    alt Not Authenticated
        Auth-->>UI: Redirect to Login
        User->>UI: Enter Credentials
        UI->>Auth: Sign In
        Auth-->>UI: Auth Token
    end
    
    UI->>DB: Fetch User Flights
    DB-->>UI: Return Flights Data
    UI->>Map: Render Globe with Flights
    
    User->>UI: Click "Create Flight"
    UI->>User: Show Flight Form
    User->>UI: Enter Flight Details
    
    UI->>Func: Check Weather Along Path
    Func->>Weather: Get Weather Data
    Weather-->>Func: Weather Conditions
    Func-->>UI: Safety Assessment
    
    alt Weather Unsafe
        UI->>Func: Request AI Reschedule
        Func->>AI: Generate Alternatives
        AI-->>Func: 3 Reschedule Options
        Func-->>UI: Display Options
        User->>UI: Select New Time
    end
    
    UI->>DB: Save Flight
    DB-->>UI: Flight Saved
    UI->>Map: Update Globe
    Map-->>User: Display Flight Path
    
    User->>UI: Click "Play Flight"
    UI->>Map: Start Animation
    Map-->>User: Animated Plane + Weather
    
    loop Every 30 Minutes
        Func->>Weather: Check Active Flights
        Weather-->>Func: Updated Conditions
        Func->>DB: Log Weather Changes
        alt Conditions Changed
            Func->>UI: Send Notification
            UI-->>User: Weather Alert
        end
    end
```

---

## Component Hierarchy

```mermaid
graph TD
    APP[App.tsx]
    
    APP --> LOGIN[Login Component]
    APP --> DASHBOARD[Dashboard Component]
    
    DASHBOARD --> SIDEBAR[Sidebar]
    DASHBOARD --> MAPCONTAINER[Map Container]
    
    SIDEBAR --> USERINFO[User Info]
    SIDEBAR --> NEWFLIGHTBTN[New Flight Button]
    SIDEBAR --> FLIGHTFORM[Flight Form]
    SIDEBAR --> FLIGHTLIST[Flight List]
    
    FLIGHTFORM --> INPUT1[Input: From]
    FLIGHTFORM --> INPUT2[Input: To]
    FLIGHTFORM --> INPUT3[Input: Date]
    FLIGHTFORM --> INPUT4[Input: Time]
    FLIGHTFORM --> SUBMITBTN[Submit Button]
    
    FLIGHTLIST --> CARD1[Flight Card 1]
    FLIGHTLIST --> CARD2[Flight Card 2]
    FLIGHTLIST --> CARDN[Flight Card N]
    
    CARD1 --> BADGE1[Status Badge]
    CARD1 --> WEATHERALERT[Weather Alert]
    
    MAPCONTAINER --> CESIUMMAP[Cesium Map]
    
    CESIUMMAP --> GLOBE[3D Globe]
    CESIUMMAP --> WEATHERLAYER[Weather Overlay]
    CESIUMMAP --> FLIGHTPATHS[Flight Paths]
    CESIUMMAP --> PLANE[Animated Plane]
    CESIUMMAP --> TIMELINE[Timeline Controls]
    
    TIMELINE --> PLAYBTN[Play Button]
    TIMELINE --> SPEEDSELECT[Speed Select]
    TIMELINE --> RESTARTBTN[Restart Button]
    
    %% Styling
    classDef uiComponent fill:#60a5fa,stroke:#3b82f6,color:#fff
    classDef dataComponent fill:#10b981,stroke:#059669,color:#fff
    classDef mapComponent fill:#f59e0b,stroke:#d97706,color:#fff
    
    class INPUT1,INPUT2,INPUT3,INPUT4,SUBMITBTN,BADGE1,PLAYBTN,SPEEDSELECT,RESTARTBTN uiComponent
    class FLIGHTLIST,CARD1,CARD2,CARDN,WEATHERALERT dataComponent
    class GLOBE,WEATHERLAYER,FLIGHTPATHS,PLANE,TIMELINE mapComponent
```

---

## Data Flow Diagram

```mermaid
graph LR
    subgraph "User Input"
        FORM[Flight Form Input]
    end
    
    subgraph "Processing"
        CALC[Calculate Route]
        WEATHER[Fetch Weather]
        SAFETY[Safety Assessment]
        AI[AI Analysis]
    end
    
    subgraph "Storage"
        SAVE[Save to Firestore]
    end
    
    subgraph "Visualization"
        RENDER[Render on Globe]
        ANIMATE[Animation Playback]
    end
    
    FORM --> CALC
    CALC --> WEATHER
    WEATHER --> SAFETY
    
    SAFETY -->|Unsafe| AI
    AI --> SAVE
    SAFETY -->|Safe| SAVE
    
    SAVE --> RENDER
    RENDER --> ANIMATE
    
    %% Color coding
    classDef input fill:#60a5fa,stroke:#3b82f6,color:#fff
    classDef process fill:#f59e0b,stroke:#d97706,color:#fff
    classDef storage fill:#10b981,stroke:#059669,color:#fff
    classDef output fill:#ef4444,stroke:#dc2626,color:#fff
    
    class FORM input
    class CALC,WEATHER,SAFETY,AI process
    class SAVE storage
    class RENDER,ANIMATE output
```

---

## State Management Flow

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated
    
    Unauthenticated --> Authenticated: Login Success
    Authenticated --> Dashboard: Load User Data
    
    state Dashboard {
        [*] --> NoFlights
        NoFlights --> CreatingFlight: Click New Flight
        CreatingFlight --> CheckingWeather: Submit Form
        CheckingWeather --> FlightSafe: Weather OK
        CheckingWeather --> FlightUnsafe: Weather Bad
        
        FlightUnsafe --> AIReschedule: Request Options
        AIReschedule --> FlightSafe: User Selects New Time
        
        FlightSafe --> FlightSaved: Save to DB
        FlightSaved --> FlightList: Update List
        FlightList --> ViewingFlight: Click Flight
        
        ViewingFlight --> PlayingAnimation: Click Play
        PlayingAnimation --> ViewingFlight: Animation Complete
        
        FlightList --> CreatingFlight: Create Another
    }
    
    Dashboard --> [*]: Logout
```

---

## File Structure Tree

```mermaid
graph TD
    ROOT[flight-scheduler/]
    
    ROOT --> SRC[src/]
    ROOT --> FUNCS[functions/]
    ROOT --> PUBLIC[public/]
    ROOT --> CONFIG[Config Files]
    
    SRC --> COMP[components/]
    SRC --> STYLES[styles/]
    SRC --> SERVICES[services/]
    SRC --> HOOKS[hooks/]
    SRC --> TYPES[types/]
    SRC --> UTILS[utils/]
    
    COMP --> UI[ui/]
    COMP --> AUTH[auth/]
    COMP --> MAP[map/]
    COMP --> FLIGHTS[flights/]
    COMP --> WEATHER[weather/]
    COMP --> LAYOUT[layout/]
    
    UI --> BTN[Button/]
    UI --> CARD[Card/]
    UI --> INPUT[Input/]
    UI --> BADGE[Badge/]
    UI --> ALERT[Alert/]
    UI --> SPIN[Spinner/]
    
    BTN --> BTNTSX[Button.tsx]
    BTN --> BTNCSS[Button.css]
    BTN --> BTNINDEX[index.ts]
    
    STYLES --> VARS[variables.css ⭐]
    STYLES --> GLOBAL[global.css]
    STYLES --> THEMES[themes.css]
    
    SERVICES --> FIREBASE[firebase.ts]
    SERVICES --> WEATHERSVC[weatherService.ts]
    SERVICES --> AISVC[aiService.ts]
    SERVICES --> FLIGHTSVC[flightService.ts]
    
    %% Highlighting important files
    classDef important fill:#f59e0b,stroke:#d97706,color:#fff
    class VARS,FIREBASE,WEATHERSVC important
```

---

## Color System Diagram

```mermaid
mindmap
  root((Design System))
    Primary Colors
      Blue #60a5fa
        Main actions
        Links
        Selected states
      Green #10b981
        Safe status
        Success messages
      Yellow #f59e0b
        Marginal conditions
        Warnings
      Red #ef4444
        Unsafe status
        Errors
      Gray #9ca3af
        Text
        Borders
        Backgrounds
    Usage
      Buttons
        Primary actions → Blue
        Danger → Red
        Success → Green
      Flight Status
        Safe → Green
        Marginal → Yellow
        Dangerous → Red
      Badges
        All 5 colors
      Alerts
        Info → Blue
        Success → Green
        Warning → Yellow
        Danger → Red
```

---

## Key
- 🔵 **Primary Blue** (#60a5fa) - Main actions, interactive elements
- 🟢 **Success Green** (#10b981) - Safe status, positive feedback
- 🟡 **Warning Yellow** (#f59e0b) - Marginal conditions, caution
- 🔴 **Danger Red** (#ef4444) - Unsafe status, errors
- ⚪ **Neutral Gray** (#9ca3af) - Text, borders, backgrounds