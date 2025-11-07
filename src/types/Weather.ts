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

