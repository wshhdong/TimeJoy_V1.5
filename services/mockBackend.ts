
import { User, UserRole, TimeLog, ActivityType, SatisfactionTag } from '../types';
import { DEFAULT_ACTIVITY_TYPES, DEFAULT_SATISFACTION_TAGS, ADMIN_USERNAME, ADMIN_EMAIL } from '../constants';

// --- CONFIGURATION ---
// Change this to true when deploying to your VM with the PostgreSQL Backend running
const USE_REAL_BACKEND = true; 

// Automatically detect the API URL based on the current browser location
// This assumes the backend runs on port 3001 on the same machine
const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') {
        return `http://${window.location.hostname}:3001/api`;
    }
    return 'http://localhost:3001/api';
};

const API_BASE_URL = getApiBaseUrl();

// --- LocalStorage Keys (Legacy/Mock) ---
const STORAGE_KEYS = {
  USERS: 'timejoy_users',
  LOGS: 'timejoy_logs',
  ACTIVITY_TYPES: 'timejoy_activity_types',
  SATISFACTION_TAGS: 'timejoy_satisfaction_tags',
  CURRENT_USER: 'timejoy_current_user_session'
};

// --- 1. MOCK BACKEND (LocalStorage) ---
const initStorage = () => {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    const adminUser: User = {
      id: 'admin_001',
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      role: UserRole.ADMIN,
      registeredAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([adminUser]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ACTIVITY_TYPES)) {
    localStorage.setItem(STORAGE_KEYS.ACTIVITY_TYPES, JSON.stringify(DEFAULT_ACTIVITY_TYPES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SATISFACTION_TAGS)) {
    localStorage.setItem(STORAGE_KEYS.SATISFACTION_TAGS, JSON.stringify(DEFAULT_SATISFACTION_TAGS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));
  }
};

if (!USE_REAL_BACKEND) {
    initStorage();
}

const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

const MockBackendService = {
  login: async (username: string, email: string): Promise<User | null> => {
    await delay();
    const users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      user.lastLoginAt = new Date().toISOString();
      const updatedUsers = users.map(u => u.id === user.id ? user : u);
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return user;
    }
    return null;
  },

  register: async (username: string, email: string): Promise<User | string> => {
    await delay();
    const users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) return "Username already exists";
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) return "Email already exists";

    const newUser: User = {
      id: `user_${Date.now()}`,
      username,
      email,
      role: UserRole.USER,
      registeredAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    return newUser;
  },

  logout: async () => {
    await delay(100);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  getCurrentUser: (): User | null => {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null');
  },

  updateProfile: async (userId: string, newUsername: string, newEmail: string): Promise<{success: boolean, message?: string, user?: User}> => {
      await delay();
      const users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
      if (users.some(u => u.username.toLowerCase() === newUsername.toLowerCase() && u.id !== userId)) return { success: false, message: "Username taken" };
      if (users.some(u => u.email.toLowerCase() === newEmail.toLowerCase() && u.id !== userId)) return { success: false, message: "Email taken" };

      let updatedUser: User | null = null;
      const updatedUsers = users.map(u => {
          if(u.id === userId) {
              updatedUser = { ...u, username: newUsername, email: newEmail };
              return updatedUser;
          }
          return u;
      });

      if (updatedUser) {
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
          return { success: true, user: updatedUser };
      }
      return { success: false, message: "User not found" };
  },

  getLogs: async (userId?: string): Promise<TimeLog[]> => {
    await delay();
    const logs: TimeLog[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '[]');
    if (userId) return logs.filter(l => l.userId === userId);
    return logs;
  },

  addLog: async (log: Omit<TimeLog, 'id' | 'createdAt'>): Promise<TimeLog> => {
    await delay();
    const logs: TimeLog[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '[]');
    const newLog: TimeLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
    logs.push(newLog);
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
    return newLog;
  },

  getActivityTypes: async (): Promise<ActivityType[]> => {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY_TYPES) || '[]');
  },

  updateActivityTypes: async (types: ActivityType[]) => {
    localStorage.setItem(STORAGE_KEYS.ACTIVITY_TYPES, JSON.stringify(types));
  },

  getSatisfactionTags: async (): Promise<SatisfactionTag[]> => {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SATISFACTION_TAGS) || '[]');
  },

  updateSatisfactionTags: async (tags: SatisfactionTag[]) => {
    localStorage.setItem(STORAGE_KEYS.SATISFACTION_TAGS, JSON.stringify(tags));
  },

  getAllUsers: async (): Promise<User[]> => {
    await delay();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  },

  resetUserEmail: async (userId: string) => {
      await delay();
      const users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
      const index = users.findIndex(u => u.id === userId);
      if (index !== -1) {
          const user = { ...users[index] };
          user.email = `${user.username}@timejoy.com`; 
          users[index] = user;
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
          return true;
      }
      return false;
  },
  
  exportDatabase: () => {
      const data = {
          users: JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]'),
          logs: JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '[]'),
          activityTypes: JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY_TYPES) || '[]'),
          satisfactionTags: JSON.parse(localStorage.getItem(STORAGE_KEYS.SATISFACTION_TAGS) || '[]'),
      };
      return JSON.stringify(data, null, 2);
  },

  importDatabase: (jsonString: string) => {
      try {
          const data = JSON.parse(jsonString);
          if(data.users) localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(data.users));
          if(data.logs) localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(data.logs));
          if(data.activityTypes) localStorage.setItem(STORAGE_KEYS.ACTIVITY_TYPES, JSON.stringify(data.activityTypes));
          if(data.satisfactionTags) localStorage.setItem(STORAGE_KEYS.SATISFACTION_TAGS, JSON.stringify(data.satisfactionTags));
          return true;
      } catch(e) {
          console.error(e);
          return false;
      }
  }
};

