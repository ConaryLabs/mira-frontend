// mira-frontend/src/components/MoodBackground.tsx
import React from 'react';
import { moodColors, type MoodKey } from '../utils/mood';
import clsx from 'clsx';

interface MoodBackgroundProps {
  mood: string;
}

export const MoodBackground: React.FC<MoodBackgroundProps> = ({ mood }) => {
  const moodKey = mood as MoodKey;
  const colors = moodColors[moodKey] || moodColors.present;

  return (
    <div 
      className={clsx(
        'absolute inset-0 bg-gradient-to-br opacity-30 transition-all duration-1000 pointer-events-none',
        colors.gradient
      )}
    />
  );
};
