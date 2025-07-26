// src/types/messages.ts

export interface Message {
  id: string;
  role: 'user' | 'mira' | 'aside';  // Added 'aside' as a valid role
  content: string;
  mood?: string;
  timestamp: Date;
  isStreaming?: boolean;
  intensity?: number;  // Added for aside intensity (0-1 scale)
}

export interface Aside {
  id: string;
  cue: string;
  intensity: number;
  timestamp: Date;
}

export type Mood = 
  | 'playful' 
  | 'caring' 
  | 'sassy' 
  | 'melancholy' 
  | 'fierce' 
  | 'intense' 
  | 'present';
