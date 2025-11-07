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
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

