
import React, { useState, useEffect, useCallback } from 'react';
import { User, Expense } from './types.ts';
import UserManagement from './components/UserManagement.tsx';
import ExpenseForm from './components/ExpenseForm.tsx';
import ExpenseList from './components/ExpenseList.tsx';
import Summary from './components/Summary.tsx';
import { Logo } from './components/icons.tsx';
import { GoogleGenAI } from "@google/genai";

const AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=James',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aria',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('split-ease-auth');
    return saved ? JSON.parse(saved) : null;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const savedUsers = localStorage.getItem('split-ease-users');
    return savedUsers ? JSON.parse(savedUsers) : [];
  });
  
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const savedExpenses = localStorage.getItem('split-ease-expenses');
    return savedExpenses ? JSON.parse(savedExpenses) : [];
  });
  
  const [aiStatus, setAiStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [onboardingName, setOnboardingName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const checkAI = useCallback(async () => {
    setAiStatus('checking');
    try {
      const apiKey = process.env.API_KEY || '';
      if (!apiKey || apiKey.length < 5) throw new Error("Key missing");
      const ai = new GoogleGenAI({ apiKey });
      await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'ping',
        config: { maxOutputTokens: 2, thinkingConfig: { thinkingBudget: 0 } }
      });
      setAiStatus('ok');
    } catch (err) {
      setAiStatus('error');
    }
  }, []);

  const handleHashImport = useCallback(() => {
    const hash = window.location.hash;
    if (hash.includes('import=')) {
      const parts = hash.split('import=');
      const sharedData = parts[1];
      try {
        const decodedString = decodeURIComponent(atob(sharedData).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        const decoded = JSON.parse(decodedString);
        
        if (decoded.users && decoded.users.length > 0) {
          if (confirm(`Group data found! Import this group? (Your current data will be overwritten)`)) {
            setUsers(decoded.users);
            setExpenses(decoded.expenses || []);
            window.history.replaceState(null, "", window.location.pathname + window.location.search);
            showToast("Group imported!");
          }
        }
      } catch (e) {
        console.error("Import failed", e);
      }
    }
  }, []);

  useEffect(() => {
    checkAI();
    handleHashImport();
    window.addEventListener('hashchange', handleHashImport);
    return () => window.removeEventListener('hashchange', handleHashImport);
  }, [checkAI, handleHashImport]);

  useEffect(() => { localStorage.setItem('split-ease-users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('split-ease-expenses', JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { 
    if (currentUser) localStorage.setItem('split-ease-auth', JSON.stringify(currentUser));
  }, [currentUser]);

  const handleOnboarding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingName.trim()) return;
    
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: onboardingName.trim(),
      picture: selectedAvatar
    };
    
    setCurrentUser(newUser);
    setUsers(prev => {
      if (prev.find(u => u.name.toLowerCase() === newUser.name.toLowerCase())) return prev;
      return [newUser, ...prev];
    });
  };

  const logout = () => {
    if (confirm("Logout? Group data will stay in your local storage.")) {
      localStorage.removeItem('split-ease-auth');
      setCurrentUser(null);
    }
  };

  const handleShareGroup = () => {
    try {
      const data = { name: "SplitEase Group", users, expenses };
      const jsonString = JSON.stringify(data);
      const encoded = btoa(encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g, (m, p1) => String.fromCharCode(parseInt(p1, 16))));
      
      // Clean URL logic: manually extract host to avoid blob: prefix issues
      let cleanOrigin = window.location.origin;
      if (cleanOrigin.startsWith('blob:')) {
          // If we are in a blob context, manually reconstruct from location parts
          cleanOrigin = `${window.location.protocol}//${window.location.host}`;
      }
      // Strip double slashes if any (except protocol)
      const baseUrl = (cleanOrigin + window.location.pathname).replace(/([^:]\/)\/+/g, "$1");
      const shareUrl = `${baseUrl}#import=${encoded}`;
      
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast('Link copied to clipboard!');
      }).catch(err => {
        console.error('Clipboard error', err);
        prompt('Copy this link manually:', shareUrl);
      });
    } catch (e) {
      showToast('Error sharing group', 'error');
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="relative">
            <div className="absolute inset-0 bg-sky-500 blur-3xl opacity-20 rounded-full"></div>
            <Logo className="w-24 h-24 mx-auto relative shadow-2xl rounded-3xl" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white tracking-tight">Split<span className="text-sky-400">Ease</span></h1>
            <p className="text-slate-400 text-sm">Personalize your profile to start splitting.</p>
          </div>

          <form onSubmit={handleOnboarding} className="space-y-6 bg-slate-800/50 p-8 rounded-3xl border border-slate-700 backdrop-blur-sm">
            <div className="flex justify-center gap-3 mb-4">
              {AVATARS.map(avatar => (
                <button
                  key={avatar}
                  type="button"
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`w-12 h-12 rounded-full border-2 transition-all ${selectedAvatar === avatar ? 'border-sky-500 scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'}`}
                >
                  <img src={avatar} alt="Avatar" className="w-full h-full rounded-full" />
                </button>
              ))}
            </div>
            
            <input
              autoFocus
              type="text"
              value={onboardingName}
              onChange={(e) => setOnboardingName(e.target.value)}
              placeholder="Your name or nickname"
              className="w-full bg-slate-900 border border-slate-700 text-white p-4 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 transition-all text-center font-bold"
            />
            
            <button
              type="submit"
              disabled={!onboardingName.trim()}
              className="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-black p-4 rounded-xl shadow-lg transition-all active:scale-95"
            >
              Start Splitting
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans p-4 sm:p-6 lg:p-8 pb-24">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-2 border ${
            toast.type === 'success' 
            ? 'bg-white dark:bg-slate-800 text-sky-500 border-sky-100 dark:border-sky-900/30' 
            : 'bg-red-500 text-white border-red-400'
          }`}>
            {toast.type === 'success' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {toast.message}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left flex items-center gap-4">
            <Logo className="w-12 h-12 rounded-xl shadow-lg" />
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-none">Split<span className="text-sky-500">Ease</span></h1>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${aiStatus === 'ok' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-500'}`}>
                  {aiStatus === 'ok' ? 'AI Ready!' : 'AI Loading...'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-1.5 pr-4 rounded-full shadow-sm border border-slate-100 dark:border-slate-700">
              <img src={currentUser.picture} className="w-8 h-8 rounded-full border-2 border-sky-500 bg-slate-100" alt="Profile" />
              <span className="text-sm font-bold truncate max-w-[100px]">{currentUser.name}</span>
              <button onClick={logout} className="text-slate-400 hover:text-red-500 transition-colors" title="Logout">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
            <button onClick={handleShareGroup} className="p-2.5 bg-sky-500 text-white rounded-full hover:bg-sky-600 shadow-lg transition-transform active:scale-90" title="Share Group">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
            </button>
          </div>
        </header>

        <main className="space-y-8">
          <UserManagement 
            users={users} 
            onAddUser={(name) => setUsers(prev => [...prev, { id: `user-${Date.now()}`, name }])} 
            onDeleteUser={(id) => setUsers(prev => prev.filter(u => u.id !== id))} 
            hasExpenses={expenses.length > 0} 
          />
          {users.length >= 2 && (
            <ExpenseForm 
              users={users} 
              onAddExpense={(exp) => setExpenses(prev => [{...exp, id: `exp-${Date.now()}`}, ...prev])} 
              aiStatus={aiStatus} 
              aiDiagnostic={null} 
            />
          )}
          <Summary users={users} expenses={expenses} />
          <ExpenseList expenses={expenses} users={users} onDeleteExpense={(id) => setExpenses(prev => prev.filter(e => e.id !== id))} />
        </main>
        
        <footer className="text-center text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest pt-8">
          SplitEase v2.6 • Global Sharing Fix
        </footer>
      </div>
    </div>
  );
};

export default App;
