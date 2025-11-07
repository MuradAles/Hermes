import type { Waypoint, Location } from '../types';

export const calculations = {
  toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  },

  toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  },

  /**
   * Calculate great circle distance between two points using Haversine formula
   * Returns distance in nautical miles
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3440.065; // Earth radius in nautical miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  /**
   * Calculate intermediate point along great circle route
   * fraction is 0-1 (0 = start, 1 = end)
   */
  intermediatePoint(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
    fraction: number
  ): { lat: number; lon: number } {
    const φ1 = this.toRadians(lat1);
    const λ1 = this.toRadians(lon1);
    const φ2 = this.toRadians(lat2);
    const λ2 = this.toRadians(lon2);

    const δ = 2 * Math.asin(
      Math.sqrt(
        Math.sin((φ2 - φ1) / 2) ** 2 +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2
      )
    );

    const a = Math.sin((1 - fraction) * δ) / Math.sin(δ);
    const b = Math.sin(fraction * δ) / Math.sin(δ);
    const x = a * Math.cos(φ1) * Math.cos(λ1) + b * Math.cos(φ2) * Math.cos(λ2);
    const y = a * Math.cos(φ1) * Math.sin(λ1) + b * Math.cos(φ2) * Math.sin(λ2);
    const z = a * Math.sin(φ1) + b * Math.sin(φ2);

    return {
      lat: this.toDegrees(Math.atan2(z, Math.sqrt(x ** 2 + y ** 2))),
      lon: this.toDegrees(Math.atan2(y, x)),
    };
  },

  /**
   * Estimate terrain elevation based on location
   * Returns estimated elevation in feet MSL
   * (Simplified - in production, use a terrain API)
   */
  estimateTerrainElevation(lat: number, lon: number): number {
    // Rocky Mountains region (high elevation)
    if (lat >= 37 && lat <= 49 && lon >= -115 && lon <= -102) {
      return 5000 + Math.random() * 3000; // 5,000-8,000 ft
    }
    // Appalachian Mountains (moderate elevation)
    if (lat >= 33 && lat <= 44 && lon >= -84 && lon <= -75) {
      return 1500 + Math.random() * 1500; // 1,500-3,000 ft
    }
    // Desert Southwest (moderate elevation)
    if (lat >= 31 && lat <= 37 && lon >= -115 && lon <= -102) {
      return 3000 + Math.random() * 2000; // 3,000-5,000 ft
    }
    // Great Plains (low to moderate)
    if (lat >= 35 && lat <= 49 && lon >= -104 && lon <= -94) {
      return 1000 + Math.random() * 1000; // 1,000-2,000 ft
    }
    // Coastal regions (near sea level)
    return 200 + Math.random() * 500; // 200-700 ft
  },

  /**
   * Calculate appropriate cruise altitude for flight
   * Based on distance, direction, and terrain
   */
  calculateCruiseAltitude(
    departure: Location,
    arrival: Location,
    totalDistance: number
  ): number {
    // Calculate bearing to determine east/west
    const bearing = this.calculateBearing(
      departure.lat,
      departure.lon,
      arrival.lat,
      arrival.lon
    );
    
    // Determine if eastbound (0-179°) or westbound (180-359°)
    const isEastbound = bearing >= 0 && bearing < 180;
    
    // Base altitude on distance
    let baseAltitude: number;
    if (totalDistance < 100) {
      baseAltitude = 3500; // Short flights: 3,500 ft
    } else if (totalDistance < 300) {
      baseAltitude = 5500; // Medium flights: 5,500 ft
    } else if (totalDistance < 600) {
      baseAltitude = 7500; // Long flights: 7,500 ft
    } else {
      baseAltitude = 9500; // Very long flights: 9,500 ft
    }
    
    // Adjust for VFR hemispheric rules
    // Eastbound: odd thousands + 500 (3500, 5500, 7500, 9500)
    // Westbound: even thousands + 500 (4500, 6500, 8500, 10500)
    if (!isEastbound && baseAltitude % 2000 === 1500) {
      baseAltitude += 1000; // Convert odd to even
    }
    
    // Check terrain along route and ensure clearance
    const midpoint = this.intermediatePoint(
      departure.lat,
      departure.lon,
      arrival.lat,
      arrival.lon,
      0.5
    );
    const terrainElevation = this.estimateTerrainElevation(midpoint.lat, midpoint.lon);
    const minSafeAltitude = terrainElevation + 2000; // 2,000 ft clearance
    
    // If terrain is high, bump up to next altitude level
    if (baseAltitude < minSafeAltitude) {
      const altitudeLevels = isEastbound 
        ? [3500, 5500, 7500, 9500, 11500] 
        : [4500, 6500, 8500, 10500, 12500];
      baseAltitude = altitudeLevels.find(alt => alt >= minSafeAltitude) || baseAltitude + 2000;
    }
    
    return baseAltitude;
  },

  /**
   * Calculate altitude for a waypoint based on flight phase
   */
  calculateWaypointAltitude(
    distanceFromStart: number,
    totalDistance: number,
    cruiseAltitude: number,
    departureElevation: number = 700,
    arrivalElevation: number = 500
  ): number {
    const climbDistance = Math.min(50, totalDistance * 0.15); // Climb in first 50nm or 15%
    const descentDistance = Math.min(50, totalDistance * 0.15); // Descend in last 50nm or 15%
    
    // Takeoff altitude (pattern altitude)
    const takeoffAlt = departureElevation + 1000;
    // Landing altitude (pattern altitude)
    const landingAlt = arrivalElevation + 1000;
    
    // Climb phase
    if (distanceFromStart <= climbDistance) {
      const climbFraction = distanceFromStart / climbDistance;
      return takeoffAlt + (cruiseAltitude - takeoffAlt) * climbFraction;
    }
    
    // Descent phase
    const distanceRemaining = totalDistance - distanceFromStart;
    if (distanceRemaining <= descentDistance) {
      const descentFraction = distanceRemaining / descentDistance;
      return landingAlt + (cruiseAltitude - landingAlt) * descentFraction;
    }
    
    // Cruise phase
    return cruiseAltitude;
  },

  /**
   * Generate waypoints along great circle route with realistic altitude profile
   * spacingNM: distance between waypoints in nautical miles
   */
  generateWaypoints(
    departure: Location,
    arrival: Location,
    spacingNM: number = 50
  ): Waypoint[] {
    const totalDistance = this.calculateDistance(
      departure.lat,
      departure.lon,
      arrival.lat,
      arrival.lon
    );
    
    // Calculate appropriate cruise altitude
    const cruiseAltitude = this.calculateCruiseAltitude(departure, arrival, totalDistance);
    
    const numWaypoints = Math.max(2, Math.ceil(totalDistance / spacingNM) + 1);
    const waypoints: Waypoint[] = [];

    for (let i = 0; i < numWaypoints; i++) {
      const fraction = i / (numWaypoints - 1);
      const distanceFromStart = totalDistance * fraction;
      
      const point = this.intermediatePoint(
        departure.lat,
        departure.lon,
        arrival.lat,
        arrival.lon,
        fraction
      );
      
      // Calculate realistic altitude for this waypoint
      const altitude = this.calculateWaypointAltitude(
        distanceFromStart,
        totalDistance,
        cruiseAltitude
      );
      
      waypoints.push({
        lat: point.lat,
        lon: point.lon,
        altitude: Math.round(altitude),
        time: new Date(), // Will be updated with ETAs
        distanceFromStart,
      });
    }

    return waypoints;
  },

  /**
   * Calculate estimated time of arrival for each waypoint
   * averageSpeed: ground speed in knots
   */
  calculateETAs(
    waypoints: Waypoint[],
    departureTime: Date,
    averageSpeed: number = 120
  ): Waypoint[] {
    return waypoints.map((waypoint) => ({
      ...waypoint,
      time: new Date(
        departureTime.getTime() +
          (waypoint.distanceFromStart / averageSpeed) * 60 * 60 * 1000
      ),
    }));
  },

  /**
   * Calculate bearing between two points
   * Returns bearing in degrees (0-360)
   */
  calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const φ1 = this.toRadians(lat1);
    const φ2 = this.toRadians(lat2);
    const Δλ = this.toRadians(lon2 - lon1);

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) -
      Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);

    return (this.toDegrees(θ) + 360) % 360;
  },
};

