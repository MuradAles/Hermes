import { httpsCallable } from 'firebase/functions';
import type { WeatherConditions, WeatherCheckpoint, TrainingLevel } from '../types';
import { functions } from './firebase';

const getWeatherFunction = httpsCallable(functions, 'getWeather');

const WEATHER_MINIMUMS = {
  'student-pilot': { visibility: 5, ceiling: 3000, windSpeed: 10 },
  'private-pilot': { visibility: 3, ceiling: 1000, windSpeed: 20 },
  'instrument-rated': { visibility: 0, ceiling: 0, windSpeed: 35 },
};

export const weatherService = {
  /**
   * Get weather conditions at a specific location
   */
  async getWeatherAtLocation(lat: number, lon: number): Promise<WeatherConditions> {
    try {
      const result = await getWeatherFunction({ lat, lon });
      const data = result.data as any;

      return {
        temperature: data.main.temp,
        cloudCoverage: data.clouds.all,
        ceiling: this.estimateCeiling(data.clouds.all),
        visibility: data.visibility / 1609, // meters to miles
        windSpeed: data.wind.speed, // Already in mph from API with units=imperial
        windDirection: data.wind.deg,
        description: data.weather[0].description,
        timestamp: new Date(data.dt * 1000),
      };
    } catch (error) {
      console.warn('Weather API unavailable, using mock data:', error);
      // Return mock data when API is unavailable
      return this.getMockWeather(lat, lon);
    }
  },

  /**
   * Generate mock weather data for testing
   */
  getMockWeather(lat: number, lon: number): WeatherConditions {
    // Generate realistic but random weather
    const cloudCoverage = Math.floor(Math.random() * 100);
    return {
      temperature: 65 + Math.random() * 20,
      cloudCoverage,
      ceiling: this.estimateCeiling(cloudCoverage),
      visibility: 5 + Math.random() * 5,
      windSpeed: 5 + Math.random() * 15,
      windDirection: Math.floor(Math.random() * 360),
      description: cloudCoverage > 70 ? 'overcast clouds' : cloudCoverage > 40 ? 'scattered clouds' : 'clear sky',
      timestamp: new Date(),
    };
  },

  /**
   * Estimate ceiling based on cloud coverage
   * Returns estimated ceiling in feet AGL
   */
  estimateCeiling(cloudCoverage: number): number {
    if (cloudCoverage < 10) return 10000; // Clear
    if (cloudCoverage < 30) return 5000; // Few clouds
    if (cloudCoverage < 60) return 3000; // Scattered
    if (cloudCoverage < 80) return 1500; // Broken
    return 500; // Overcast
  },

  /**
   * Assess safety of weather conditions for a given training level
   */
  assessSafety(
    weather: WeatherConditions,
    trainingLevel: TrainingLevel
  ): { status: 'safe' | 'marginal' | 'dangerous'; score: number; reason: string } {
    const minimums = WEATHER_MINIMUMS[trainingLevel];
    let score = 100;
    const issues: string[] = [];

    // Check visibility
    if (weather.visibility < minimums.visibility) {
      const deficit = minimums.visibility - weather.visibility;
      issues.push(`Low visibility: ${weather.visibility.toFixed(1)} mi (need ${minimums.visibility} mi)`);
      score -= Math.min(30, deficit * 10);
    }

    // Check ceiling
    if (weather.ceiling < minimums.ceiling) {
      const deficit = (minimums.ceiling - weather.ceiling) / 100;
      issues.push(`Low ceiling: ${weather.ceiling} ft (need ${minimums.ceiling} ft)`);
      score -= Math.min(25, deficit * 2);
    }

    // Check wind speed
    if (weather.windSpeed > minimums.windSpeed) {
      const excess = weather.windSpeed - minimums.windSpeed;
      issues.push(`High winds: ${weather.windSpeed.toFixed(0)} kt (max ${minimums.windSpeed} kt)`);
      score -= Math.min(20, excess * 2);
    }

    // Check for thunderstorms or severe weather
    if (weather.description.toLowerCase().includes('thunder')) {
      issues.push('Thunderstorms present');
      score -= 50;
    }
    if (weather.description.toLowerCase().includes('tornado')) {
      issues.push('Tornado warning');
      score = 0;
    }

    // Determine overall status
    score = Math.max(0, score);
    let status: 'safe' | 'marginal' | 'dangerous';
    if (score >= 80) {
      status = 'safe';
    } else if (score >= 50) {
      status = 'marginal';
    } else {
      status = 'dangerous';
    }

    return {
      status,
      score,
      reason: issues.length > 0 ? issues.join('; ') : 'Conditions acceptable',
    };
  },

  /**
   * Check weather along entire flight path
   */
  async checkFlightPath(
    waypoints: Array<{ lat: number; lon: number; time: Date }>,
    trainingLevel: TrainingLevel
  ): Promise<WeatherCheckpoint[]> {
    const checkpoints: WeatherCheckpoint[] = [];

    for (const waypoint of waypoints) {
      try {
        const weather = await this.getWeatherAtLocation(waypoint.lat, waypoint.lon);
        const safety = this.assessSafety(weather, trainingLevel);

        checkpoints.push({
          location: { lat: waypoint.lat, lon: waypoint.lon },
          time: waypoint.time,
          weather,
          safetyStatus: safety.status,
          safetyScore: safety.score,
          reason: safety.reason,
        });

        // Rate limiting: wait 200ms between API calls
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error checking weather at waypoint:`, error);
        // Continue with remaining waypoints
      }
    }

    return checkpoints;
  },

  /**
   * Get overall safety status from checkpoints
   */
  getOverallSafety(checkpoints: WeatherCheckpoint[]): {
    status: 'safe' | 'marginal' | 'dangerous';
    score: number;
  } {
    if (checkpoints.length === 0) {
      return { status: 'dangerous', score: 0 };
    }

    // If any checkpoint is dangerous, overall is dangerous
    const dangerousCount = checkpoints.filter((c) => c.safetyStatus === 'dangerous').length;
    if (dangerousCount > 0) {
      return { status: 'dangerous', score: 0 };
    }

    // If more than 25% are marginal, overall is marginal
    const marginalCount = checkpoints.filter((c) => c.safetyStatus === 'marginal').length;
    if (marginalCount / checkpoints.length > 0.25) {
      const avgScore = checkpoints.reduce((sum, c) => sum + c.safetyScore, 0) / checkpoints.length;
      return { status: 'marginal', score: avgScore };
    }

    // Otherwise safe
    const avgScore = checkpoints.reduce((sum, c) => sum + c.safetyScore, 0) / checkpoints.length;
    return { status: 'safe', score: avgScore };
  },
};

