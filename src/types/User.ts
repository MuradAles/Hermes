export type TrainingLevel = 
  | 'level-1' | 'level-2' | 'level-3' | 'level-4'
  | 'student-pilot' | 'private-pilot' | 'commercial-pilot' | 'instrument-rated';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  trainingLevel: TrainingLevel;
  createdAt: Date;
  lastLogin: Date;
}

