// src/components/TourReplayButton.tsx
// Replay tour button for top right corner

import React from 'react';
import { useTour } from '../hooks/useTour';

export function TourReplayButton() {
  const { startTour } = useTour();

  return (
    <button
      onClick={startTour}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors rounded-full border border-gray-300 hover:border-gray-400"
      title="Replay Tutorial"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>Tutorial</span>
    </button>
  );
}