import { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../services/firebase';
import type { User, TrainingLevel } from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data() as User);
        } else {
          // User authenticated but no Firestore document - create one
          const newUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            trainingLevel: 'student-pilot', // Default training level
            createdAt: new Date(),
            lastLogin: new Date()
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, displayName: string, trainingLevel: TrainingLevel) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const userData: User = {
      uid: result.user.uid,
      email,
      displayName,
      trainingLevel,
      createdAt: new Date(),
      lastLogin: new Date()
    };
    await setDoc(doc(db, 'users', result.user.uid), userData);
    setUser(userData);
  };

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const firebaseUser = result.user;
    
    // Check if user document exists, create if not
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (!userDoc.exists()) {
      const userData: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        trainingLevel: 'student-pilot', // Default training level for Google sign-in
        createdAt: new Date(),
        lastLogin: new Date()
      };
      await setDoc(doc(db, 'users', firebaseUser.uid), userData);
      setUser(userData);
    } else {
      setUser(userDoc.data() as User);
    }
    
    return result;
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  return { user, loading, signIn, signUp, signInWithGoogle, signOut };
};

