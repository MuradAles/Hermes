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

