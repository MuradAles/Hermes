// VERSION: 2025-11-08-V3 - Improved ceiling estimation with weather type intelligence
import { httpsCallable } from 'firebase/functions';
import type { WeatherConditions, WeatherCheckpoint, TrainingLevel, SafetyColor } from '../types';
import { TRAINING_LEVEL_MINIMUMS } from '../types/Weather';
import { functions } from './firebase';

const getWeatherFunction = httpsCallable(functions, 'getWeather');

export const weatherService = {
  /**
   * Get weather conditions at a specific location
   * @param lat - Latitude
   * @param lon - Longitude
   * @param time - Optional: ISO string or Date for forecast weather at that time
   */
  async getWeatherAtLocation(lat: number, lon: number, time?: Date | string): Promise<WeatherConditions> {
    try {
      // Convert time to ISO string if it's a Date object
      const timeParam = time instanceof Date ? time.toISOString() : time;
      
      const result = await getWeatherFunction({ lat, lon, time: timeParam });
      
      const data = result.data as { 
        main?: { temp?: number }; 
        clouds?: { all?: number }; 
        visibility?: number; 
        wind?: { speed?: number; deg?: number }; 
        weather?: Array<{ description?: string; id?: number }>; 
        dt?: number;
        rain?: { '1h'?: number };
        snow?: { '1h'?: number };
      };

      // Validate that we have the minimum required data
      if (!data || !data.main || !data.clouds || !data.wind || !data.weather || !Array.isArray(data.weather) || data.weather.length === 0) {
        console.warn('Incomplete weather data received, using mock data', data);
        return this.getMockWeather(lat, lon);
      }

      // Ensure visibility has a valid value (forecast API sometimes omits this field)
      // Default to 10000 meters (6.2 miles) if missing
      const visibilityInMeters = (data.visibility !== undefined && data.visibility !== null) ? data.visibility : 10000;

      const visibilityInMiles = visibilityInMeters / 1609; // meters to miles
      const weatherId = data.weather[0]?.id ?? 800;
      const cloudCoverage = data.clouds.all ?? 0;
      const ceiling = this.estimateCeiling(cloudCoverage, weatherId, visibilityInMiles);
      
      return {
        temperature: data.main.temp ?? 70,
        cloudCoverage,
        ceiling,
        visibility: visibilityInMiles,
        windSpeed: data.wind.speed ?? 0, // Already in mph from API with units=imperial
        windDirection: data.wind.deg ?? 0,
        description: data.weather[0]?.description ?? 'clear',
        timestamp: new Date(data.dt ? data.dt * 1000 : Date.now()),
        weatherId, // Weather condition code
        precipitation: data.rain?.['1h'] || data.snow?.['1h'] || 0, // Precipitation in mm
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getMockWeather(_lat: number, _lon: number): WeatherConditions {
    // Generate realistic but random weather
    const cloudCoverage = Math.floor(Math.random() * 100);
    const visibility = 5 + Math.random() * 5;
    const weatherId = 800; // Clear weather code
    
    return {
      temperature: 65 + Math.random() * 20,
      cloudCoverage,
      ceiling: this.estimateCeiling(cloudCoverage, weatherId, visibility),
      visibility,
      windSpeed: 5 + Math.random() * 15,
      windDirection: Math.floor(Math.random() * 360),
      description: cloudCoverage > 70 ? 'overcast clouds' : cloudCoverage > 40 ? 'scattered clouds' : 'clear sky',
      timestamp: new Date(),
      weatherId,
      precipitation: 0, // No precipitation in mock weather
    };
  },

  /**
   * Estimate ceiling based on cloud coverage and weather conditions
   * Returns estimated ceiling in feet AGL
   * 
   * NOTE: OpenWeatherMap doesn't provide actual ceiling data, only cloud %.
   * This is a rough estimate. For real aviation, use METAR/TAF data.
   */
  estimateCeiling(cloudCoverage: number, weatherId?: number, visibility?: number): number {
    // Clear skies
    if (cloudCoverage < 10) return 25000;
    
    // Few clouds (1-2 oktas)
    if (cloudCoverage < 30) return 12000;
    
    // Scattered clouds (3-4 oktas)
    if (cloudCoverage < 60) return 8000;
    
    // Broken clouds (5-7 oktas) - variable ceiling based on conditions
    if (cloudCoverage < 80) {
      // Low visibility suggests lower clouds
      if (visibility !== undefined && visibility < 3) return 1000;
      if (visibility !== undefined && visibility < 5) return 2000;
      return 4500; // Default for broken clouds
    }
    
    // Overcast (8 oktas) - ceiling varies widely based on weather type
    // Check for specific weather conditions using weather ID
    if (weatherId !== undefined) {
      // Thunderstorm (200-299): very low ceilings
      if (weatherId >= 200 && weatherId < 300) return 800;
      
      // Drizzle/Rain (300-599): low to moderate ceilings
      if (weatherId >= 300 && weatherId < 600) {
        // Heavy rain = lower ceiling
        if (weatherId >= 500 && weatherId < 600) return 1200;
        return 2500; // Light rain/drizzle
      }
      
      // Snow (600-699): moderate ceilings
      if (weatherId >= 600 && weatherId < 700) return 2000;
      
      // Fog/Mist (700-799): very low ceilings
      if (weatherId >= 700 && weatherId < 800) return 500;
    }
    
    // Default overcast ceiling (high overcast is common)
    // Use visibility as a proxy for ceiling height
    if (visibility !== undefined) {
      if (visibility < 1) return 500;   // Very low visibility = low ceiling
      if (visibility < 3) return 1500;  // Low visibility = low ceiling
      if (visibility < 5) return 3000;  // Reduced visibility = moderate ceiling
      if (visibility < 8) return 5000;  // Good visibility = higher ceiling
    }
    
    // High overcast (common in stable weather)
    return 6000;
  },

  /**
   * Check for thunderstorms using weather condition codes
   * OpenWeatherMap codes 200-299 are thunderstorm conditions
   */
  hasThunderstorms(weather: WeatherConditions): boolean {
    return (weather.weatherId && weather.weatherId >= 200 && weather.weatherId < 300) ||
           weather.description.toLowerCase().includes('thunder');
  },

  /**
   * Check for icing conditions (temperature below freezing + precipitation)
   */
  hasIcingConditions(weather: WeatherConditions): boolean {
    return weather.temperature <= 32 && (weather.precipitation || 0) > 0;
  },

  /**
   * Assess safety of weather conditions for a given training level
   * Returns both legacy status and new color coding
   */
  assessSafety(
    weather: WeatherConditions,
    trainingLevel: TrainingLevel
  ): { status: 'safe' | 'marginal' | 'dangerous'; score: number; reason: string; color: SafetyColor } {
    // Safety check: ensure weather data is valid and has all required properties
    if (!weather || 
        typeof weather !== 'object' ||
        typeof weather.visibility !== 'number' || 
        typeof weather.ceiling !== 'number' || 
        typeof weather.windSpeed !== 'number') {
      console.error('assessSafety called with invalid weather:', weather);
      return {
        status: 'dangerous',
        score: 0,
        reason: 'Weather data unavailable or incomplete',
        color: 'RED',
      };
    }

    const minimums = TRAINING_LEVEL_MINIMUMS[trainingLevel];
    
    // Fallback if training level not found
    if (!minimums) {
      console.error('Unknown training level:', trainingLevel);
      console.error('Available levels:', Object.keys(TRAINING_LEVEL_MINIMUMS));
      return {
        status: 'dangerous',
        score: 0,
        reason: `Unknown training level: ${trainingLevel}`,
        color: 'RED',
      };
    }
    
    let score = 100;
    const issues: string[] = [];

    // Check for thunderstorms (dangerous for all levels)
    const hasThunderstorms = this.hasThunderstorms(weather);
    if (hasThunderstorms) {
      issues.push('Thunderstorms present');
      score = 0;
      return {
        status: 'dangerous',
        score: 0,
        reason: issues.join('; '),
        color: 'RED',
      };
    }

    // Check for icing (dangerous for Level 1-3, marginal for Level 4)
    const hasIcing = this.hasIcingConditions(weather);
    if (hasIcing) {
      issues.push('Icing conditions detected');
      if (trainingLevel !== 'level-4') {
        score = 0;
        return {
          status: 'dangerous',
          score: 0,
          reason: issues.join('; '),
          color: 'RED',
        };
      } else {
        score -= 30; // Marginal for Level 4
      }
    }

    // Check visibility (with additional safety check)
    if (minimums.visibility > 0 && typeof weather.visibility === 'number' && weather.visibility < minimums.visibility) {
      const deficit = minimums.visibility - weather.visibility;
      issues.push(`Low visibility: ${weather.visibility.toFixed(1)} mi (need ${minimums.visibility} mi)`);
      score -= Math.min(30, deficit * 10);
    }

    // Check ceiling (with additional safety check)
    if (minimums.ceiling > 0 && typeof weather.ceiling === 'number' && weather.ceiling < minimums.ceiling) {
      const deficit = (minimums.ceiling - weather.ceiling) / 100;
      issues.push(`Low ceiling: ${weather.ceiling} ft (need ${minimums.ceiling} ft)`);
      score -= Math.min(25, deficit * 2);
    }

    // Check wind speed (with additional safety check)
    if (typeof weather.windSpeed === 'number' && weather.windSpeed > minimums.windSpeed) {
      const excess = weather.windSpeed - minimums.windSpeed;
      issues.push(`High winds: ${weather.windSpeed.toFixed(0)} kt (max ${minimums.windSpeed} kt)`);
      score -= Math.min(20, excess * 2);
    }

    // Determine overall status and color
    score = Math.max(0, score);
    let status: 'safe' | 'marginal' | 'dangerous';
    let color: SafetyColor;

    if (score >= 80) {
      status = 'safe';
      color = 'GREEN';
    } else if (score >= 50) {
      status = 'marginal';
      // Level 1-2 can only fly GREEN, so marginal is RED for them
      color = (trainingLevel === 'level-1' || trainingLevel === 'level-2') ? 'RED' : 'YELLOW';
    } else {
      status = 'dangerous';
      color = 'RED';
    }

    return {
      status,
      score,
      reason: issues.length > 0 ? issues.join('; ') : 'Conditions acceptable',
      color,
    };
  },

  /**
   * Check weather along entire flight path
   * Uses forecast weather based on arrival time at each waypoint
   */
  async checkFlightPath(
    waypoints: Array<{ lat: number; lon: number; time: Date }>,
    trainingLevel: TrainingLevel
  ): Promise<WeatherCheckpoint[]> {
    const checkpoints: WeatherCheckpoint[] = [];

    for (const waypoint of waypoints) {
      try {
        // Pass the waypoint arrival time to get forecast weather for that time
        const weather = await this.getWeatherAtLocation(
          waypoint.lat, 
          waypoint.lon, 
          waypoint.time
        );

        // CRITICAL: Validate weather object has all required properties
        if (!weather || typeof weather !== 'object') {
          console.error('Weather check failed: No weather data returned', weather);
          throw new Error('Weather API returned invalid data');
        }

        // Validate required weather properties exist
        if (typeof weather.visibility !== 'number' || 
            typeof weather.ceiling !== 'number' || 
            typeof weather.windSpeed !== 'number') {
          console.error('Weather check failed: Missing required properties', {
            visibility: weather.visibility,
            ceiling: weather.ceiling,
            windSpeed: weather.windSpeed,
            fullWeather: weather
          });
          throw new Error('Weather data is incomplete');
        }

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
        // STOP IMMEDIATELY - don't process remaining waypoints if ANY fails
        throw error;
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

