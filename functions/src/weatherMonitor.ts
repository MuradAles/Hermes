import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import axios from "axios";

interface WeatherCheckpoint {
  location: { lat: number; lon: number };
  time: Date;
  weather: any;
  safetyStatus: string;
  safetyScore: number;
  reason?: string;
}

/**
 * Check weather for all scheduled flights
 * Called hourly by scheduled function
 */
export async function monitorAllFlights(): Promise<void> {
  logger.info("Starting hourly weather monitoring...");

  const db = admin.firestore();
  const now = new Date();

  try {
    // Query all scheduled flights with future departure times
    const flightsSnapshot = await db
      .collection("flights")
      .where("status", "==", "scheduled")
      .where("scheduledTime", ">", now)
      .limit(50) // Process max 50 flights per execution
      .get();

    logger.info(`Found ${flightsSnapshot.size} scheduled flights to check`);

    if (flightsSnapshot.empty) {
      logger.info("No scheduled flights found");
      return;
    }

    // Process each flight
    const promises = flightsSnapshot.docs.map((doc) =>
      checkFlightWeather(doc)
    );

    await Promise.all(promises);

    logger.info("Weather monitoring complete");
  } catch (error: any) {
    logger.error("Error in weather monitoring:", error);
    throw error;
  }
}

/**
 * Check weather for a single flight and update if status changed
 */
async function checkFlightWeather(
  flightDoc: admin.firestore.QueryDocumentSnapshot
): Promise<void> {
  try {
    const flight = flightDoc.data();
    const flightId = flightDoc.id;

    logger.info(`Checking weather for flight ${flightId}`);

    // Get weather at all waypoints along the flight path
    const checkpoints = await checkFlightPath(
      flight.path.waypoints,
      flight.trainingLevel
    );

    // Determine overall safety status
    const overallSafety = getOverallSafety(checkpoints);
    const safetyColor = getSafetyColor(overallSafety.status, flight.trainingLevel);

    // Compare with previous status
    const previousColor = flight.lastSafetyStatus || "GREEN";
    const statusChanged = safetyColor !== previousColor;

    logger.info(`Flight ${flightId}: ${previousColor} -> ${safetyColor} (changed: ${statusChanged})`);

    // Update flight document with new weather data
    const updates: any = {
      weatherData: checkpoints,
      lastSafetyStatus: safetyColor,
      weatherCheckedAt: admin.firestore.FieldValue.serverTimestamp(),
      safetyStatus: overallSafety.status,
    };

    // If status changed to unsafe, flag for rescheduling
    if (statusChanged && (safetyColor === "RED" || (safetyColor === "YELLOW" && (flight.trainingLevel === "level-1" || flight.trainingLevel === "level-2")))) {
      updates.needsRescheduling = true;
      logger.info(`Flight ${flightId} now needs rescheduling (${safetyColor})`);
    }

    await flightDoc.ref.update(updates);

    logger.info(`Successfully updated flight ${flightId}`);
  } catch (error: any) {
    logger.error(`Error checking flight ${flightDoc.id}:`, error);
    // Continue with other flights even if one fails
  }
}

/**
 * Check weather along entire flight path
 */
async function checkFlightPath(
  waypoints: any[],
  trainingLevel: string
): Promise<WeatherCheckpoint[]> {
  const checkpoints: WeatherCheckpoint[] = [];
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    logger.error("OpenWeatherMap API key not configured");
    return [];
  }

  for (const waypoint of waypoints) {
    try {
      const weather = await getWeatherAtLocation(waypoint.lat, waypoint.lon, waypoint.time, apiKey);
      const safety = assessSafety(weather, trainingLevel);

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
      logger.error(`Error checking weather at waypoint:`, error);
      // Continue with remaining waypoints
    }
  }

  return checkpoints;
}

/**
 * Get weather at a specific location
 */
