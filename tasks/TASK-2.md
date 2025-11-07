# Task 2: Weather & AI Integration

**Duration:** 6-8 hours

## Objective
Integrate weather checking, safety logic, flight path calculations, and AI rescheduling.

---

## Step 1: Firebase Functions Setup

**File: `functions/src/index.ts`**
```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import OpenAI from 'openai';

admin.initializeApp();

const OPENWEATHER_API_KEY = functions.config().openweather.key;
const OPENAI_API_KEY = functions.config().openai.key;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Get weather data
export const getWeather = functions.https.onCall(async (data) => {
  const { lat, lon } = data;
  const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
    params: { lat, lon, appid: OPENWEATHER_API_KEY, units: 'imperial' }
  });
  return response.data;
});

// Generate reschedule suggestions
export const generateReschedule = functions.https.onCall(async (data) => {
  const { weatherData, trainingLevel, originalTime } = data;
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'You are a flight scheduling assistant. Return JSON only.' },
      { role: 'user', content: `Weather: ${JSON.stringify(weatherData)}, Level: ${trainingLevel}, Time: ${originalTime}. Suggest 3 alternative times.` }
    ]
  });
  return JSON.parse(completion.choices[0].message.content || '{}');
});
```

**Configure & Deploy:**
```bash
cd functions
npm install axios openai
firebase functions:config:set openweather.key="YOUR_KEY"
firebase functions:config:set openai.key="YOUR_KEY"
firebase deploy --only functions
```

---

## Step 2: Weather Service

**File: `src/services/weatherService.ts`**
```typescript
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';
import { auth } from './firebase';
import { WeatherConditions, TrainingLevel } from '../types';

const functions = getFunctions();
const getWeatherFunction = httpsCallable(functions, 'getWeather');

const WEATHER_MINIMUMS = {
  'student-pilot': { visibility: 5, ceiling: 3000, windSpeed: 10 },
  'private-pilot': { visibility: 3, ceiling: 1000, windSpeed: 20 },
  'instrument-rated': { visibility: 0, ceiling: 0, windSpeed: 35 }
};

export const weatherService = {
  async getWeatherAtLocation(lat: number, lon: number): Promise<WeatherConditions> {
    const result = await getWeatherFunction({ lat, lon });
    const data = result.data as any;
    
    return {
      temperature: data.main.temp,
      cloudCoverage: data.clouds.all,
      ceiling: this.estimateCeiling(data.clouds.all),
      visibility: data.visibility / 1609, // meters to miles
      windSpeed: data.wind.speed * 0.868976, // mph to knots
      windDirection: data.wind.deg,
      description: data.weather[0].description,
      timestamp: new Date(data.dt * 1000)
    };
  },

  estimateCeiling(cloudCoverage: number): number {
    if (cloudCoverage < 10) return 10000;
    if (cloudCoverage < 30) return 5000;
    if (cloudCoverage < 60) return 3000;
    if (cloudCoverage < 80) return 1500;
    return 500;
  },

  assessSafety(weather: WeatherConditions, trainingLevel: TrainingLevel) {
    const minimums = WEATHER_MINIMUMS[trainingLevel];
    let score = 100;
    const issues: string[] = [];

    if (weather.visibility < minimums.visibility) {
      issues.push(`Low visibility: ${weather.visibility.toFixed(1)} mi`);
      score -= 30;
    }
    if (weather.ceiling < minimums.ceiling) {
      issues.push(`Low ceiling: ${weather.ceiling} ft`);
      score -= 25;
    }
    if (weather.windSpeed > minimums.windSpeed) {
      issues.push(`High winds: ${weather.windSpeed.toFixed(0)} kt`);
      score -= 20;
    }
    if (weather.description.includes('thunder')) {
      issues.push('Thunderstorms');
      score -= 50;
    }

    const status = score >= 80 ? 'safe' : score >= 50 ? 'marginal' : 'dangerous';
    return { status, score: Math.max(0, score), reason: issues.join('; ') };
  },

  async checkFlightPath(waypoints: { lat: number; lon: number; time: Date }[], trainingLevel: TrainingLevel) {
    const checkpoints = [];
    for (const waypoint of waypoints) {
      const weather = await this.getWeatherAtLocation(waypoint.lat, waypoint.lon);
      const safety = this.assessSafety(weather, trainingLevel);
      checkpoints.push({
        location: { lat: waypoint.lat, lon: waypoint.lon },
        time: waypoint.time,
        weather,
        safetyStatus: safety.status,
        safetyScore: safety.score,
        reason: safety.reason
      });
      await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
    }
    return checkpoints;
  }
};
```

