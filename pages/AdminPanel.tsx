import React, { useState, useEffect } from 'react';
import { User, ActivityType, SatisfactionTag, TimeLog } from '../types';
import { MockBackend } from '../services/mockBackend';
import { Analytics } from '../services/analytics';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    PieChart, Pie, Cell, ComposedChart, Line 
} from 'recharts';

// Icons
const ArrowUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>;
const ArrowDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
const PencilIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>;

interface Props {
    currentUser: User;
}

interface FieldModalState {
    isOpen: boolean;
    type: 'activity' | 'tag';
    mode: 'add' | 'edit';
    data: any;
}

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius * 1.15;
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

export const AdminPanel: React.FC<Props> = ({ currentUser }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'fields' | 'users'>('dashboard');
    
    // Data State
    const [users, setUsers] = useState<User[]>([]);
    const [logs, setLogs] = useState<TimeLog[]>([]);
    const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
    const [satisfactionTags, setSatisfactionTags] = useState<SatisfactionTag[]>([]);
    const [toast, setToast] = useState<string | null>(null);
    
    // Modal State
    const [modal, setModal] = useState<FieldModalState>({ isOpen: false, type: 'activity', mode: 'add', data: {} });

    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = async () => {
        setUsers(await MockBackend.getAllUsers());
        setLogs(await MockBackend.getLogs()); // All logs
        const types = await MockBackend.getActivityTypes();
        setActivityTypes(types.sort((a,b) => a.order - b.order));
        const tags = await MockBackend.getSatisfactionTags();
        setSatisfactionTags(tags.sort((a,b) => a.order - b.order));
    };

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    // --- Analytics ---
    const getLast7DaysMetrics = () => {
        const last7 = new Date();
        last7.setDate(last7.getDate() - 7);
        const recentLogs = logs.filter(l => new Date(l.date) >= last7);
        const activeUsers = new Set(recentLogs.map(l => l.userId)).size;
        const totalHours = recentLogs.reduce((a, b) => a + b.duration, 0);
        return { activeUsers, totalHours };
    };
    
    const getAllTimeMetrics = () => {
        const activeUsers = new Set(logs.map(l => l.userId)).size;
        const totalHours = logs.reduce((a, b) => a + b.duration, 0);
        return { activeUsers, totalHours };
    };

    const metrics7D = getLast7DaysMetrics();
    const metricsAll = getAllTimeMetrics();

    // Aggregate Data for Charts
    const aggTodayData = Analytics.getTodayData(logs, activityTypes);
    const aggWeeklyCompData = Analytics.getWeeklyComparison(logs, activityTypes);
    const aggTrendData = Analytics.getHappinessTrend(logs, satisfactionTags);
    
    const getAggWorkTypePie = () => {
        const weekLogs = Analytics.getWeeklyComparison(logs, activityTypes).map(d => ({
            name: d.name,
            value: d.thisWeek, // Using "thisWeek" totals from comparison
            fill: d.fill
        })).filter(d => d.value > 0);
        return weekLogs;
    };
    const aggWorkTypePieData = getAggWorkTypePie();

    // --- DB Actions ---

    const handleExport = () => {
        const data = MockBackend.exportDatabase();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timejoy_backup_${new Date().toISOString()}.json`;
        a.click();
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (file) {
                const text = await file.text();
                const success = MockBackend.importDatabase(text);
                if(success) {
                    alert('Database imported successfully. Refreshing...');
                    refreshData();
                } else {
                    alert('Import failed. Check format.');
                }
            }
        };
        input.click();
    };

    const handleResetEmail = async (uid: string, username: string) => {
        const confirmed = window.confirm(`Are you sure you want to reset the email for user '${username}'?\n\nIt will be set to: ${username}@timejoy.com`);
        if(confirmed) {
            const success = await MockBackend.resetUserEmail(uid);
            if (success) {
                await refreshData();
                alert(`✅ Reset completed.\n\nThe new email is: ${username}@timejoy.com`);
                showToast(`Email reset to: ${username}@timejoy.com`);
            } else {
                alert("Failed to reset email.");
            }
        }
    };

    // --- Field Control Logic ---

    const toggleVisibility = async (type: 'activity' | 'tag', id: string, current: boolean) => {
        if (type === 'activity') {
            const newTypes = activityTypes.map(t => t.id === id ? { ...t, isVisible: !current } : t);
            await MockBackend.updateActivityTypes(newTypes);
            setActivityTypes(newTypes);
        } else {
            const newTags = satisfactionTags.map(t => t.id === id ? { ...t, isVisible: !current } : t);
            await MockBackend.updateSatisfactionTags(newTags);
            setSatisfactionTags(newTags);
        }
    };

    const moveItem = async (type: 'activity' | 'tag', index: number, direction: 'up' | 'down') => {
        const items = type === 'activity' ? [...activityTypes] : [...satisfactionTags];
        if (direction === 'up' && index > 0) {
            [items[index], items[index - 1]] = [items[index - 1], items[index]];
        } else if (direction === 'down' && index < items.length - 1) {
            [items[index], items[index + 1]] = [items[index + 1], items[index]];
        } else {
            return; // Can't move
        }

        // Re-assign orders based on new index
        const reordered = items.map((item: any, idx) => ({ ...item, order: idx + 1 }));

        if (type === 'activity') {
            await MockBackend.updateActivityTypes(reordered as ActivityType[]);
            setActivityTypes(reordered as ActivityType[]);
        } else {
            await MockBackend.updateSatisfactionTags(reordered as SatisfactionTag[]);
            setSatisfactionTags(reordered as SatisfactionTag[]);
        }
    };

    const openModal = (type: 'activity' | 'tag', mode: 'add' | 'edit', data: any = {}) => {
        setModal({ isOpen: true, type, mode, data: { ...data } });
    };

    const closeModal = () => {
        setModal({ ...modal, isOpen: false });
    };

    const saveModal = async () => {
        const { type, mode, data } = modal;
        if (!data.name || !data.color) {
            alert("Name and Color are required.");
            return;
        }

        if (type === 'activity') {
            let newTypes = [...activityTypes];
            if (mode === 'add') {
                newTypes.push({
                    id: `act_${Date.now()}`,
                    name: data.name,
                    color: data.color,
                    isVisible: true,
                    order: activityTypes.length + 1
                });
            } else {
                newTypes = newTypes.map(t => t.id === data.id ? { ...t, name: data.name, color: data.color } : t);
            }
            await MockBackend.updateActivityTypes(newTypes);
            setActivityTypes(newTypes);
        } else {
            // Tag
            let newTags = [...satisfactionTags];
            if (mode === 'add') {
                newTags.push({
                    id: `sat_${Date.now()}`,
                    name: data.name,
                    color: data.color,
                    emoji: data.emoji || '🙂',
                    isVisible: true,
                    order: satisfactionTags.length + 1,
                    score: 0
                });
            } else {
                newTags = newTags.map(t => t.id === data.id ? { ...t, name: data.name, color: data.color, emoji: data.emoji } : t);
            }
            await MockBackend.updateSatisfactionTags(newTags);
            setSatisfactionTags(newTags);
        }
        closeModal();
        showToast(`${mode === 'add' ? 'Added' : 'Updated'} successfully!`);
    };

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 relative">
            {/* Toast Notification */}
            {toast && (
                <div className="fixed top-20 right-5 bg-green-600 text-white px-6 py-3 rounded shadow-lg z-50 animate-fade-in-down">
                    {toast}
                </div>
            )}

            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Admin Panel</h2>
                <div className="flex space-x-4 bg-white p-1 rounded-lg border shadow-sm inline-flex">
                    <button 
                        onClick={() => setActiveTab('dashboard')} 
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        Overall Dashboard
                    </button>
                    <button 
                        onClick={() => setActiveTab('fields')} 
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'fields' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        Field Control
                    </button>
                    <button 
                        onClick={() => setActiveTab('users')} 
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        Account Manage
                    </button>
                </div>
            </div>

            {activeTab === 'dashboard' && (
                <div className="space-y-8">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow border text-center">
                            <h4 className="text-gray-500 text-xs uppercase tracking-wider">Active Users (7d)</h4>
                            <div className="text-3xl font-bold text-primary mt-2">{metrics7D.activeUsers}</div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow border text-center">
                            <h4 className="text-gray-500 text-xs uppercase tracking-wider">Total Hours (7d)</h4>
                            <div className="text-3xl font-bold text-secondary mt-2">{metrics7D.totalHours.toFixed(1)}</div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow border text-center">
                            <h4 className="text-gray-500 text-xs uppercase tracking-wider">Active Users (All Time)</h4>
                            <div className="text-3xl font-bold text-gray-800 mt-2">{metricsAll.activeUsers}</div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow border text-center">
                            <h4 className="text-gray-500 text-xs uppercase tracking-wider">Total Hours (All Time)</h4>
                            <div className="text-3xl font-bold text-gray-800 mt-2">{metricsAll.totalHours.toFixed(1)}</div>
                        </div>
                    </div>

                    {/* DB Actions */}
                     <div className="flex gap-4 justify-end">
                        <button onClick={handleExport} className="bg-gray-800 text-white px-4 py-2 rounded text-sm hover:bg-gray-900">Export Backup</button>
                        <button onClick={handleImport} className="border border-gray-800 text-gray-800 px-4 py-2 rounded text-sm hover:bg-gray-50">Import Backup</button>
                    </div>

                    {/* Aggregate Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                         <div className="bg-white p-6 rounded-xl shadow border h-80">
                             <h4 className="font-bold mb-4">Agg. Today's Activity (Dash 1)</h4>
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={aggTodayData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{fill: '#f9fafb'}} />
                                    <Legend verticalAlign="bottom" wrapperStyle={{paddingTop: '10px'}} />
                                    <Bar dataKey="hours" name="Total Hours" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow border h-80">
                             <h4 className="font-bold mb-4">Agg. Weekly Comparison (Dash 2)</h4>
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={aggWeeklyCompData}>
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
                        <div className="bg-white p-6 rounded-xl shadow border h-80">
                             <h4 className="font-bold mb-4">Agg. Weekly Distribution (Dash 3)</h4>
                             <div className="h-full w-full flex justify-center pb-6">
                             <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        data={aggWorkTypePieData} 
                                        dataKey="value" 
                                        nameKey="name" 
                                        cx="50%" 
                                        cy="50%" 
                                        innerRadius={55}
                                        outerRadius={75} 
                                        paddingAngle={5}
                                        label={renderCustomizedLabel}
                                    >
                                        {aggWorkTypePieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow border h-80">
                             <h4 className="font-bold mb-4">Agg. Happiness Trend (Dash 5)</h4>
                             <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={aggTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis dataKey="week" axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="left" axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{fill: '#f9fafb'}} />
                                    <Legend verticalAlign="bottom" wrapperStyle={{paddingTop: '10px'}} />
                                    <Bar yAxisId="left" dataKey="happyHours" fill="#FBBF24" name="Happy Hours" radius={[4, 4, 0, 0]} />
                                    <Line yAxisId="right" type="monotone" dataKey="happyRate" stroke="#4F46E5" name="% Happy" strokeWidth={3} dot={{r: 4}} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'fields' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Activity Types */}
                    <div className="bg-white p-6 rounded-xl shadow border">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Activity Types</h3>
                            <button onClick={() => openModal('activity', 'add')} className="text-sm bg-primary text-white px-3 py-1 rounded hover:bg-indigo-700">Add New</button>
                        </div>
                        <div className="space-y-2">
                            {activityTypes.map((t, idx) => (
                                <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col gap-1 text-gray-400">
                                            <button onClick={() => moveItem('activity', idx, 'up')} className="hover:text-primary"><ArrowUpIcon /></button>
                                            <button onClick={() => moveItem('activity', idx, 'down')} className="hover:text-primary"><ArrowDownIcon /></button>
                                        </div>
                                        <div className="w-6 h-6 rounded-full border border-gray-300" style={{background: t.color}}></div>
                                        <span className="font-medium">{t.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => openModal('activity', 'edit', t)} className="text-gray-500 hover:text-primary p-1"><PencilIcon /></button>
                                        <button 
                                            onClick={() => toggleVisibility('activity', t.id, t.isVisible)}
                                            className={`text-xs px-3 py-1 rounded-full font-bold ${t.isVisible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                        >
                                            {t.isVisible ? 'Visible' : 'Hidden'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                     {/* Satisfaction Tags */}
                     <div className="bg-white p-6 rounded-xl shadow border">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Satisfaction Tags</h3>
                            <button onClick={() => openModal('tag', 'add')} className="text-sm bg-primary text-white px-3 py-1 rounded hover:bg-indigo-700">Add New</button>
                        </div>
                         <div className="space-y-2">
                            {satisfactionTags.map((t, idx) => (
                                <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border hover:bg-gray-100 transition-colors">
                                     <div className="flex items-center gap-3">
                                        <div className="flex flex-col gap-1 text-gray-400">
                                            <button onClick={() => moveItem('tag', idx, 'up')} className="hover:text-primary"><ArrowUpIcon /></button>
                                            <button onClick={() => moveItem('tag', idx, 'down')} className="hover:text-primary"><ArrowDownIcon /></button>
                                        </div>
                                        <span className="text-xl">{t.emoji}</span>
                                        <span className="font-medium" style={{color: t.color}}>{t.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => openModal('tag', 'edit', t)} className="text-gray-500 hover:text-primary p-1"><PencilIcon /></button>
                                        <button 
                                            onClick={() => toggleVisibility('tag', t.id, t.isVisible)}
                                            className={`text-xs px-3 py-1 rounded-full font-bold ${t.isVisible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                        >
                                            {t.isVisible ? 'Visible' : 'Hidden'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="bg-white shadow overflow-hidden sm:rounded-lg border">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.username}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.registeredAt.split('T')[0]}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.lastLoginAt.split('T')[0]}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button 
                                            onClick={() => handleResetEmail(u.id, u.username)} 
                                            className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-900 text-xs font-bold py-2 px-3 rounded border border-red-200"
                                        >
                                            Reset Email
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Edit/Add Modal */}
            {modal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4 text-gray-800">
                            {modal.mode === 'add' ? 'Add New' : 'Edit'} {modal.type === 'activity' ? 'Activity Type' : 'Satisfaction Tag'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Name</label>
                                <input 
                                    type="text" 
                                    value={modal.data.name || ''} 
                                    onChange={e => setModal({...modal, data: {...modal.data, name: e.target.value}})}
                                    className="w-full border border-gray-300 rounded p-2 focus:ring-primary focus:border-primary"
                                    placeholder="e.g. Work"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Color (Hex)</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="color" 
                                        value={modal.data.color || '#000000'} 
                                        onChange={e => setModal({...modal, data: {...modal.data, color: e.target.value}})}
                                        className="h-10 w-10 rounded cursor-pointer border-0 p-0"
                                    />
                                    <input 
                                        type="text" 
                                        value={modal.data.color || '#000000'} 
                                        onChange={e => setModal({...modal, data: {...modal.data, color: e.target.value}})}
                                        className="flex-1 border border-gray-300 rounded p-2 uppercase"
                                    />
                                </div>
                            </div>
                            {modal.type === 'tag' && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Emoji</label>
                                    <input 
                                        type="text" 
                                        value={modal.data.emoji || ''} 
                                        onChange={e => setModal({...modal, data: {...modal.data, emoji: e.target.value}})}
                                        className="w-full border border-gray-300 rounded p-2 text-xl"
                                        placeholder="😊"
                                    />
                                </div>
                            )}
                            <div className="flex gap-3 pt-4">
                                <button onClick={saveModal} className="flex-1 bg-primary text-white py-2 rounded font-bold hover:bg-indigo-700">Save</button>
                                <button onClick={closeModal} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded font-bold hover:bg-gray-200">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};