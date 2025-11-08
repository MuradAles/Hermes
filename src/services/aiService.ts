import { httpsCallable } from 'firebase/functions';
import type { RescheduleOption, WeatherReport, TrainingLevel, WeatherCheckpoint } from '../types';
import { functions } from './firebase';
import { weatherService } from './weatherService';
import { calculations } from '../utils/calculations';

const generateRescheduleFunction = httpsCallable(functions, 'generateReschedule');

export const aiService = {
  /**
   * AI-powered safe time finder
   * Automatically searches for a safe flight time within the next 5 days
   */
  async findSafeFlightTime(
    departure: { lat: number; lon: number },
    arrival: { lat: number; lon: number },
    trainingLevel: TrainingLevel,
    preferredStartDate: Date,
    onProgress?: (message: string, attempt: number) => void
  ): Promise<{
    success: boolean;
    scheduledTime: Date | null;
    checkpoints: WeatherCheckpoint[] | null;
    attempts: number;
    reason: string;
    allResults?: Array<{
      scheduledTime: Date;
      safety: { status: string; score: number } | null;
      waypointCount: number;
      topIssues: string[];
      checkpoints: WeatherCheckpoint[] | null;
    }>;
  }> {
    const maxAttempts = 20; // Check up to 20 different times
    let attempts = 0;

    // Generate time slots to check (every 6 hours for next 5 days)
    const timeSlotsToCheck: Date[] = [];
    const startTime = new Date(preferredStartDate);
    startTime.setHours(6, 0, 0, 0); // Start at 6 AM

    for (let day = 0; day < 5; day++) {
      for (let hour = 6; hour <= 18; hour += 6) {
        const timeSlot = new Date(startTime);
        timeSlot.setDate(timeSlot.getDate() + day);
        timeSlot.setHours(hour, 0, 0, 0);
        if (timeSlot > new Date()) {
          timeSlotsToCheck.push(timeSlot);
        }
      }
    }

    // Check all time slots IN PARALLEL for speed!
    if (onProgress) {
      onProgress(`Checking ${timeSlotsToCheck.length} time slots in parallel...`, 0);
    }

    // Create all weather check promises at once
    const weatherCheckPromises = timeSlotsToCheck.slice(0, maxAttempts).map(async (scheduledTime) => {
      try {
        // Generate waypoints
        const waypoints = calculations.generateWaypoints(departure, arrival, 50);
        const waypointsWithETA = calculations.calculateETAs(waypoints, scheduledTime, 120);

        // Check weather
        const checkpoints = await weatherService.checkFlightPath(
          waypointsWithETA.map((w) => ({ lat: w.lat, lon: w.lon, time: w.time })),
          trainingLevel
        );

        const overallSafety = weatherService.getOverallSafety(checkpoints);

        return {
          scheduledTime,
          checkpoints,
          safety: overallSafety,
          error: null
        };
      } catch (error) {
        return {
          scheduledTime,
          checkpoints: null,
          safety: null,
          error: error as Error
        };
      }
    });

    // Wait for all checks to complete
    if (onProgress) {
      onProgress(`Analyzing weather at ${weatherCheckPromises.length} different times...`, weatherCheckPromises.length);
    }

    const results = await Promise.all(weatherCheckPromises);
    attempts = results.length;

    // Prepare summary of all results for display
    const allResults = results.map(r => {
      const topIssues: string[] = [];
      
      if (r.checkpoints) {
        // Get top 3 issues from checkpoints
        const issues = r.checkpoints
          .filter(c => c.reason && c.safetyStatus !== 'safe')
          .map(c => c.reason)
          .filter((v, i, a) => a.indexOf(v) === i) // unique
          .slice(0, 3);
        topIssues.push(...issues);
      } else if (r.error) {
        topIssues.push('Error checking weather');
      }

      return {
        scheduledTime: r.scheduledTime,
        safety: r.safety || { status: 'error', score: 0 },
        waypointCount: r.checkpoints?.length || 0,
        topIssues,
        checkpoints: r.checkpoints || null
      };
    }).sort((a, b) => {
      // Sort by safety: safe first, then marginal, then dangerous
      const order = { safe: 0, marginal: 1, dangerous: 2, error: 3 };
      return (order[a.safety.status as keyof typeof order] || 3) - (order[b.safety.status as keyof typeof order] || 3);
    });

    // Find first safe result
    const safeResult = results.find(r => r.safety?.status === 'safe' && r.checkpoints);

    if (safeResult && safeResult.checkpoints) {
      const timeStr = safeResult.scheduledTime.toLocaleString();
      return {
        success: true,
        scheduledTime: safeResult.scheduledTime,
        checkpoints: safeResult.checkpoints,
        attempts,
        reason: `Found safe conditions at ${timeStr}! All ${safeResult.checkpoints.length} waypoints are safe.`,
        allResults
      };
    }

    // No safe time found
    return {
      success: false,
      scheduledTime: null,
      checkpoints: null,
      attempts,
      reason: `Checked ${attempts} time slots but couldn't find safe conditions. Weather is challenging for your training level in the next 5 days. Consider:\n- Waiting for better weather\n- Choosing a different route\n- Getting more advanced training`,
      allResults
    };
  },
  /**
   * Generate AI-powered flight reschedule suggestions
   */
  async generateRescheduleOptions(
    weatherReport: WeatherReport,
    trainingLevel: TrainingLevel,
    originalTime: Date
  ): Promise<RescheduleOption[]> {
    try {
      const result = await generateRescheduleFunction({
        weatherData: {
          overallSafety: weatherReport.overallSafety,
          overallScore: weatherReport.overallScore,
        },
        trainingLevel,
        originalTime: originalTime.toISOString(),
      });

      const suggestions = result.data as RescheduleOption[];
      
      // Convert string dates to Date objects
      return suggestions.map((opt) => ({
        ...opt,
        newTime: typeof opt.newTime === 'string' ? new Date(opt.newTime) : opt.newTime,
      }));
    } catch (error) {
      console.error('Error generating reschedule options:', error);
      // Return fallback options
      return this.generateFallbackOptions(originalTime);
    }
  },

  /**
   * Generate fallback reschedule options when AI is unavailable
   */
  generateFallbackOptions(originalTime: Date): RescheduleOption[] {
    return [
      {
        newTime: new Date(originalTime.getTime() + 2 * 60 * 60 * 1000),
        reasoning: 'Weather typically improves after 2 hours',
        expectedWeather: 'Better conditions expected',
        safetyImprovement: 'Allows time for weather systems to pass',
        confidence: 70,
      },
      {
        newTime: new Date(originalTime.getTime() + 4 * 60 * 60 * 1000),
        reasoning: 'Extended delay for safer conditions',
        expectedWeather: 'Significantly better forecast',
        safetyImprovement: 'Higher probability of VFR conditions',
        confidence: 85,
      },
      {
        newTime: new Date(originalTime.getTime() + 24 * 60 * 60 * 1000),
        reasoning: 'Next day offers fresh weather patterns',
        expectedWeather: 'Clear skies anticipated',
        safetyImprovement: 'Optimal flying conditions likely',
        confidence: 90,
      },
    ];
  },
};

