import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { MockBackend } from './services/mockBackend';
import { Analytics } from './services/analytics';
import { Navigation } from './components/Navigation';
import { LogActivity } from './pages/LogActivity';
import { Dashboard } from './pages/Dashboard';
import { AdminPanel } from './pages/AdminPanel';

// SVG Icons
const InfoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('log');

  // Auth Form State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [authError, setAuthError] = useState('');

  // Profile Edit State
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMsg, setEditMsg] = useState('');

  // Modal State
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [missingData, setMissingData] = useState<{date: string, missingHours: number} | null>(null);

  // Check Login Session
  useEffect(() => {
    const init = async () => {
      const u = MockBackend.getCurrentUser();
      if (u) {
        setUser(u);
        setEditUsername(u.username);
        setEditEmail(u.email);
        checkMissingLogs(u);
      }
      setLoading(false);
    };
    init();
  }, []);

  const checkMissingLogs = async (u: User) => {
      const logs = await MockBackend.getLogs(u.id);
      const result = Analytics.checkYesterdayMissing(logs);
      if (result.missingHours > 0) {
          setMissingData(result);
          setShowMissingModal(true);
      }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const u = await MockBackend.login(username, email);
    if (u) {
      setUser(u);
      setEditUsername(u.username);
      setEditEmail(u.email);
      checkMissingLogs(u);
    } else {
      setAuthError("Invalid credentials. Username and Email must match.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const res = await MockBackend.register(username, email);
    if (typeof res === 'string') {
      setAuthError(res);
    } else {
      setUser(res);
      setEditUsername(res.username);
      setEditEmail(res.email);
      alert("Registration Successful!");
    }
  };

  const handleLogout = async () => {
    await MockBackend.logout();
    setUser(null);
    setUsername('');
    setEmail('');
    setCurrentTab('log');
  };

  const handleUpdateProfile = async () => {
      if(!user) return;
      const res = await MockBackend.updateProfile(user.id, editUsername, editEmail);
      if (res.success && res.user) {
          setUser(res.user);
          setEditMsg("Profile updated successfully!");
          setTimeout(() => setEditMsg(''), 3000);
      } else {
          setEditMsg(res.message || "Error updating profile");
      }
  };

  const handleAutoFillMissing = async () => {
      if (!user || !missingData) return;
      const types = await MockBackend.getActivityTypes();
      const tags = await MockBackend.getSatisfactionTags();
      const lifeType = types.find(t => t.name.includes("Life")) || types[0];
      const happyTag = tags.find(t => t.name === "Happy") || tags[0];

      await MockBackend.addLog({
          userId: user.id,
          date: missingData.date,
          startTime: "00:00",
          endTime: "00:00", // Placeholder logic
          duration: missingData.missingHours,
          activityTypeId: lifeType.id,
          satisfactionTagId: happyTag.id,
          details: "Mark by System after user approval"
      });

      setShowMissingModal(false);
      alert(`Automatically logged ${missingData.missingHours} hours for yesterday.`);
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-gray-500">Loading TimeJoy...</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
          <div>
            <h2 className="mt-4 text-center text-3xl font-extrabold text-gray-800">TimeJoy</h2>
            <p className="mt-2 text-center text-sm text-gray-500">
              Review your time, optimize your happiness.
            </p>
          </div>
          
          <div className="flex justify-center space-x-8 border-b border-gray-100 pb-4">
              <button 
                className={`pb-2 text-lg font-medium transition-colors ${authMode === 'login' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'}`}
                onClick={() => setAuthMode('login')}
              >
                  Login
              </button>
              <button 
                className={`pb-2 text-lg font-medium transition-colors ${authMode === 'register' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'}`}
                onClick={() => setAuthMode('register')}
              >
                  Register
              </button>
          </div>

          <form className="mt-8 space-y-6" onSubmit={authMode === 'login' ? handleLogin : handleRegister}>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 placeholder-gray-400 text-white focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-600 bg-gray-700 placeholder-gray-400 text-white focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {authError && <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{authError}</div>}

            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-lg shadow-indigo-500/30 transition-all"
              >
                {authMode === 'login' ? 'Sign in to TimeJoy' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation 
        user={user} 
        currentTab={currentTab} 
        onTabChange={setCurrentTab} 
        onLogout={handleLogout} 
      />

      <main className="pb-20">
        {currentTab === 'log' && <LogActivity user={user} onViewDashboard={() => setCurrentTab('dashboard')} />}
        {currentTab === 'dashboard' && <Dashboard user={user} />}
        {currentTab === 'profile' && (
            <div className="max-w-lg mx-auto mt-10 p-8 bg-white rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">My Profile</h2>
                <div className="space-y-6">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Username</label>
                        <input 
                            type="text" 
                            value={editUsername} 
                            onChange={e => setEditUsername(e.target.value)}
                            className="w-full border border-gray-600 bg-gray-700 p-3 rounded-lg text-white placeholder-gray-400 focus:ring-primary focus:border-primary" 
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                        <input 
                            type="email" 
                            value={editEmail} 
                            onChange={e => setEditEmail(e.target.value)}
                            className="w-full border border-gray-600 bg-gray-700 p-3 rounded-lg text-white placeholder-gray-400 focus:ring-primary focus:border-primary" 
                        />
                    </div>
                    
                    {editMsg && (
                        <div className={`p-3 rounded text-sm ${editMsg.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {editMsg}
                        </div>
                    )}

                    <button 
                        onClick={handleUpdateProfile}
                        className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/30"
                    >
                        Update Profile
                    </button>
                </div>
            </div>
        )}
        
        {/* Admin Sub-Routing handled in Component */}
        {user.role === UserRole.ADMIN && currentTab === 'admin' && (
            <AdminPanel currentUser={user} />
        )}
      </main>

      {/* Missing Time Modal */}
      {showMissingModal && missingData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl transform transition-all">
                  <div className="flex items-center mb-4 text-amber-500">
                      <InfoIcon />
                      <h3 className="text-lg font-bold ml-2">Missing Activity Detected</h3>
                  </div>
                  <p className="text-gray-600 mb-6">
                      You have <strong>{missingData.missingHours.toFixed(1)} hours</strong> unlogged for {missingData.date}. 
                      Would you like to autofill this as "Life & Family" + "Happy"?
                  </p>
                  <div className="flex flex-col space-y-3">
                      <button 
                        onClick={handleAutoFillMissing}
                        className="w-full bg-primary text-white py-3 rounded-lg hover:bg-indigo-700 font-bold transition"
                      >
                          OK, mark it for me
                      </button>
                      <button 
                        onClick={() => setShowMissingModal(false)}
                        className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 font-medium transition"
                      >
                          No, I'll log it myself
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;