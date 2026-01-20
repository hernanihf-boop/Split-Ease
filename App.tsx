
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Expense } from './types.ts';
import UserManagement from './components/UserManagement.tsx';
import ExpenseForm from './components/ExpenseForm.tsx';
import ExpenseList from './components/ExpenseList.tsx';
import Summary from './components/Summary.tsx';
import { Logo } from './components/icons.tsx';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('split-ease-auth');
    return saved ? JSON.parse(saved) : null;
  });

  const [users, setUsers] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [aiStatus, setAiStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [onboardingName, setOnboardingName] = useState('');
  
  // Generar avatares con expresiones aleatorias compatibles con v7
  const randomAvatars = useMemo(() => {
    const baseSeeds = ['Felix', 'Aneka', 'James', 'Aria', 'Jack', 'Luna', 'Leo', 'Zoe'];
    const moods = [
      { name: 'happy', params: 'mouth=smile&eyes=happy' },
      { name: 'confident', params: 'mouth=default&eyes=default&eyebrows=raisedExcited' },
      { name: 'joyful', params: 'mouth=laughing&eyes=wink' },
      { name: 'bored', params: 'mouth=serious&eyes=closed' },
      { name: 'distracted', params: 'mouth=tongue&eyes=squint' }
    ];

    // Seleccionar 5 semillas únicas y asignarles un mood aleatorio
    return [...baseSeeds]
      .sort(() => 0.5 - Math.random())
      .slice(0, 5)
      .map(seed => {
        const randomMood = moods[Math.floor(Math.random() * moods.length)];
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&${randomMood.params}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
      });
  }, []);

  const [selectedAvatar, setSelectedAvatar] = useState(randomAvatars[0]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const syncWithBackend = useCallback(async (id: string, currentUsers: User[], currentExpenses: Expense[]) => {
    setIsSyncing(true);
    try {
      localStorage.setItem(`group_${id}`, JSON.stringify({ users: currentUsers, expenses: currentExpenses }));
      await new Promise(r => setTimeout(r, 800));
    } catch (e) {
      showToast("Sync Error", "error");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const loadGroupFromBackend = useCallback(async (id: string) => {
    setIsSyncing(true);
    try {
      const data = localStorage.getItem(`group_${id}`);
      if (data) {
        const parsed = JSON.parse(data);
        setUsers(parsed.users || []);
        setExpenses(parsed.expenses || []);
        showToast("Connected to group!");
      } else {
        showToast("New shared group initialized");
      }
    } catch (e) {
      showToast("Error loading group", "error");
    } finally {
      setIsSyncing(false);
    }
  }, []);

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

  useEffect(() => {
    checkAI();
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', ''));
    const gid = params.get('group');
    
    if (gid) {
      setGroupId(gid);
      loadGroupFromBackend(gid);
    } else {
      const lastGid = localStorage.getItem('split-ease-last-group') || `g-${Date.now()}`;
      setGroupId(lastGid);
      localStorage.setItem('split-ease-last-group', lastGid);
      loadGroupFromBackend(lastGid);
    }
  }, [checkAI, loadGroupFromBackend]);

  useEffect(() => {
    if (groupId && users.length > 0) {
      syncWithBackend(groupId, users, expenses);
    }
  }, [users, expenses, groupId, syncWithBackend]);

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

  const handleShareGroup = () => {
    try {
      const baseUrl = `https://${window.location.host}${window.location.pathname}`;
      const shareUrl = `${baseUrl}#group=${groupId}`;
      
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast('Invite link copied!');
      }).catch(err => {
        prompt('Copy this invite link:', shareUrl);
      });
    } catch (e) {
      showToast('Error generating link', 'error');
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
          <Logo className="w-24 h-24 mx-auto relative shadow-2xl rounded-3xl" />
          <h1 className="text-4xl font-black text-white tracking-tight">Split<span className="text-sky-400">Ease</span></h1>
          <p className="text-slate-400 -mt-4 font-medium italic">Your group expenses, perfectly balanced.</p>
          
          <form onSubmit={handleOnboarding} className="space-y-6 bg-slate-800/50 p-8 rounded-3xl border border-slate-700 backdrop-blur-sm shadow-xl">
            <div className="space-y-4">
               <label className="text-xs font-bold text-sky-400 uppercase tracking-widest block">Choose your character mood</label>
               <div className="flex justify-center gap-4 mb-4 flex-wrap">
                {randomAvatars.map((avatar, idx) => (
                  <button 
                    key={`${avatar}-${idx}`} 
                    type="button" 
                    onClick={() => setSelectedAvatar(avatar)} 
                    className={`w-14 h-14 rounded-full border-4 transition-all duration-300 transform ${selectedAvatar === avatar ? 'border-sky-500 scale-125 shadow-lg shadow-sky-500/20 z-10' : 'border-transparent opacity-40 hover:opacity-80'}`}
                  >
                    <img 
                      src={avatar} 
                      alt="Avatar" 
                      className="w-full h-full rounded-full bg-slate-700"
                      onError={(e) => {
                        // Fallback si la URL aleatoria falla
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=fallback-${idx}&mouth=smile`;
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <input 
                autoFocus 
                type="text" 
                value={onboardingName} 
                onChange={(e) => setOnboardingName(e.target.value)} 
                placeholder="What is your name?" 
                className="w-full bg-slate-900 border border-slate-700 text-white p-4 rounded-xl text-center font-bold focus:ring-2 focus:ring-sky-500 outline-none transition-all placeholder:text-slate-600" 
              />
            </div>
            
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-4 sm:p-8 pb-24">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="px-6 py-3 bg-white dark:bg-slate-800 text-sky-500 rounded-2xl shadow-2xl font-bold border border-sky-100 dark:border-sky-900/30">
            {toast.message}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <Logo className="w-12 h-12" />
            <div>
              <h1 className="text-2xl font-black">Split<span className="text-sky-500">Ease</span></h1>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                  {isSyncing ? 'Syncing...' : 'Connected'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-white dark:bg-slate-800 p-1.5 pr-4 rounded-full shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-3">
              <img 
                src={currentUser.picture} 
                className="w-8 h-8 rounded-full border-2 border-sky-500" 
                alt="Me" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.name}&mouth=smile`;
                }}
              />
              <span className="text-sm font-bold">{currentUser.name}</span>
            </div>
            <button onClick={handleShareGroup} className="p-2.5 bg-sky-500 text-white rounded-full hover:bg-sky-600 shadow-lg" title="Invite Friends">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" /></svg>
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
      </div>
    </div>
  );
};

export default App;
