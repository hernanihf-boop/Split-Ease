
import React, { useState, useEffect, useCallback } from 'react';
import { User, Expense } from './types.ts';
import UserManagement from './components/UserManagement.tsx';
import ExpenseForm from './components/ExpenseForm.tsx';
import ExpenseList from './components/ExpenseList.tsx';
import Summary from './components/Summary.tsx';
import { Logo, SparklesIcon } from './components/icons.tsx';
import { GoogleGenAI } from "@google/genai";

// Fix: Declaring google on window to resolve TypeScript errors
declare global {
  interface Window {
    google: any;
  }
}

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
  
  const [isStandalone, setIsStandalone] = useState(false);
  const [aiStatus, setAiStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [aiDiagnostic, setAiDiagnostic] = useState<string | null>(null);

  // --- GOOGLE AUTH LOGIC ---
  const handleCredentialResponse = useCallback((response: any) => {
    try {
      // Decoding JWT (Google ID Token) without a library for lightness
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      const profile = JSON.parse(jsonPayload);

      const user: User = {
        id: `google-${profile.sub}`,
        name: profile.name,
        picture: profile.picture,
        email: profile.email
      };

      setCurrentUser(user);
      localStorage.setItem('split-ease-auth', JSON.stringify(user));

      // Auto-add current user to the group if not exists
      setUsers(prev => {
        if (prev.find(u => u.email === user.email)) return prev;
        return [...prev, user];
      });
    } catch (e) {
      console.error("Auth error:", e);
    }
  }, []);

  useEffect(() => {
    // Correctly using window.google with global declaration
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: "680783584893-j5nqu7mks3f36m9f425s0v6q60r8fub9.apps.googleusercontent.com", // Demo ID, should be env var in real prod
        callback: handleCredentialResponse
      });
      if (!currentUser) {
        window.google.accounts.id.renderButton(
          document.getElementById("googleBtn"),
          { theme: "outline", size: "large", shape: "pill", width: 280 }
        );
      }
    }
  }, [currentUser, handleCredentialResponse]);

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('split-ease-auth');
    window.location.reload();
  };

  // --- END AUTH LOGIC ---

  const checkAI = useCallback(async () => {
    setAiStatus('checking');
    try {
      const apiKey = process.env.API_KEY || '';
      if (!apiKey || apiKey.length < 5) throw new Error("API KEY Missing");
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'ping',
        config: { maxOutputTokens: 2, thinkingConfig: { thinkingBudget: 0 } }
      });
      if (response.text) setAiStatus('ok');
    } catch (err: any) {
      setAiStatus('error');
      setAiDiagnostic(err.message);
    }
  }, []);

  useEffect(() => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(isPWA);
    checkAI();

    // Import logic
    const params = new URLSearchParams(window.location.search);
    const sharedData = params.get('import');
    if (sharedData) {
      try {
        const decodedString = decodeURIComponent(atob(sharedData).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        const decoded = JSON.parse(decodedString);
        if (confirm(`Import group "${decoded.name || 'Shared Group'}"?`)) {
          setUsers(decoded.users || []);
          setExpenses(decoded.expenses || []);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (e) { console.error("Import error", e); }
    }
  }, [checkAI]);

  useEffect(() => { localStorage.setItem('split-ease-users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('split-ease-expenses', JSON.stringify(expenses)); }, [expenses]);
  
  const handleAddUser = useCallback((name: string) => {
    const newUser: User = { id: `user-${Date.now()}`, name };
    setUsers(prev => [...prev, newUser]);
  }, []);

  const handleDeleteUser = useCallback((id: string) => {
    if (expenses.length > 0) { alert("Delete expenses first."); return; }
    setUsers(prev => prev.filter(user => user.id !== id));
  }, [expenses.length]);

  const handleAddExpense = useCallback((expenseData: Omit<Expense, 'id'>) => {
    const newExpense: Expense = { ...expenseData, id: `exp-${Date.now()}` };
    setExpenses(prev => [newExpense, ...prev]);
  }, []);

  const handleDeleteExpense = useCallback((id: string) => {
    setExpenses(prev => prev.filter(expense => expense.id !== id));
  }, []);

  const handleShareGroup = () => {
    try {
      const data = { name: "SplitEase Group", users, expenses };
      const encoded = btoa(encodeURIComponent(JSON.stringify(data)).replace(/%([0-9A-F]{2})/g, (m, p1) => String.fromCharCode(parseInt(p1, 16))));
      const shareUrl = `${window.location.origin}${window.location.pathname}?import=${encoded}`;
      navigator.clipboard.writeText(shareUrl).then(() => alert('Link copied!'));
    } catch (e) { alert("Error generating link."); }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-sky-500 blur-3xl opacity-20 rounded-full"></div>
          <Logo className="w-32 h-32 relative shadow-2xl rounded-3xl" />
        </div>
        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Split<span className="text-sky-400">Ease</span></h1>
        <p className="text-slate-400 max-w-xs mb-10 leading-relaxed">The smarter way to split expenses with friends using AI.</p>
        
        <div id="googleBtn" className="min-h-[50px]"></div>
        
        <p className="mt-8 text-slate-500 text-xs">By signing in, you agree to easily split the bill.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans p-4 sm:p-6 lg:p-8 pb-24">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left flex items-center gap-4">
            <Logo className="w-12 h-12 rounded-xl shadow-lg" />
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Split<span className="text-sky-500">Ease</span></h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">AI Ready!</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-1.5 pr-4 rounded-full shadow-sm border border-slate-100 dark:border-slate-700">
              <img src={currentUser.picture} className="w-8 h-8 rounded-full border-2 border-sky-500" alt="Profile" />
              <span className="text-sm font-bold truncate max-w-[100px]">{currentUser.name.split(' ')[0]}</span>
              <button onClick={logout} className="text-slate-400 hover:text-red-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
            <button onClick={handleShareGroup} className="p-2.5 bg-sky-500 text-white rounded-full hover:bg-sky-600 shadow-lg transition-transform active:scale-90">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
            </button>
          </div>
        </header>

        <main className="space-y-8">
          <UserManagement users={users} onAddUser={handleAddUser} onDeleteUser={handleDeleteUser} hasExpenses={expenses.length > 0} />
          {users.length >= 2 && <ExpenseForm users={users} onAddExpense={handleAddExpense} aiStatus={aiStatus} aiDiagnostic={aiDiagnostic} />}
          <Summary users={users} expenses={expenses} />
          <ExpenseList expenses={expenses} users={users} onDeleteExpense={handleDeleteExpense} />
        </main>
        
        <footer className="text-center text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest pt-8">
          SplitEase v2.0 • Pro Identity
        </footer>
      </div>
    </div>
  );
};

export default App;