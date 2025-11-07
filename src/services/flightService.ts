import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { Flight } from '../types';

export const flightService = {
  async createFlight(flightData: Omit<Flight, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'flights'), {
      ...flightData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  },

  subscribeToUserFlights(userId: string, callback: (flights: Flight[]) => void) {
    const q = query(
      collection(db, 'flights'),
      where('userId', '==', userId),
      orderBy('scheduledTime', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const flights = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Flight[];
      callback(flights);
    });
  }
};

