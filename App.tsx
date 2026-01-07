
import React, { useState, useEffect, useCallback } from 'react';
import { User, Expense } from './types.ts';
import UserManagement from './components/UserManagement.tsx';
import ExpenseForm from './components/ExpenseForm.tsx';
import ExpenseList from './components/ExpenseList.tsx';
import Summary from './components/Summary.tsx';
import { Logo, SparklesIcon } from './components/icons.tsx';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>(() => {
    const savedUsers = localStorage.getItem('split-ease-users');
    return savedUsers ? JSON.parse(savedUsers) : [];
  });
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const savedExpenses = localStorage.getItem('split-ease-expenses');
    return savedExpenses ? JSON.parse(savedExpenses) : [];
  });
  const [isStandalone, setIsStandalone] = useState(false);
  
  // AI Health Check States
  const [aiStatus, setAiStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [aiDiagnostic, setAiDiagnostic] = useState<string | null>(null);

  const checkAI = useCallback(async () => {
    setAiStatus('checking');
    setAiDiagnostic(null);
    
    let apiKey = '';
    try {
      apiKey = process.env.API_KEY || '';
    } catch (e) {
      console.warn("process.env is not defined.");
    }
    
    if (!apiKey || apiKey === "YOUR_API_KEY" || apiKey.trim() === "" || apiKey.length < 5) {
      setAiStatus('error');
      setAiDiagnostic("API_KEY not detected. Please verify environment settings and perform a manual redeploy.");
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'ping',
        config: { 
            maxOutputTokens: 5,
            thinkingConfig: { thinkingBudget: 0 }
        }
      });
      
      if (response && response.text) {
        setAiStatus('ok');
      } else {
        throw new Error("Empty response from Gemini.");
      }
    } catch (err: any) {
      console.error("AI Startup Check Failed:", err);
      setAiStatus('error');
      
      let message = err.message || "Connection error.";
      if (message.includes("403")) message = "Invalid API Key (403). Ensure the Gemini API is enabled for this key.";
      if (message.includes("429")) message = "Quota limit exceeded (429).";
      if (message.includes("fetch")) message = "Network/CORS error (Is a VPN active?).";
      
      setAiDiagnostic(message);
    }
  }, []);

  useEffect(() => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(isPWA);

    checkAI();

    // Resilient import logic for shared groups
    const handleImport = () => {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const sharedData = params.get('import') || hashParams.get('import');
      
      if (sharedData) {
        try {
          // Robust base64 decoding for UTF-8
          const decodedString = decodeURIComponent(atob(sharedData).split('').map(function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          
          const decoded = JSON.parse(decodedString);
          if (confirm(`Do you want to import the group "${decoded.name || 'Shared Group'}"?`)) {
            setUsers(decoded.users || []);
            setExpenses(decoded.expenses || []);
            // Clear URL to prevent multiple imports on refresh
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (e) {
          console.error("Error importing shared data:", e);
          alert("The shared link appears to be invalid or corrupted.");
        }
      }
    };

    handleImport();
  }, [checkAI]);

  useEffect(() => {
    localStorage.setItem('split-ease-users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('split-ease-expenses', JSON.stringify(expenses));
  }, [expenses]);
  
  const handleAddUser = useCallback((name: string) => {
    const newUser: User = { id: `user-${Date.now()}`, name };
    setUsers(prev => [...prev, newUser]);
  }, []);

  const handleDeleteUser = useCallback((id: string) => {
    if (expenses.length > 0) {
        alert("Users cannot be deleted while expenses exist.");
        return;
    }
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
      const jsonString = JSON.stringify(data);
      
      // UTF-8 safe base64 encoding
      const encoded = btoa(encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g, function(match, p1) {
          return String.fromCharCode(parseInt(p1, 16));
      }));
      
      // We use a relative path for the URL to avoid domain mismatch issues in preview environments
      const baseUrl = window.location.origin + window.location.pathname;
      const shareUrl = `${baseUrl}?import=${encoded}`;

      if (navigator.share && /mobile|android|iphone/i.test(navigator.userAgent)) {
        navigator.share({ 
          title: 'SplitEase Group', 
          text: 'Check our shared expenses on SplitEase',
          url: shareUrl 
        }).catch(err => {
            console.warn("Native share failed, using clipboard:", err);
            copyToClipboard(shareUrl);
        });
      } else {
        copyToClipboard(shareUrl);
      }
    } catch (e) {
      console.error("Error generating share link:", e);
      alert("Failed to generate share link.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Link copied! Send it to your friends to sync the group.');
    }).catch(err => {
      console.error('Copy failed: ', err);
      alert('Error copying link to clipboard.');
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {!isStandalone && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-xl text-xs sm:text-sm text-amber-800 dark:text-amber-300 flex items-center justify-between">
            <span>✨ Install this app for a better offline experience.</span>
            <button onClick={() => setIsStandalone(true)} className="ml-2 font-bold opacity-70">✕</button>
          </div>
        )}

        <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left flex items-center gap-4">
            <div className="relative">
               <div className="absolute inset-0 bg-sky-500 blur-lg opacity-20 rounded-2xl"></div>
               <Logo className="relative w-16 h-16 rounded-2xl shadow-xl border-2 border-white dark:border-slate-800" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
                Split<span className="text-sky-500">Ease</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 uppercase tracking-wider font-semibold">AI Expense Splitter</p>
            </div>
          </div>
          
          {(users.length > 0 || expenses.length > 0) && (
            <button onClick={handleShareGroup} className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 text-white font-bold rounded-full hover:bg-sky-600 shadow-lg shadow-sky-500/20 transition-all active:scale-95 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
              </svg>
              Share Group
            </button>
          )}
        </header>

        <main className="space-y-8">
          <UserManagement users={users} onAddUser={handleAddUser} onDeleteUser={handleDeleteUser} hasExpenses={expenses.length > 0} />
          {users.length >= 2 && (
            <ExpenseForm 
              users={users} 
              onAddExpense={handleAddExpense} 
              aiStatus={aiStatus}
              aiDiagnostic={aiDiagnostic}
            />
          )}
          <Summary users={users} expenses={expenses} />
          <ExpenseList expenses={expenses} users={users} onDeleteExpense={handleDeleteExpense} />
        </main>
        
        <footer className="flex flex-col items-center justify-center gap-3 pt-12 pb-8">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
              {aiStatus === 'checking' && (
                <span className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-200/50 dark:bg-slate-800/50 px-3 py-1 rounded-full animate-pulse border border-slate-200 dark:border-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  Checking AI...
                </span>
              )}
              {aiStatus === 'ok' && (
                <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full font-bold border border-emerald-100 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  AI Ready!
                </span>
              )}
              {aiStatus === 'error' && (
                <div className="flex flex-col items-center gap-2">
                  <span className="flex items-center gap-1.5 text-[10px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full font-bold border border-red-100 dark:border-red-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    AI Offline
                  </span>
                  <button onClick={checkAI} className="text-[10px] text-sky-500 hover:text-sky-600 underline font-semibold transition-colors">
                      Retry connection
                  </button>
                </div>
              )}
            </div>
          </div>
          <p className="text-center text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest mt-2">
            SplitEase v1.12 • AI Optimized Experience
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
