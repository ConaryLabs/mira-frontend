export interface Message {
  id: string;
  role: 'user' | 'mira';
  content: string;
  mood?: string;
  timestamp: Date;
  isStreaming?: boolean;
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
