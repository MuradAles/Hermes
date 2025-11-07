import {onCall, HttpsError} from "firebase-functions/v2/https";
import {setGlobalOptions} from "firebase-functions/v2";
import * as admin from "firebase-admin";
import axios from "axios";
import OpenAI from "openai";
import * as logger from "firebase-functions/logger";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

admin.initializeApp();

// Set global options for cost control
setGlobalOptions({maxInstances: 10});

/**
 * Get weather data for a specific location
 */
export const getWeather = onCall(
  {
    cors: true, // Enable CORS for all origins
  },
  async (request) => {
    // Ensure authenticated
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Function requires authentication");
    }

    const {lat, lon} = request.data;

    if (!lat || !lon) {
      throw new HttpsError(
        "invalid-argument",
        "Latitude and longitude are required"
      );
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      throw new HttpsError(
        "failed-precondition",
        "OpenWeatherMap API key not configured"
      );
    }

    try {
      logger.info(`Fetching weather for lat: ${lat}, lon: ${lon}`);

      const response = await axios.get(
        "https://api.openweathermap.org/data/2.5/weather",
        {
          params: {
            lat,
            lon,
            appid: apiKey,
            units: "imperial",
          },
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error("Error fetching weather:", error);
      throw new HttpsError(
        "internal",
        `Failed to fetch weather data: ${error.message}`
      );
    }
  }
);

/**
 * Generate AI-powered flight reschedule suggestions
 */
export const generateReschedule = onCall(
  {
    cors: true, // Enable CORS for all origins
  },
  async (request) => {
    // Ensure authenticated
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Function requires authentication");
    }

    const {weatherData, trainingLevel, originalTime} = request.data;

    if (!weatherData || !trainingLevel || !originalTime) {
      throw new HttpsError(
        "invalid-argument",
        "Weather data, training level, and original time are required"
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Return fallback suggestions if OpenAI is not configured
      logger.warn("OpenAI not configured, returning fallback suggestions");
      return generateFallbackSuggestions(originalTime);
    }

    const openai = new OpenAI({apiKey});

    try {
      logger.info(`Generating reschedule for ${trainingLevel} at ${originalTime}`);

      const prompt = `You are a flight scheduling assistant for aviation training. 
Given the current weather conditions and pilot training level, suggest 3 alternative flight times.

Weather: ${JSON.stringify(weatherData)}
Training Level: ${trainingLevel}
Original Time: ${originalTime}

Return ONLY a JSON array with 3 objects, each containing:
- newTime: ISO string (within next 48 hours)
- reasoning: brief explanation (max 20 words)
- expectedWeather: short description (max 10 words)
- safetyImprovement: what improves (max 15 words)
- confidence: number 0-100

Example format:
[{"newTime":"2025-11-08T14:00:00Z","reasoning":"Weather clears in afternoon","expectedWeather":"Clear skies","safetyImprovement":"Better visibility and lower winds","confidence":85}]`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a flight scheduling assistant. Return only valid JSON arrays.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const content = completion.choices[0].message.content || "[]";

      try {
        const suggestions = JSON.parse(content);
        return suggestions;
      } catch (parseError) {
        logger.error("Failed to parse AI response:", content);
        return generateFallbackSuggestions(originalTime);
      }
    } catch (error: any) {
      logger.error("Error generating reschedule:", error);
      // Return fallback suggestions on error
      return generateFallbackSuggestions(originalTime);
    }
  }
);

/**
 * Generate fallback reschedule suggestions when AI is unavailable
 */
function generateFallbackSuggestions(originalTime: string) {
  const original = new Date(originalTime);

  return [
    {
      newTime: new Date(original.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      reasoning: "Weather typically improves after 2 hours",
      expectedWeather: "Better conditions expected",
      safetyImprovement: "Allows time for weather systems to pass",
      confidence: 70,
    },
    {
      newTime: new Date(original.getTime() + 4 * 60 * 60 * 1000).toISOString(),
      reasoning: "Extended delay for safer conditions",
      expectedWeather: "Significantly better forecast",
      safetyImprovement: "Higher probability of VFR conditions",
      confidence: 85,
    },
    {
      newTime: new Date(original.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      reasoning: "Next day offers fresh weather patterns",
      expectedWeather: "Clear skies anticipated",
      safetyImprovement: "Optimal flying conditions likely",
      confidence: 90,
    },
  ];
}
