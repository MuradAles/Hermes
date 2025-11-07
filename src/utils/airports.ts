import type { Location } from '../types';

export interface Airport {
  code: string;
  name: string;
  lat: number;
  lon: number;
  city: string;
  state: string;
}

export const AIRPORTS: Record<string, Airport> = {
  // Major International Hubs
  ATL: { code: 'ATL', name: 'Hartsfield-Jackson Atlanta Intl', city: 'Atlanta', state: 'GA', lat: 33.6407, lon: -84.4277 },
  ORD: { code: 'ORD', name: "Chicago O'Hare Intl", city: 'Chicago', state: 'IL', lat: 41.9742, lon: -87.9073 },
  DFW: { code: 'DFW', name: 'Dallas/Fort Worth Intl', city: 'Dallas', state: 'TX', lat: 32.8998, lon: -97.0403 },
  DEN: { code: 'DEN', name: 'Denver Intl', city: 'Denver', state: 'CO', lat: 39.8561, lon: -104.6737 },
  LAX: { code: 'LAX', name: 'Los Angeles Intl', city: 'Los Angeles', state: 'CA', lat: 33.9416, lon: -118.4085 },
  JFK: { code: 'JFK', name: 'John F. Kennedy Intl', city: 'New York', state: 'NY', lat: 40.6413, lon: -73.7781 },
  SFO: { code: 'SFO', name: 'San Francisco Intl', city: 'San Francisco', state: 'CA', lat: 37.6213, lon: -122.379 },
  SEA: { code: 'SEA', name: 'Seattle-Tacoma Intl', city: 'Seattle', state: 'WA', lat: 47.4502, lon: -122.3088 },
  LAS: { code: 'LAS', name: 'Harry Reid Intl', city: 'Las Vegas', state: 'NV', lat: 36.0840, lon: -115.1537 },
  MCO: { code: 'MCO', name: 'Orlando Intl', city: 'Orlando', state: 'FL', lat: 28.4312, lon: -81.3081 },
  
  // Major East Coast
  MIA: { code: 'MIA', name: 'Miami Intl', city: 'Miami', state: 'FL', lat: 25.7959, lon: -80.2870 },
  BOS: { code: 'BOS', name: 'Boston Logan Intl', city: 'Boston', state: 'MA', lat: 42.3656, lon: -71.0096 },
  EWR: { code: 'EWR', name: 'Newark Liberty Intl', city: 'Newark', state: 'NJ', lat: 40.6895, lon: -74.1745 },
  LGA: { code: 'LGA', name: 'LaGuardia', city: 'New York', state: 'NY', lat: 40.7769, lon: -73.8740 },
  PHL: { code: 'PHL', name: 'Philadelphia Intl', city: 'Philadelphia', state: 'PA', lat: 39.8744, lon: -75.2424 },
  DCA: { code: 'DCA', name: 'Ronald Reagan Washington National', city: 'Washington', state: 'DC', lat: 38.8521, lon: -77.0377 },
  IAD: { code: 'IAD', name: 'Washington Dulles Intl', city: 'Washington', state: 'VA', lat: 38.9531, lon: -77.4565 },
  BWI: { code: 'BWI', name: 'Baltimore/Washington Intl', city: 'Baltimore', state: 'MD', lat: 39.1774, lon: -76.6684 },
  CLT: { code: 'CLT', name: 'Charlotte Douglas Intl', city: 'Charlotte', state: 'NC', lat: 35.2144, lon: -80.9473 },
  RDU: { code: 'RDU', name: 'Raleigh-Durham Intl', city: 'Raleigh', state: 'NC', lat: 35.8776, lon: -78.7875 },
  
  // Major West Coast
  SAN: { code: 'SAN', name: 'San Diego Intl', city: 'San Diego', state: 'CA', lat: 32.7336, lon: -117.1897 },
  SJC: { code: 'SJC', name: 'San Jose Intl', city: 'San Jose', state: 'CA', lat: 37.3639, lon: -121.9289 },
  OAK: { code: 'OAK', name: 'Oakland Intl', city: 'Oakland', state: 'CA', lat: 37.7213, lon: -122.2208 },
  PDX: { code: 'PDX', name: 'Portland Intl', city: 'Portland', state: 'OR', lat: 45.5898, lon: -122.5951 },
  
  // Southwest Region
  PHX: { code: 'PHX', name: 'Phoenix Sky Harbor Intl', city: 'Phoenix', state: 'AZ', lat: 33.4484, lon: -112.0740 },
  IAH: { code: 'IAH', name: 'George Bush Intercontinental', city: 'Houston', state: 'TX', lat: 29.9902, lon: -95.3368 },
  HOU: { code: 'HOU', name: 'William P. Hobby', city: 'Houston', state: 'TX', lat: 29.6454, lon: -95.2789 },
  AUS: { code: 'AUS', name: 'Austin-Bergstrom Intl', city: 'Austin', state: 'TX', lat: 30.1945, lon: -97.6699 },
  SAT: { code: 'SAT', name: 'San Antonio Intl', city: 'San Antonio', state: 'TX', lat: 29.5337, lon: -98.4698 },
  ABQ: { code: 'ABQ', name: 'Albuquerque Intl Sunport', city: 'Albuquerque', state: 'NM', lat: 35.0402, lon: -106.6091 },
  TUS: { code: 'TUS', name: 'Tucson Intl', city: 'Tucson', state: 'AZ', lat: 32.1161, lon: -110.9410 },
  ELP: { code: 'ELP', name: 'El Paso Intl', city: 'El Paso', state: 'TX', lat: 31.8072, lon: -106.3778 },
  
  // Southeast Region
  FLL: { code: 'FLL', name: 'Fort Lauderdale-Hollywood Intl', city: 'Fort Lauderdale', state: 'FL', lat: 26.0742, lon: -80.1506 },
  TPA: { code: 'TPA', name: 'Tampa Intl', city: 'Tampa', state: 'FL', lat: 27.9755, lon: -82.5332 },
  JAX: { code: 'JAX', name: 'Jacksonville Intl', city: 'Jacksonville', state: 'FL', lat: 30.4941, lon: -81.6879 },
  MSY: { code: 'MSY', name: 'Louis Armstrong New Orleans Intl', city: 'New Orleans', state: 'LA', lat: 29.9934, lon: -90.2580 },
  BNA: { code: 'BNA', name: 'Nashville Intl', city: 'Nashville', state: 'TN', lat: 36.1245, lon: -86.6782 },
  MEM: { code: 'MEM', name: 'Memphis Intl', city: 'Memphis', state: 'TN', lat: 35.0424, lon: -89.9767 },
  
  // Midwest
  DTW: { code: 'DTW', name: 'Detroit Metropolitan Wayne County', city: 'Detroit', state: 'MI', lat: 42.2124, lon: -83.3534 },
  MSP: { code: 'MSP', name: 'Minneapolis-St. Paul Intl', city: 'Minneapolis', state: 'MN', lat: 44.8820, lon: -93.2218 },
  STL: { code: 'STL', name: 'St. Louis Lambert Intl', city: 'St. Louis', state: 'MO', lat: 38.7487, lon: -90.3700 },
  MCI: { code: 'MCI', name: 'Kansas City Intl', city: 'Kansas City', state: 'MO', lat: 39.2976, lon: -94.7139 },
  CLE: { code: 'CLE', name: 'Cleveland Hopkins Intl', city: 'Cleveland', state: 'OH', lat: 41.4117, lon: -81.8498 },
  CMH: { code: 'CMH', name: 'John Glenn Columbus Intl', city: 'Columbus', state: 'OH', lat: 39.9980, lon: -82.8919 },
  CVG: { code: 'CVG', name: 'Cincinnati/Northern Kentucky Intl', city: 'Cincinnati', state: 'KY', lat: 39.0488, lon: -84.6678 },
  IND: { code: 'IND', name: 'Indianapolis Intl', city: 'Indianapolis', state: 'IN', lat: 39.7173, lon: -86.2944 },
  MKE: { code: 'MKE', name: 'Milwaukee Mitchell Intl', city: 'Milwaukee', state: 'WI', lat: 42.9472, lon: -87.8966 },
  MDW: { code: 'MDW', name: 'Chicago Midway Intl', city: 'Chicago', state: 'IL', lat: 41.7868, lon: -87.7522 },
  
  // Mountain West
  SLC: { code: 'SLC', name: 'Salt Lake City Intl', city: 'Salt Lake City', state: 'UT', lat: 40.7899, lon: -111.9791 },
  BZN: { code: 'BZN', name: 'Bozeman Yellowstone Intl', city: 'Bozeman', state: 'MT', lat: 45.7769, lon: -111.1603 },
  BOI: { code: 'BOI', name: 'Boise Airport', city: 'Boise', state: 'ID', lat: 43.5644, lon: -116.2228 },
  
  // Alaska & Hawaii
  ANC: { code: 'ANC', name: 'Ted Stevens Anchorage Intl', city: 'Anchorage', state: 'AK', lat: 61.1743, lon: -149.9963 },
  HNL: { code: 'HNL', name: 'Daniel K. Inouye Intl', city: 'Honolulu', state: 'HI', lat: 21.3187, lon: -157.9225 },
};

/**
 * Convert Airport to Location type
 */
export function airportToLocation(airport: Airport): Location {
  return {
    code: airport.code,
    name: airport.name,
    lat: airport.lat,
    lon: airport.lon,
  };
}

/**
 * Get sorted list of airport codes
 */
export function getAirportCodes(): string[] {
  return Object.keys(AIRPORTS).sort();
}

/**
 * Get airport by code
 */
export function getAirport(code: string): Airport | undefined {
  return AIRPORTS[code.toUpperCase()];
}

