'use client';

const LOG_KEY = 'carretometro-audit-log';
const MAX_LOG_ENTRIES = 500; // To prevent localStorage from getting too big

export interface ActivityLog {
  id: number;
  timestamp: number;
  user: string;
  action: string;
  details: string;
}

export const getLogs = (): ActivityLog[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(LOG_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to parse activity logs from localStorage:", error);
    return [];
  }
};

export const logActivity = (user: string, action: string, details: string) => {
  if (typeof window === 'undefined') return;
  try {
    const logs = getLogs();
    const newLog: ActivityLog = {
      id: Date.now(),
      timestamp: Date.now(),
      user,
      action,
      details,
    };

    // Add the new log and cap the total number of entries
    const updatedLogs = [newLog, ...logs].slice(0, MAX_LOG_ENTRIES);
    localStorage.setItem(LOG_KEY, JSON.stringify(updatedLogs));
  } catch (error) {
    console.error("Failed to log activity to localStorage:", error);
  }
};
