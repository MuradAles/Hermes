import type { TrainingLevel } from './User';
import type { Location } from './Airport';

export interface Waypoint {
  lat: number;
  lon: number;
  altitude: number;
  time: Date;
  distanceFromStart: number;
}

export interface FlightPath {
  waypoints: Waypoint[];
  totalDistance: number;
  estimatedDuration: number;
}

export interface Flight {
  id: string;
  userId: string;
  departure: Location;
  arrival: Location;
  scheduledTime: Date;
  studentName: string;
  trainingLevel: TrainingLevel;
  path: FlightPath;
  safetyStatus: 'safe' | 'marginal' | 'dangerous';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'rescheduled';
  weatherData?: any; // Weather report data
  lastSafetyStatus?: string; // GREEN/YELLOW/RED for comparison
  weatherCheckedAt?: Date;
  needsRescheduling?: boolean; // Flag for in-app notification
  rescheduledFrom?: string | null; // ID of old flight if this is a rescheduled flight
  rescheduledTo?: string | null; // ID of new flight if this was rescheduled
  rescheduledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

