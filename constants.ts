
import { ActivityType, SatisfactionTag } from './types';

export const DEFAULT_ACTIVITY_TYPES: ActivityType[] = [
  { id: 'act_1', name: 'Daily Projects', color: '#3B82F6', isVisible: true, order: 1 }, // Blue
  { id: 'act_2', name: 'Life & Family', color: '#10B981', isVisible: true, order: 2 }, // Green
  { id: 'act_3', name: 'Long-term Investment', color: '#8B5CF6', isVisible: true, order: 3 }, // Purple
];

export const DEFAULT_SATISFACTION_TAGS: SatisfactionTag[] = [
  { id: 'sat_1', name: 'Happy', color: '#FBBF24', emoji: '😊', isVisible: true, order: 1, score: 1 }, // Amber
  { id: 'sat_2', name: 'OK', color: '#9CA3AF', emoji: '😐', isVisible: true, order: 2, score: 0 }, // Gray
  { id: 'sat_3', name: 'Not so good', color: '#EF4444', emoji: '😞', isVisible: true, order: 3, score: -1 }, // Red
];

export const TIME_BLOCK_MINUTES = 30;
export const SYSTEM_USER_EMAIL_SUFFIX = "@timejoy.com"; 

export const ADMIN_USERNAME = 'admin';
export const ADMIN_EMAIL = 'admin@timejoy.com';
