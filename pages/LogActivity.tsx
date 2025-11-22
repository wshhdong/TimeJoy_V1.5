import React, { useState, useEffect } from 'react';
import { User, ActivityType, SatisfactionTag, TimeLog } from '../types';
import { MockBackend } from '../services/mockBackend';
import TimeRangeSlider from '../components/TimeRangeSlider';

// Icons
const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

interface Props {
  user: User;
  onViewDashboard: () => void;
}

const generateTimeOptions = () => {
    const options = [];
    for (let i = 0; i <= 48; i++) {
        const h = Math.floor(i / 2);
        const m = (i % 2) * 30;
        const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        options.push(timeStr);
    }
    return options;
};

// Helper to get local date string YYYY-MM-DD
const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const LogActivity: React.FC<Props> = ({ user, onViewDashboard }) => {
  const [types, setTypes] = useState<ActivityType[]>([]);
  const [tags, setTags] = useState<SatisfactionTag[]>([]);
  const [todayLogs, setTodayLogs] = useState<TimeLog[]>([]);

  // Form State
  const [date, setDate] = useState(getTodayString());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:30');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const timeOptions = generateTimeOptions();

  useEffect(() => {
    const init = async () => {
      const t = await MockBackend.getActivityTypes();
      const s = await MockBackend.getSatisfactionTags();
      const l = await MockBackend.getLogs(user.id);
      
      setTypes(t.filter(x => x.isVisible).sort((a,b) => a.order - b.order));
      setTags(s.filter(x => x.isVisible).sort((a,b) => a.order - b.order));
      
      setTodayLogs(l.filter(x => x.date === date));
      
      if (t.length > 0 && !selectedType) setSelectedType(t[0].id);
      if (s.length > 0 && !selectedTag) setSelectedTag(s[0].id);

      // Smart Defaults
      setDefaultTimes(l.filter(x => x.date === date));
    };
    init();
  }, [user.id, date]);

  const setDefaultTimes = (logs: TimeLog[]) => {
      if (logs.length === 0) {
          setStartTime('00:00');
          setEndTime('00:30');
          return;
      }
      const sorted = [...logs].sort((a, b) => a.endTime.localeCompare(b.endTime));
      const lastLog = sorted[sorted.length - 1];
      
      setStartTime(lastLog.endTime);
      
      const [h, m] = lastLog.endTime.split(':').map(Number);
      let newM = m + 30;
      let newH = h;
      if (newM >= 60) { newH += 1; newM -= 60; }
      if (newH > 24) newH = 24;
      
      const nextTime = `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
      setEndTime(nextTime);
  };

  const calculateDuration = () => {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const val = (eh + em / 60) - (sh + sm / 60);
      return val.toFixed(1);
  };

  const validate = (): boolean => {
      if (startTime >= endTime) {
          setError("Start time must be earlier than end time.");
          return false;
      }
      const isOccupied = todayLogs.some(log => {
          return (startTime < log.endTime && endTime > log.startTime);
      });
      if (isOccupied) {
          setError("This time period overlaps with an existing log.");
          return false;
      }
      return true;
  };

  const isTimeOccupied = (timeStr: string) => {
      return todayLogs.some(log => timeStr >= log.startTime && timeStr < log.endTime);
  };

  const handleSubmit = async (redirect: boolean) => {
      setError('');
      if (!validate()) return;

      const logData = {
          userId: user.id,
          date,
          startTime,
          endTime,
          duration: parseFloat(calculateDuration()),
          activityTypeId: selectedType,
          satisfactionTagId: selectedTag,
          details
      };

      await MockBackend.addLog(logData);
      setSuccessMsg("Activity Logged!");
      setTimeout(() => setSuccessMsg(''), 3000);

      if (redirect) {
          onViewDashboard();
      } else {
          const allLogs = await MockBackend.getLogs(user.id);
          const newTodayLogs = allLogs.filter(l => l.date === date);
          setTodayLogs(newTodayLogs);
          setDefaultTimes(newTodayLogs);
          setDetails('');
      }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Log Activity</h2>
      
      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-200">{error}</div>}
      {successMsg && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded border border-green-200">{successMsg}</div>}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
        
        {/* Top Row: Date, Start, End */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Date</label>
                <div className="relative">
                    <input 
                        type="date" 
                        value={date} 
                        onChange={e => setDate(e.target.value)}
                        onClick={(e) => (e.target as HTMLInputElement).showPicker()}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-2 border bg-white text-gray-900 cursor-pointer appearance-none pr-8"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <ChevronDownIcon />
                    </div>
                </div>
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Start Time</label>
                <select 
                    value={startTime} 
                    onChange={(e) => setStartTime(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-2 border bg-white text-gray-900"
                >
                    {timeOptions.map(t => {
                        const occupied = isTimeOccupied(t);
                        return (
                            <option key={t} value={t} className={occupied ? "text-red-400" : ""}>
                                {t}{occupied ? " - occupied" : ""}
                            </option>
                        );
                    })}
                </select>
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">End Time</label>
                <select 
                    value={endTime} 
                    onChange={(e) => setEndTime(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-2 border bg-white text-gray-900"
                >
                     {timeOptions.map(t => {
                        const occupied = isTimeOccupied(t);
                        return (
                            <option key={t} value={t} className={occupied ? "text-red-400" : ""}>
                                {t}{occupied ? " - occupied" : ""}
                            </option>
                        );
                    })}
                </select>
            </div>
        </div>

        {/* Visual Bar */}
        <div className="pt-2">
            <TimeRangeSlider 
                startTime={startTime} 
                endTime={endTime} 
                occupiedRanges={todayLogs.map(l => {
                    const tag = tags.find(t => t.id === l.satisfactionTagId);
                    return { 
                        start: l.startTime, 
                        end: l.endTime,
                        color: tag?.color 
                    };
                })}
            />
            <div className="text-right">
                 <span className="text-xs text-gray-500 uppercase tracking-wide">Duration of this Log</span>
                 <span className="ml-2 text-2xl font-bold text-primary">{calculateDuration()} Hrs</span>
            </div>
        </div>

        <hr className="border-gray-100" />

        {/* Activity Type */}
        <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Activity Type</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {types.map(type => (
                    <div 
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        className={`cursor-pointer p-3 rounded-lg border-2 flex items-center justify-center transition-all
                            ${selectedType === type.id ? 'border-primary bg-primary/5' : 'border-transparent bg-gray-50 hover:bg-gray-100'}
                        `}
                    >
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: type.color }}></div>
                        <span className="text-sm font-medium">{type.name}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* Satisfaction */}
        <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">How you feel</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {tags.map(tag => (
                    <div
                        key={tag.id}
                        onClick={() => setSelectedTag(tag.id)}
                        className={`cursor-pointer p-3 rounded-lg border-2 flex items-center justify-center transition-all
                             ${selectedTag === tag.id 
                                ? 'border-current bg-opacity-10' 
                                : 'border-transparent bg-gray-50 hover:bg-gray-100'}
                        `}
                        style={{ 
                            borderColor: selectedTag === tag.id ? tag.color : 'transparent',
                            backgroundColor: selectedTag === tag.id ? `${tag.color}1A` : undefined,
                        }}
                    >
                        <span className="mr-2 text-xl">{tag.emoji}</span>
                        <span className="text-sm font-medium" style={{ color: selectedTag === tag.id ? tag.color : '#374151' }}>
                            {tag.name}
                        </span>
                    </div>
                ))}
            </div>
        </div>

        {/* Details */}
        <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Details (Optional)</label>
            <textarea
                rows={3}
                value={details}
                onChange={e => setDetails(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 p-2 border bg-white text-gray-900"
                placeholder="What specifically were you doing?"
            />
        </div>

        {/* Actions */}
        <div className="pt-4 flex flex-col sm:flex-row gap-4">
            <button 
                onClick={() => handleSubmit(false)}
                className="flex-1 bg-secondary text-white py-3 px-4 rounded-lg font-bold hover:bg-green-600 transition shadow-lg shadow-green-500/30"
            >
                Submit & Log More
            </button>
            <button 
                onClick={() => handleSubmit(true)}
                className="flex-1 bg-primary text-white py-3 px-4 rounded-lg font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/30"
            >
                Submit & View Dashboard
            </button>
        </div>

      </div>
    </div>
  );
};
