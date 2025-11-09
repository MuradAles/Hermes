import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {setGlobalOptions} from "firebase-functions/v2";
import * as admin from "firebase-admin";
import axios from "axios";
import OpenAI from "openai";
import * as logger from "firebase-functions/logger";
import * as dotenv from "dotenv";
import {monitorAllFlights} from "./weatherMonitor";
import {sendWeatherAlertEmail} from "./emailService";

// Load environment variables from .env file
dotenv.config();

admin.initializeApp();

// Set global options for cost control
setGlobalOptions({maxInstances: 10});

/**
 * Get weather data for a specific location
 * If time is provided, fetches forecast weather for that time
 * Otherwise, fetches current weather
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

    const {lat, lon, time} = request.data;

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
      // If time is provided, fetch forecast weather
      if (time) {
        const targetTime = new Date(time).getTime();
        const now = Date.now();
        
        // If target time is more than 5 days away, use current weather
        // (OpenWeatherMap free tier forecast only covers 5 days)
        if (targetTime > now + 5 * 24 * 60 * 60 * 1000) {
          logger.info(`Target time too far in future, using current weather for lat: ${lat}, lon: ${lon}`);
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
        }

        // Fetch 5-day forecast (3-hour intervals)
        logger.info(`Fetching forecast weather for lat: ${lat}, lon: ${lon}, time: ${time}`);
        const forecastResponse = await axios.get(
          "https://api.openweathermap.org/data/2.5/forecast",
          {
            params: {
              lat,
              lon,
              appid: apiKey,
              units: "imperial",
            },
          }
        );

        // Validate forecast response
        if (!forecastResponse.data || !forecastResponse.data.list || !Array.isArray(forecastResponse.data.list) || forecastResponse.data.list.length === 0) {
          logger.warn("Forecast API returned invalid data, falling back to current weather");
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
        }

        // Find the forecast entry closest to the target time
        const forecasts = forecastResponse.data.list;
        let closestForecast = forecasts[0];
        let minTimeDiff = Math.abs(new Date(closestForecast.dt * 1000).getTime() - targetTime);

        for (const forecast of forecasts) {
          const forecastTime = new Date(forecast.dt * 1000).getTime();
          const timeDiff = Math.abs(forecastTime - targetTime);
          
          if (timeDiff < minTimeDiff) {
            minTimeDiff = timeDiff;
            closestForecast = forecast;
          }
        }

        logger.info(`Found closest forecast: ${new Date(closestForecast.dt * 1000).toISOString()} (target: ${time})`);
        
        // Return forecast data in same format as current weather
        // Ensure all required fields have defaults
        return {
          ...closestForecast,
          main: closestForecast.main || {temp: 70, feels_like: 70, temp_min: 70, temp_max: 70, pressure: 1013, humidity: 50},
          weather: closestForecast.weather || [{id: 800, main: "Clear", description: "clear sky", icon: "01d"}],
          clouds: closestForecast.clouds || {all: 0},
          wind: closestForecast.wind || {speed: 0, deg: 0},
          visibility: closestForecast.visibility !== undefined ? closestForecast.visibility : 10000, // Default to 10km visibility
          dt: closestForecast.dt || Math.floor(Date.now() / 1000),
          rain: closestForecast.rain || undefined,
          snow: closestForecast.snow || undefined,
        };
      } else {
        // No time provided, fetch current weather
        logger.info(`Fetching current weather for lat: ${lat}, lon: ${lon}`);

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
      }
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

/**
 * Scheduled function to monitor weather hourly
 * NOTE: Requires Firebase Blaze (pay-as-you-go) plan
 * Runs every hour to check all scheduled flights
 */
export const hourlyWeatherMonitoring = onSchedule(
  {
    schedule: "every 1 hours",
    timeZone: "America/New_York", // Adjust to your timezone
    retryCount: 3,
    memory: "256MiB",
    secrets: ["GMAIL_USER", "GMAIL_APP_PASSWORD"],
  },
  async (event) => {
    logger.info("Hourly weather monitoring triggered", {time: event.scheduleTime});

    try {
      await monitorAllFlights();
      logger.info("Hourly weather monitoring completed successfully");
    } catch (error: any) {
      logger.error("Hourly weather monitoring failed:", error);
      throw error;
    }
  }
);

/**
 * Manual trigger for weather monitoring (for admin dashboard)
 * Can be called from admin page to force weather check
 */
export const triggerWeatherCheck = onCall(
  {
    cors: ["http://localhost:5174", "http://localhost:5173", "https://hermes-path.web.app", "https://hermes-path.firebaseapp.com"],
    secrets: ["GMAIL_USER", "GMAIL_APP_PASSWORD"],
  },
  async (request) => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in to trigger weather check");
    }

    logger.info("Manual weather check triggered by", request.auth.uid);

    try {
      await monitorAllFlights();
      return {success: true, message: "Weather check completed"};
    } catch (error: any) {
      logger.error("Manual weather check failed:", error);
      throw new HttpsError("internal", `Weather check failed: ${error.message}`);
    }
  }
);

