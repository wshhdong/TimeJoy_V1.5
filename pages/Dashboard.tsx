import React, { useState, useEffect } from 'react';
import { User, TimeLog, ActivityType, SatisfactionTag } from '../types';
import { MockBackend } from '../services/mockBackend';
import { Analytics } from '../services/analytics';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, ComposedChart
} from 'recharts';

interface Props {
  user: User;
}

// Custom Label for Pie Chart
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius * 1.15; // Position outside
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="#374151" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize="11"
      fontWeight="bold"
    >
      {`${name}: ${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const Dashboard: React.FC<Props> = ({ user }) => {
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [types, setTypes] = useState<ActivityType[]>([]);
  const [tags, setTags] = useState<SatisfactionTag[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const l = await MockBackend.getLogs(user.id);
      const t = await MockBackend.getActivityTypes();
      const s = await MockBackend.getSatisfactionTags();
      setLogs(l);
      setTypes(t);
      setTags(s);
    };
    loadData();
  }, [user.id]);

  const todayData = Analytics.getTodayData(logs, types);
  const weeklyCompData = Analytics.getWeeklyComparison(logs, types);
  const trendData = Analytics.getHappinessTrend(logs, tags);

  // Single Pie Data: Work Type Distribution for this week
  const getWeeklyWorkTypePie = () => {
     const weekLogs = Analytics.getWeeklyComparison(logs, types).map(d => ({
         name: d.name,
         value: d.thisWeek,
         fill: d.fill
     })).filter(d => d.value > 0);
     return weekLogs;
  };
  const workTypePieData = getWeeklyWorkTypePie();

  const getLogsForTable = (allTime: boolean) => {
      let tableLogs = [...logs];
      if (!allTime) {
          const last7 = new Date();
          last7.setDate(last7.getDate() - 7);
          tableLogs = tableLogs.filter(l => new Date(l.date) >= last7);
      }
      return tableLogs.sort((a, b) => new Date(b.date + 'T' + b.startTime).getTime() - new Date(a.date + 'T' + a.startTime).getTime());
  };

  const getType = (id: string) => types.find(t => t.id === id)?.name || id;
  const getTag = (id: string) => tags.find(t => t.id === id);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
      <h2 className="text-2xl font-bold text-gray-800">My Dashboard</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Dashboard 1 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold mb-4">Today's Balance vs Benchmark (6h)</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={todayData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: '#f9fafb'}} />
                        <Legend verticalAlign="bottom" wrapperStyle={{paddingTop: '10px'}} />
                        <Bar dataKey="hours" name="Hours Spent" radius={[8, 8, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Dashboard 2 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold mb-4">This Week vs Last Week</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyCompData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: '#f9fafb'}} />
                        <Legend verticalAlign="bottom" wrapperStyle={{paddingTop: '10px'}} />
                        <Bar dataKey="lastWeek" fill="#9CA3AF" name="Last Week" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="thisWeek" fill="#4F46E5" name="This Week" radius={[8, 8, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      {/* Dashboard 3: Single Circular Diagram (Work Types) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">Weekly Activity Distribution</h3>
          <div className="h-72 w-full flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie 
                        data={workTypePieData} 
                        dataKey="value" 
                        nameKey="name" 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={55}
                        outerRadius={75} 
                        paddingAngle={5}
                        label={renderCustomizedLabel}
                    >
                        {workTypePieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                        ))}
                    </Pie>
                    <Tooltip />
                </PieChart>
            </ResponsiveContainer>
          </div>
      </div>

      {/* Dashboard 4 */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <h3 className="text-lg font-semibold mb-4">Recent Logs (7 Days)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Feel</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {getLogsForTable(false).map(log => {
                        const tag = getTag(log.satisfactionTagId);
                        return (
                        <tr key={log.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.date}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.startTime} - {log.endTime} ({log.duration}h)</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getType(log.activityTypeId)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full items-center" style={{ backgroundColor: tag?.color || '#ccc', color: '#fff' }}>
                                    <span className="mr-1">{tag?.emoji}</span> {tag?.name}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">{log.details}</td>
                        </tr>
                    )})}
                </tbody>
            </table>
          </div>
      </div>

      {/* Dashboard 5 */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold mb-4">Happiness Trend (Weekly)</h3>
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="week" axisLine={false} tickLine={false} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} label={{ value: 'Happy Hours', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} label={{ value: '% Happy', angle: 90, position: 'insideRight' }} />
                        <Tooltip cursor={{fill: '#f9fafb'}} />
                        <Legend verticalAlign="bottom" wrapperStyle={{paddingTop: '10px'}} />
                        <Bar yAxisId="left" dataKey="happyHours" fill="#FBBF24" name="Happy Hours (Abs)" barSize={20} radius={[4, 4, 0, 0]} />
                        <Line yAxisId="right" type="monotone" dataKey="happyRate" stroke="#4F46E5" name="% Happy" strokeWidth={3} dot={{r: 4}} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
      </div>

      {/* Dashboard 6 */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <h3 className="text-lg font-semibold mb-4">All Time History</h3>
          <div className="overflow-x-auto h-96">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Feel</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {getLogsForTable(true).map(log => {
                        const tag = getTag(log.satisfactionTagId);
                        return (
                        <tr key={log.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.date}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.startTime} - {log.endTime} ({log.duration}h)</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getType(log.activityTypeId)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full items-center" style={{ backgroundColor: tag?.color || '#ccc', color: '#fff' }}>
                                    <span className="mr-1">{tag?.emoji}</span> {tag?.name}
                                </span>
                            </td>
                        </tr>
                    )})}
                </tbody>
            </table>
          </div>
      </div>
    </div>
  );
};