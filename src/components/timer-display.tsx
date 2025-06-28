'use client';

import { useState, useEffect } from 'react';

function formatDuration(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) {
    return '00:00:00';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function useTimer(startTime: number, endTime?: number) {
  // If endTime is provided, duration is static and safe for SSR.
  // If not, it's a running timer, and we return null for the initial state
  // to prevent server-client mismatch. useEffect will update it on the client.
  const [elapsedSeconds, setElapsedSeconds] = useState<number | null>(() => {
    if (endTime) {
      return (endTime - startTime) / 1000;
    }
    return null;
  });

  useEffect(() => {
    // If it's a finished timer (endTime is provided), no interval is needed.
    if (endTime) {
      setElapsedSeconds((endTime - startTime) / 1000);
      return;
    }

    // This part is for running timers and executes only on the client.
    // Set initial client-side value
    setElapsedSeconds((Date.now() - startTime) / 1000);

    const timerId = setInterval(() => {
      setElapsedSeconds((Date.now() - startTime) / 1000);
    }, 1000);

    return () => clearInterval(timerId);
  }, [startTime, endTime]);

  return elapsedSeconds;
}

export function TimerDisplay({ startTime, endTime }: { startTime?: number; endTime?: number }) {
  if (typeof startTime !== 'number') {
    return <span className="text-muted-foreground">—</span>;
  }

  const elapsedSeconds = useTimer(startTime, endTime);

  // For running timers, on the server and initial client render, elapsedSeconds will be null.
  // We render a placeholder to ensure the server and client render the same initial HTML.
  if (elapsedSeconds === null) {
    return <span>00:00:00</span>;
  }

  return <span>{formatDuration(elapsedSeconds)}</span>;
}
