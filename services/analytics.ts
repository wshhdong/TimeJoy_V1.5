
import { TimeLog, ActivityType, SatisfactionTag } from '../types';

// Native helpers to replace date-fns dependencies
const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseDate = (dateStr: string): Date => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
};

const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

const subWeeks = (date: Date, amount: number): Date => {
    const d = new Date(date);
    d.setDate(d.getDate() - (amount * 7));
    return d;
};

// Helpers
const getDuration = (start: string, end: string): number => {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh + em / 60) - (sh + sm / 60);
};

export const Analytics = {
  // Dashboard 1: Today Bar Chart
  getTodayData: (logs: TimeLog[], types: ActivityType[]) => {
    const today = formatDate(new Date());
    const todayLogs = logs.filter(l => l.date === today);
    
    const data = types.filter(t => t.isVisible).map(type => {
      const sum = todayLogs
        .filter(l => l.activityTypeId === type.id)
        .reduce((acc, curr) => acc + curr.duration, 0);
      return {
        name: type.name,
        hours: sum,
        benchmark: 6, // 6-hour benchmark as requested
        fill: type.color
      };
    });
    return data;
  },

  // Dashboard 2: Week vs Last Week
  getWeeklyComparison: (logs: TimeLog[], types: ActivityType[]) => {
    const now = new Date();
    const thisWeekStart = getStartOfWeek(now);
    const lastWeekStart = subWeeks(thisWeekStart, 1);
    
    const thisWeekLogs = logs.filter(l => parseDate(l.date) >= thisWeekStart);
    const lastWeekLogs = logs.filter(l => {
        const d = parseDate(l.date);
        return d >= lastWeekStart && d < thisWeekStart;
    });

    return types.filter(t => t.isVisible).map(type => ({
        name: type.name,
        thisWeek: thisWeekLogs.filter(l => l.activityTypeId === type.id).reduce((a, c) => a + c.duration, 0),
        lastWeek: lastWeekLogs.filter(l => l.activityTypeId === type.id).reduce((a, c) => a + c.duration, 0),
        fill: type.color
    }));
  },

  // Dashboard 3: Weekly Mini-Pies (Data Preparation)
  getWeeklyEmotionByWork: (logs: TimeLog[], types: ActivityType[], tags: SatisfactionTag[]) => {
    const now = new Date();
    const thisWeekStart = getStartOfWeek(now);
    const thisWeekLogs = logs.filter(l => parseDate(l.date) >= thisWeekStart);

    // Return an array of objects, each object represents a Work Type, containing distribution of emotions
    return types.filter(t => t.isVisible).map(type => {
        const typeLogs = thisWeekLogs.filter(l => l.activityTypeId === type.id);
        const totalDuration = typeLogs.reduce((a, c) => a + c.duration, 0);
        
        const emotionData = tags.filter(t => t.isVisible).map(tag => ({
            name: tag.name,
            value: typeLogs.filter(l => l.satisfactionTagId === tag.id).reduce((a, c) => a + c.duration, 0),
            fill: tag.color
        }));

        return {
            workType: type.name,
            total: totalDuration,
            data: emotionData
        };
    });
  },

  // Dashboard 5: Trend Line (Happy hours vs % Happy)
  getHappinessTrend: (logs: TimeLog[], tags: SatisfactionTag[]) => {
      // Group by week
      const weeklyData: {[key: string]: { total: number, happy: number }} = {};
      const happyTagIds = tags.filter(t => t.score === 1).map(t => t.id);

      logs.forEach(log => {
          const date = parseDate(log.date);
          const weekStart = formatDate(getStartOfWeek(date));
          
          if (!weeklyData[weekStart]) weeklyData[weekStart] = { total: 0, happy: 0 };
          
          weeklyData[weekStart].total += log.duration;
          if (happyTagIds.includes(log.satisfactionTagId)) {
              weeklyData[weekStart].happy += log.duration;
          }
      });

      return Object.keys(weeklyData).sort().map(week => ({
          week,
          happyHours: parseFloat(weeklyData[week].happy.toFixed(1)),
          happyRate: weeklyData[week].total > 0 
            ? parseFloat(((weeklyData[week].happy / weeklyData[week].total) * 100).toFixed(1)) 
            : 0
      }));
  },

  // Missing Log Detection
  checkYesterdayMissing: (logs: TimeLog[]) => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = formatDate(yesterday);
      
      const yesterdayLogs = logs.filter(l => l.date === yStr);
      
      // Sort by start time
      yesterdayLogs.sort((a, b) => a.startTime.localeCompare(b.startTime));

      // Calculate gaps (Simple 24h check)
      let filledDuration = yesterdayLogs.reduce((acc, cur) => acc + cur.duration, 0);
      const missing = 24 - filledDuration;
      
      // Logic to find specific gap ranges could be more complex, 
      // but requirement just asks for "XX hours not logging".
      return {
          date: yStr,
          missingHours: missing > 0 ? missing : 0
      };
  }
};
