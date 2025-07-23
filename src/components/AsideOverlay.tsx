// mira-frontend/src/components/AsideOverlay.tsx
import React from 'react';
import type { Aside } from '../types/messages';

interface AsideOverlayProps {
  asides: Aside[];
}

export const AsideOverlay: React.FC<AsideOverlayProps> = ({ asides }) => {
  return (
    <>
      {asides.map((aside) => (
        <div
          key={aside.id}
          className="flex justify-center animate-slide-in"
          style={{ opacity: aside.intensity }}
        >
          <p className="text-sm italic opacity-60 px-4 py-1">
            {aside.cue}
          </p>
        </div>
      ))}
    </>
  );
};
