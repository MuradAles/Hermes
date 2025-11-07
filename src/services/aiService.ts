import { httpsCallable } from 'firebase/functions';
import type { RescheduleOption, WeatherReport, TrainingLevel } from '../types';
import { functions } from './firebase';

const generateRescheduleFunction = httpsCallable(functions, 'generateReschedule');

export const aiService = {
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

