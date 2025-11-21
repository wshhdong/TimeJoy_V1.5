
import { User, UserRole, TimeLog, ActivityType, SatisfactionTag } from '../types';
import { DEFAULT_ACTIVITY_TYPES, DEFAULT_SATISFACTION_TAGS, ADMIN_USERNAME, ADMIN_EMAIL } from '../constants';

const STORAGE_KEYS = {
  USERS: 'timejoy_users',
  LOGS: 'timejoy_logs',
  ACTIVITY_TYPES: 'timejoy_activity_types',
  SATISFACTION_TAGS: 'timejoy_satisfaction_tags',
  CURRENT_USER: 'timejoy_current_user_session'
};

// Initialize Storage with Admin and Defaults if empty
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

initStorage();

// Helper to simulate network delay
const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

export const MockBackend = {
  // Auth
  login: async (username: string, email: string): Promise<User | null> => {
    await delay();
    const users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    // Case insensitive check
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.email.toLowerCase() === email.toLowerCase());
    
    if (user) {
      user.lastLoginAt = new Date().toISOString();
      // Update user in DB
      const updatedUsers = users.map(u => u.id === user.id ? user : u);
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
      
      // Set session
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
      
      // Check uniqueness excluding self
      if (users.some(u => u.username.toLowerCase() === newUsername.toLowerCase() && u.id !== userId)) {
          return { success: false, message: "Username taken" };
      }
      if (users.some(u => u.email.toLowerCase() === newEmail.toLowerCase() && u.id !== userId)) {
          return { success: false, message: "Email taken" };
      }

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

  // Logs
  getLogs: async (userId?: string): Promise<TimeLog[]> => {
    await delay();
    const logs: TimeLog[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '[]');
    if (userId) {
      return logs.filter(l => l.userId === userId);
    }
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

  // Configs
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

  // Admin
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
