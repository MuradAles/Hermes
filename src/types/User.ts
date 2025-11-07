export type TrainingLevel = 'student-pilot' | 'private-pilot' | 'instrument-rated';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  trainingLevel: TrainingLevel;
  createdAt: Date;
  lastLogin: Date;
}