// --- 2. REAL BACKEND (REST API) ---
// This assumes you have a standard Node/Express backend running at API_BASE_URL
const RealBackendService = {
  // Helper for standard Fetch
  request: async (endpoint: string, method = 'GET', body?: any) => {
      try {
        const headers: any = { 'Content-Type': 'application/json' };
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });
        if (!res.ok) {
            try {
                const err = await res.json();
                throw new Error(err.message || 'Request failed');
            } catch (e) {
                throw new Error(`Request failed: ${res.statusText}`);
            }
        }
        return await res.json();
      } catch (err) {
          console.error("API Error:", err);
          return null;
      }
  },

  login: async (username: string, email: string): Promise<User | null> => {
    const user = await RealBackendService.request('/login', 'POST', { username, email });
    if (user) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
        return user;
    }
    return null;
  },

  register: async (username: string, email: string): Promise<User | string> => {
    try {
        const user = await RealBackendService.request('/register', 'POST', { username, email });
        if (!user) return "Registration failed";
        return user;
    } catch (e: any) {
        return "Username or email likely exists";
    }
  },

  logout: async () => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  getCurrentUser: (): User | null => {
    // We still read from local storage for session persistence for the frontend state,
    // but in a real app you might validate this token with the backend on mount.
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null');
  },

  updateProfile: async (userId: string, newUsername: string, newEmail: string): Promise<{success: boolean, message?: string, user?: User}> => {
      const res = await RealBackendService.request(`/users/${userId}`, 'PUT', { username: newUsername, email: newEmail });
      if (res && res.id) {
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(res));
          return { success: true, user: res };
      }
      return { success: false, message: "Update failed" };
  },

  getLogs: async (userId?: string): Promise<TimeLog[]> => {
    const endpoint = userId ? `/logs?userId=${userId}` : '/logs';
    const logs = await RealBackendService.request(endpoint);
    return logs || [];
  },

  addLog: async (log: Omit<TimeLog, 'id' | 'createdAt'>): Promise<TimeLog> => {
    const res = await RealBackendService.request('/logs', 'POST', log);
    return res; 
  },

  getActivityTypes: async (): Promise<ActivityType[]> => {
      const res = await RealBackendService.request('/config/activity-types');
      return res || DEFAULT_ACTIVITY_TYPES;
  },

  updateActivityTypes: async (types: ActivityType[]) => {
      await RealBackendService.request('/config/activity-types', 'POST', { types });
  },

  getSatisfactionTags: async (): Promise<SatisfactionTag[]> => {
      const res = await RealBackendService.request('/config/satisfaction-tags');
      return res || DEFAULT_SATISFACTION_TAGS;
  },

  updateSatisfactionTags: async (tags: SatisfactionTag[]) => {
      await RealBackendService.request('/config/satisfaction-tags', 'POST', { tags });
  },

  getAllUsers: async (): Promise<User[]> => {
      const res = await RealBackendService.request('/users');
      return res || [];
  },

  resetUserEmail: async (userId: string) => {
      const res = await RealBackendService.request(`/users/${userId}/reset-email`, 'POST');
      return !!res;
  },

  exportDatabase: () => {
      alert("Export is handled via pg_dump on the server in production mode.");
      return ""; 
  },

  importDatabase: (jsonString: string) => {
      alert("Import is handled via psql on the server in production mode.");
      return false;
  }
};

// --- EXPORT ---
export const MockBackend = USE_REAL_BACKEND ? RealBackendService : MockBackendService;
