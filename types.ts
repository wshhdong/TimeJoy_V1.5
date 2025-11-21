
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  registeredAt: string;
  lastLoginAt: string;
}

export interface ActivityType {
  id: string;
  name: string;
  color: string;
  isVisible: boolean;
  order: number;
}

export interface SatisfactionTag {
  id: string;
  name: string;
  color: string; // Hex code or tailwind class map key
  emoji: string;
  isVisible: boolean;
  order: number;
  score: number; // -1 (Bad), 0 (OK), 1 (Happy) for analytics
}

export interface TimeLog {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  duration: number; // Hours, e.g. 1.5
  activityTypeId: string;
  satisfactionTagId: string;
  details?: string;
  createdAt: string;
}

// For Dashboard Aggregations
export interface ChartDataPoint {
  name: string;
  value: number;
  fill?: string;
  [key: string]: any;
}
