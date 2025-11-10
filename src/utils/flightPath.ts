import type { Location, FlightPath } from '../types';
import { calculations } from './calculations';

/**
 * Calculate flight path from departure to arrival
 */
export function calculateFlightPath(
  departure: Location,
  arrival: Location,
  departureTime: Date
): FlightPath {
  const distance = calculations.calculateDistance(
    departure.lat,
    departure.lon,
    arrival.lat,
    arrival.lon
  );

  const averageSpeed = 120; // knots
  const estimatedDuration = (distance / averageSpeed) * 60; // minutes

  let waypoints = calculations.generateWaypoints(departure, arrival, 50);
  waypoints = calculations.calculateETAs(waypoints, departureTime, averageSpeed);

  return {
    waypoints,
    totalDistance: distance,
    estimatedDuration,
  };
}