---

## Step 3: Flight Path Calculations

**File: `src/utils/calculations.ts`**
```typescript
import { Waypoint, Location } from '../types';

export const calculations = {
  toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  },

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3440.065; // Earth radius in nautical miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + 
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
              Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  intermediatePoint(lat1: number, lon1: number, lat2: number, lon2: number, fraction: number) {
    const φ1 = this.toRadians(lat1);
    const λ1 = this.toRadians(lon1);
    const φ2 = this.toRadians(lat2);
    const λ2 = this.toRadians(lon2);
    const δ = 2 * Math.asin(Math.sqrt(
      Math.sin((φ2 - φ1) / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2
    ));
    const a = Math.sin((1 - fraction) * δ) / Math.sin(δ);
    const b = Math.sin(fraction * δ) / Math.sin(δ);
    const x = a * Math.cos(φ1) * Math.cos(λ1) + b * Math.cos(φ2) * Math.cos(λ2);
    const y = a * Math.cos(φ1) * Math.sin(λ1) + b * Math.cos(φ2) * Math.sin(λ2);
    const z = a * Math.sin(φ1) + b * Math.sin(φ2);
    return {
      lat: Math.atan2(z, Math.sqrt(x ** 2 + y ** 2)) * (180 / Math.PI),
      lon: Math.atan2(y, x) * (180 / Math.PI)
    };
  },

  generateWaypoints(departure: Location, arrival: Location, spacingNM: number = 50, altitude: number = 5000): Waypoint[] {
    const totalDistance = this.calculateDistance(departure.lat, departure.lon, arrival.lat, arrival.lon);
    const numWaypoints = Math.ceil(totalDistance / spacingNM);
    const waypoints: Waypoint[] = [];

    for (let i = 0; i <= numWaypoints; i++) {
      const fraction = i / numWaypoints;
      const point = this.intermediatePoint(departure.lat, departure.lon, arrival.lat, arrival.lon, fraction);
      waypoints.push({
        lat: point.lat,
        lon: point.lon,
        altitude,
        time: new Date(),
        distanceFromStart: totalDistance * fraction
      });
    }
    return waypoints;
  },

  calculateETAs(waypoints: Waypoint[], departureTime: Date, averageSpeed: number = 120): Waypoint[] {
    return waypoints.map(waypoint => ({
      ...waypoint,
      time: new Date(departureTime.getTime() + (waypoint.distanceFromStart / averageSpeed) * 60 * 60 * 1000)
    }));
  }
};
```

---

## Step 4: AI Service

**File: `src/services/aiService.ts`**
```typescript
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';
import { RescheduleOption, WeatherReport, TrainingLevel } from '../types';

const functions = getFunctions();
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
          overallSafety: weatherReport.overallSafety,
          overallScore: weatherReport.overallScore
        },
        trainingLevel,
        originalTime: originalTime.toISOString()
      });
      return result.data as RescheduleOption[];
    } catch (error) {
      // Fallback options
      return [
        {
          newTime: new Date(originalTime.getTime() + 2 * 60 * 60 * 1000),
          reasoning: 'Weather should improve in 2 hours',
          expectedWeather: 'Better conditions',
          safetyImprovement: 'Allows time for weather to clear',
          confidence: 70
        },
        {
          newTime: new Date(originalTime.getTime() + 4 * 60 * 60 * 1000),
          reasoning: 'Extended delay for safer conditions',
          expectedWeather: 'Significantly better',
          safetyImprovement: 'High probability of clear weather',
          confidence: 85
        }
      ];
    }
  }
};
```

