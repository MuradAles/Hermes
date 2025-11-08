export interface WeatherConditions {
  temperature: number;
  cloudCoverage: number;
  ceiling: number;
  visibility: number;
  windSpeed: number;
  windDirection: number;
  description: string;
  timestamp: Date;
  weatherId?: number; // Weather condition code from OpenWeatherMap
  precipitation?: number; // Precipitation amount
}

// Weather minimums for each training level
export interface WeatherMinimums {
  visibility: number; // miles
  ceiling: number; // feet
  windSpeed: number; // knots
  description: string;
}

export const TRAINING_LEVEL_MINIMUMS: Record<string, WeatherMinimums> = {
  'level-1': {
    visibility: 5,
    ceiling: 3000,
    windSpeed: 10,
    description: 'Beginner - Clear skies only',
  },
  'student-pilot': {
    visibility: 5,
    ceiling: 3000,
    windSpeed: 10,
    description: 'Student Pilot - Clear skies only',
  },
  'level-2': {
    visibility: 4,
    ceiling: 2500,
    windSpeed: 15,
    description: 'Advanced Beginner - Clear to scattered clouds',
  },
  'private-pilot': {
    visibility: 4,
    ceiling: 2500,
    windSpeed: 15,
    description: 'Private Pilot - Clear to scattered clouds',
  },
  'level-3': {
    visibility: 3,
    ceiling: 1000,
    windSpeed: 20,
    description: 'Intermediate - VFR conditions',
  },
  'commercial-pilot': {
    visibility: 3,
    ceiling: 1000,
    windSpeed: 20,
    description: 'Commercial Pilot - VFR conditions',
  },
  'level-4': {
    visibility: 0,
    ceiling: 0,
    windSpeed: 30,
    description: 'Advanced/Instrument Rated - IMC acceptable, no thunderstorms/icing',
  },
  'instrument-rated': {
    visibility: 0,
    ceiling: 0,
    windSpeed: 30,
    description: 'Instrument Rated - IMC acceptable, no thunderstorms/icing',
  },
};

// Color status for UI display
export type SafetyColor = 'GREEN' | 'YELLOW' | 'RED';

export interface WeatherCheckpoint {
  location: { lat: number; lon: number };
  time: Date;
  weather: WeatherConditions;
  safetyStatus: 'safe' | 'marginal' | 'dangerous';
  safetyScore: number;
  reason?: string;
}

export interface WeatherReport {
  checkpoints: WeatherCheckpoint[];
  overallSafety: 'safe' | 'marginal' | 'dangerous';
  overallScore: number;
  timestamp: Date;
}

export interface RescheduleOption {
  newTime: Date | string;
  reasoning: string;
  expectedWeather: string;
  safetyImprovement: string;
  confidence: number;
}

