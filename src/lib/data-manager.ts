'use client';

import type { Fleet, Visit, AuthUser } from './types';
import { fleets as initialFleets, visits as initialVisits } from './data';

const VISITS_KEY = 'carretometro-visits';
const FLEETS_KEY = 'carretometro-fleets';

export const initData = () => {
  if (typeof window !== 'undefined') {
    if (!localStorage.getItem(VISITS_KEY)) {
      localStorage.setItem(VISITS_KEY, JSON.stringify(initialVisits));
    }
    if (!localStorage.getItem(FLEETS_KEY)) {
      localStorage.setItem(FLEETS_KEY, JSON.stringify(initialFleets));
    }
  }
};

export const getVisits = (): Visit[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(VISITS_KEY);
  const visits: Visit[] = data ? JSON.parse(data) : [];
  // Always return visits sorted by arrival date, newest first
  return visits.sort((a, b) => b.arrivalTimestamp - a.arrivalTimestamp);
};

export const getFleets = (): Fleet[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(FLEETS_KEY);
  const fleets: Fleet[] = data ? JSON.parse(data) : [];
  // Always return fleets sorted by ID
  return fleets.sort((a, b) => a.id.localeCompare(b.id));
};

const saveVisits = (visits: Visit[]) => {
  localStorage.setItem(VISITS_KEY, JSON.stringify(visits));
};

const saveFleets = (fleets: Fleet[]) => {
    localStorage.setItem(FLEETS_KEY, JSON.stringify(fleets));
};


export const addVisit = (
  visitData: Omit<Visit, 'id' | 'createdBy' | 'createdAt'>, 
  user: AuthUser
) => {
  const visits = getVisits();
  const maxId = Math.max(0, ...visits.map(v => parseInt(v.id.replace('V', ''), 10)));
  const newId = `V${(maxId + 1).toString().padStart(3, '0')}`;
  
  const newVisit: Visit = {
    ...visitData,
    id: newId,
    createdBy: user.name,
    createdAt: Date.now(),
  };

  saveVisits([newVisit, ...visits]);
};

export const updateVisit = (updatedVisit: Visit, user: AuthUser) => {
  const visits = getVisits();
  const visitIndex = visits.findIndex(v => v.id === updatedVisit.id);

  if (visitIndex !== -1) {
    visits[visitIndex] = {
      ...updatedVisit,
      updatedBy: user.name,
      updatedAt: Date.now(),
    };
    saveVisits(visits);
  }
};

export const addFleet = (fleetData: Fleet) => {
    const fleets = getFleets();
    const existing = fleets.find(f => f.id === fleetData.id);
    if (!existing) {
        saveFleets([fleetData, ...fleets]);
    }
};