async function getWeatherAtLocation(
  lat: number,
  lon: number,
  time: Date,
  apiKey: string
): Promise<any> {
  try {
    const targetTime = new Date(time).getTime();
    const now = Date.now();

    // If target time is more than 5 days away, use current weather
    if (targetTime > now + 5 * 24 * 60 * 60 * 1000) {
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

    // Fetch 5-day forecast
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

    // Find closest forecast entry
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

    return {
      ...closestForecast,
      visibility: closestForecast.visibility || 10000,
    };
  } catch (error) {
    logger.error("Error fetching weather:", error);
    throw error;
  }
}

/**
 * Assess safety of weather conditions
 */
function assessSafety(
  weather: any,
  trainingLevel: string
): { status: string; score: number; reason: string } {
  const minimums = getWeatherMinimums(trainingLevel);
  let score = 100;
  const issues: string[] = [];

  const visibility = weather.visibility / 1609; // meters to miles
  const windSpeed = weather.wind.speed;
  const weatherId = weather.weather[0]?.id;
  const temp = weather.main.temp;
  const precipitation = weather.rain?.["1h"] || weather.snow?.["1h"] || 0;

  // Check for thunderstorms
  if (weatherId && weatherId >= 200 && weatherId < 300) {
    return { status: "dangerous", score: 0, reason: "Thunderstorms present" };
  }

  // Check for icing
  if (temp <= 32 && precipitation > 0) {
    if (trainingLevel !== "level-4") {
      return { status: "dangerous", score: 0, reason: "Icing conditions detected" };
    }
    score -= 30;
    issues.push("Icing conditions");
  }

  // Check visibility
  if (minimums.visibility > 0 && visibility < minimums.visibility) {
    const deficit = minimums.visibility - visibility;
    issues.push(`Low visibility: ${visibility.toFixed(1)} mi (need ${minimums.visibility} mi)`);
    score -= Math.min(30, deficit * 10);
  }

  // Check winds
  if (windSpeed > minimums.windSpeed) {
    const excess = windSpeed - minimums.windSpeed;
    issues.push(`High winds: ${windSpeed.toFixed(0)} kt (max ${minimums.windSpeed} kt)`);
    score -= Math.min(20, excess * 2);
  }

  score = Math.max(0, score);

  let status: string;
  if (score >= 80) {
    status = "safe";
  } else if (score >= 50) {
    status = "marginal";
  } else {
    status = "dangerous";
  }

  return {
    status,
    score,
    reason: issues.length > 0 ? issues.join("; ") : "Conditions acceptable",
  };
}

/**
 * Get weather minimums for training level
 */
function getWeatherMinimums(trainingLevel: string): { visibility: number; ceiling: number; windSpeed: number } {
  const minimums: Record<string, any> = {
    "level-1": { visibility: 5, ceiling: 3000, windSpeed: 10 },
    "level-2": { visibility: 4, ceiling: 2500, windSpeed: 15 },
    "level-3": { visibility: 3, ceiling: 1000, windSpeed: 20 },
    "level-4": { visibility: 0, ceiling: 0, windSpeed: 30 },
  };

  return minimums[trainingLevel] || minimums["level-1"];
}

/**
 * Get overall safety from checkpoints
 */
function getOverallSafety(checkpoints: WeatherCheckpoint[]): { status: string; score: number } {
  if (checkpoints.length === 0) {
    return { status: "dangerous", score: 0 };
  }

  const dangerousCount = checkpoints.filter((c) => c.safetyStatus === "dangerous").length;
  if (dangerousCount > 0) {
    return { status: "dangerous", score: 0 };
  }

  const marginalCount = checkpoints.filter((c) => c.safetyStatus === "marginal").length;
  if (marginalCount / checkpoints.length > 0.25) {
    const avgScore = checkpoints.reduce((sum, c) => sum + c.safetyScore, 0) / checkpoints.length;
    return { status: "marginal", score: avgScore };
  }

  const avgScore = checkpoints.reduce((sum, c) => sum + c.safetyScore, 0) / checkpoints.length;
  return { status: "safe", score: avgScore };
}

/**
 * Get color status based on safety and training level
 */
function getSafetyColor(status: string, trainingLevel: string): string {
  if (status === "dangerous") return "RED";
  if (status === "safe") return "GREEN";

  // Marginal status
  if (trainingLevel === "level-1" || trainingLevel === "level-2") {
    return "RED"; // Level 1-2 can only fly GREEN
  }

  return "YELLOW";
}