---

## Step 5: Flight Form Component

**File: `src/components/flights/FlightForm.tsx`**
```typescript
import React, { useState } from 'react';
import { User, Flight } from '../../types';
import { useFlights } from '../../hooks/useFlights';
import { calculations } from '../../utils/calculations';
import { weatherService } from '../../services/weatherService';

const AIRPORTS = {
  'ORD': { name: 'Chicago O\'Hare', lat: 41.9742, lon: -87.9073 },
  'JFK': { name: 'New York JFK', lat: 40.6413, lon: -73.7781 },
  'LAX': { name: 'Los Angeles', lat: 33.9416, lon: -118.4085 }
};

export const FlightForm: React.FC<{ user: User; onClose: () => void }> = ({ user, onClose }) => {
  const { createFlight } = useFlights(user.uid);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ departureCode: 'ORD', arrivalCode: 'JFK', date: '', time: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const departure = AIRPORTS[formData.departureCode as keyof typeof AIRPORTS];
      const arrival = AIRPORTS[formData.arrivalCode as keyof typeof AIRPORTS];
      const scheduledTime = new Date(`${formData.date}T${formData.time}`);

      // Generate waypoints
      const waypoints = calculations.generateWaypoints(
        { lat: departure.lat, lon: departure.lon, name: departure.name },
        { lat: arrival.lat, lon: arrival.lon, name: arrival.name }
      );
      const waypointsWithETA = calculations.calculateETAs(waypoints, scheduledTime, 120);

      // Check weather
      const checkpoints = await weatherService.checkFlightPath(
        waypointsWithETA.map(w => ({ lat: w.lat, lon: w.lon, time: w.time })),
        user.trainingLevel
      );

      // Determine safety
      const unsafeCheckpoints = checkpoints.filter(c => c.safetyStatus === 'dangerous');
      const overallSafety = unsafeCheckpoints.length > 0 ? 'dangerous' : 
                           checkpoints.some(c => c.safetyStatus === 'marginal') ? 'marginal' : 'safe';

      // Create flight
      const flight: Omit<Flight, 'id'> = {
        userId: user.uid,
        departure: { lat: departure.lat, lon: departure.lon, name: departure.name },
        arrival: { lat: arrival.lat, lon: arrival.lon, name: arrival.name },
        scheduledTime,
        studentName: user.displayName,
        trainingLevel: user.trainingLevel,
        path: {
          waypoints: waypointsWithETA,
          totalDistance: calculations.calculateDistance(departure.lat, departure.lon, arrival.lat, arrival.lon),
          estimatedDuration: (waypointsWithETA[waypointsWithETA.length - 1].time.getTime() - scheduledTime.getTime()) / (60 * 1000)
        },
        safetyStatus: overallSafety,
        status: 'scheduled',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await createFlight(flight);
      onClose();
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flight-form">
      <select value={formData.departureCode} onChange={(e) => setFormData({ ...formData, departureCode: e.target.value })}>
        {Object.entries(AIRPORTS).map(([code, airport]) => (
          <option key={code} value={code}>{code} - {airport.name}</option>
        ))}
      </select>
      <select value={formData.arrivalCode} onChange={(e) => setFormData({ ...formData, arrivalCode: e.target.value })}>
        {Object.entries(AIRPORTS).map(([code, airport]) => (
          <option key={code} value={code}>{code} - {airport.name}</option>
        ))}
      </select>
      <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
      <input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} required />
      <button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Flight'}</button>
      <button type="button" onClick={onClose}>Cancel</button>
    </form>
  );
};
```

---

## Checklist

- [ ] Firebase Functions deployed
- [ ] Weather service working
- [ ] Safety logic implemented
- [ ] Flight path calculations correct
- [ ] AI service connected
- [ ] Flight form creates flights with weather check
- [ ] Weather checkpoints saved

---

**Next:** Move to TASK-3.md for 3D Visualization

