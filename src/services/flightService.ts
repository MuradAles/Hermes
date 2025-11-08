import { collection, addDoc, query, where, orderBy, onSnapshot, deleteDoc, doc, Timestamp, updateDoc, getDocs } from 'firebase/firestore';
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

  async cancelFlight(flightId: string): Promise<void> {
    await updateDoc(doc(db, 'flights', flightId), {
      status: 'cancelled',
      cancelledAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      needsRescheduling: false // Clear notification if present
    });
  },

  async rescheduleFlight(oldFlightId: string, newFlightData: Omit<Flight, 'id'>): Promise<string> {
    // Create new flight
    const newDocRef = await addDoc(collection(db, 'flights'), {
      ...newFlightData,
      rescheduledFrom: oldFlightId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    // Mark old flight as rescheduled
    await updateDoc(doc(db, 'flights', oldFlightId), {
      status: 'rescheduled',
      rescheduledTo: newDocRef.id,
      rescheduledAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      needsRescheduling: false // Clear the notification flag
    });

    return newDocRef.id;
  },

  async dismissReschedulingNotification(flightId: string): Promise<void> {
    await updateDoc(doc(db, 'flights', flightId), {
      needsRescheduling: false,
      updatedAt: Timestamp.now()
    });
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
      // Filter out rescheduled and cancelled flights from main view
      const activeFlights = flights.filter(f => f.status !== 'rescheduled' && f.status !== 'cancelled');
      callback(activeFlights);
    });
  },

  // Get all flights for admin dashboard (no filtering)
  subscribeToAllFlights(callback: (flights: Flight[]) => void) {
    const q = query(
      collection(db, 'flights'),
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

