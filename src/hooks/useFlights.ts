import { useState, useEffect } from 'react';
import type { Flight } from '../types';
import { flightService } from '../services/flightService';

export const useFlights = (userId: string) => {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    
    const unsubscribe = flightService.subscribeToUserFlights(userId, (updatedFlights) => {
      setFlights(updatedFlights);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const createFlight = async (flightData: Omit<Flight, 'id'>) => {
    return await flightService.createFlight(flightData);
  };

  return { flights, loading, createFlight };
};

