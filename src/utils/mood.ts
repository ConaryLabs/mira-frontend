export const moodColors = {
  playful: {
    gradient: 'from-purple-600/20 to-pink-600/20',
    primary: 'purple',
  },
  caring: {
    gradient: 'from-blue-500/20 to-cyan-500/20',
    primary: 'blue',
  },
  sassy: {
    gradient: 'from-rose-500/20 to-orange-500/20',
    primary: 'rose',
  },
  melancholy: {
    gradient: 'from-indigo-600/20 to-purple-700/20',
    primary: 'indigo',
  },
  fierce: {
    gradient: 'from-red-600/20 to-rose-700/20',
    primary: 'red',
  },
  intense: {
    gradient: 'from-violet-700/20 to-purple-800/20',
    primary: 'violet',
  },
  present: {
    gradient: 'from-slate-600/20 to-slate-700/20',
    primary: 'slate',
  },
} as const;

export type MoodKey = keyof typeof moodColors;