/**
 * Send weather alert notifications to selected students (admin function)
 * Accepts array of flight IDs and sends emails to the students
 */
export const sendNotificationsToStudents = onCall(
  {
    cors: ["http://localhost:5174", "http://localhost:5173", "https://hermes-path.web.app", "https://hermes-path.firebaseapp.com"],
    secrets: ["GMAIL_USER", "GMAIL_APP_PASSWORD"],
  },
  async (request) => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be logged in to send notifications");
    }

    const {flightIds} = request.data;

    if (!flightIds || !Array.isArray(flightIds) || flightIds.length === 0) {
      throw new HttpsError(
        "invalid-argument",
        "flightIds array is required and must not be empty"
      );
    }

    logger.info(`Sending notifications to ${flightIds.length} student(s) for flights:`, flightIds);

    const db = admin.firestore();
    const results: Array<{flightId: string; success: boolean; error?: string}> = [];

    try {
      // Process each flight
      for (const flightId of flightIds) {
        try {
          // Get flight document
          const flightDoc = await db.collection("flights").doc(flightId).get();
          
          if (!flightDoc.exists) {
            results.push({
              flightId,
              success: false,
              error: "Flight not found",
            });
            continue;
          }

          const flight = flightDoc.data();
          if (!flight) {
            results.push({
              flightId,
              success: false,
              error: "Flight data is empty",
            });
            continue;
          }

          // Get user email from Firestore
          const userDoc = await db.collection("users").doc(flight.userId).get();
          if (!userDoc.exists) {
            results.push({
              flightId,
              success: false,
              error: "User not found",
            });
            continue;
          }

          const userData = userDoc.data();
          const userEmail = userData?.email;
          const userName = userData?.displayName || flight.studentName || "there";

          if (!userEmail) {
            results.push({
              flightId,
              success: false,
              error: "User has no email",
            });
            continue;
          }

          // Extract issues from weather data
          const issues: string[] = [];
          if (flight.weatherData && Array.isArray(flight.weatherData)) {
            flight.weatherData.forEach((checkpoint: any) => {
              if (checkpoint.reason && checkpoint.reason !== "Conditions acceptable") {
                issues.push(checkpoint.reason);
              }
            });
          }
          const uniqueIssues = Array.from(new Set(issues));

          // Format scheduled time
          const scheduledTime = flight.scheduledTime?.toDate 
            ? flight.scheduledTime.toDate() 
            : flight.scheduledTime instanceof Date 
              ? flight.scheduledTime 
              : new Date(flight.scheduledTime);

          // Send email
          await sendWeatherAlertEmail(
            userEmail,
            userName,
            {
              flightId: flightDoc.id,
              departure: flight.departure?.code || flight.departure?.name || "Unknown",
              arrival: flight.arrival?.code || flight.arrival?.name || "Unknown",
              scheduledTime: scheduledTime.toISOString(),
              safetyStatus: flight.safetyStatus || "dangerous",
              safetyScore: flight.weatherData?.[0]?.safetyScore || 0,
              issues: uniqueIssues.length > 0 ? uniqueIssues : ["Weather conditions may affect your flight"],
              trainingLevel: flight.trainingLevel || "level-1",
            }
          );

          // Update flight document with email sent timestamp
          await flightDoc.ref.update({
            emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Create in-app notification for the user
          try {
            await db.collection("notifications").add({
              userId: flight.userId,
              type: "manual_notification",
              title: "Weather Alert Notification",
              message: `You've been notified about your flight ${flight.departure?.code || "Unknown"} → ${flight.arrival?.code || "Unknown"} scheduled for ${scheduledTime.toLocaleDateString()}. Please check your email for details.`,
              flightId: flightDoc.id,
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            logger.info(`In-app notification created for user ${flight.userId} for flight ${flightId}`);
          } catch (notifError: any) {
            logger.error(`Failed to create in-app notification for flight ${flightId}:`, notifError);
            // Don't fail the whole operation if notification creation fails
          }

          results.push({
            flightId,
            success: true,
          });

          logger.info(`Email and notification sent successfully to ${userEmail} for flight ${flightId}`);
        } catch (error: any) {
          logger.error(`Failed to send notification for flight ${flightId}:`, error);
          
          // Provide more helpful error messages
          let errorMessage = error.message || "Unknown error";
          if (error.code === "EAUTH" || errorMessage.includes("BadCredentials")) {
            errorMessage = "Gmail authentication failed. Please check your Gmail App Password. " +
              "Make sure you're using a 16-character App Password (not your regular Gmail password). " +
              "Generate one at: https://myaccount.google.com/apppasswords";
          }
          
          results.push({
            flightId,
            success: false,
            error: errorMessage,
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      logger.info(
        `Notification sending complete: ${successCount} succeeded, ${failureCount} failed`
      );

      return {
        success: true,
        total: flightIds.length,
        succeeded: successCount,
        failed: failureCount,
        results,
      };
    } catch (error: any) {
      logger.error("Error sending notifications:", error);
      throw new HttpsError("internal", `Failed to send notifications: ${error.message}`);
    }
  }
);
