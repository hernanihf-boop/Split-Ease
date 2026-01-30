
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Expense, Group } from './types.ts';
import UserManagement from './components/UserManagement.tsx';
import ExpenseForm from './components/ExpenseForm.tsx';
import ExpenseList from './components/ExpenseList.tsx';
import Summary from './components/Summary.tsx';
import AuthScreen from './components/AuthScreen.tsx';
import GroupDashboard from './components/GroupDashboard.tsx';
import { Logo } from './components/icons.tsx';

const API_BASE_URL = 'https://split-ease-back.onrender.com/api';

export const getUserAvatar = (user?: User | { name: string; picture?: string; avatar_url?: string }) => {
  if (!user) return `https://api.dicebear.com/7.x/avataaars/svg?seed=unknown`;
  const photo = user.picture || user.avatar_url;
  if (photo) return photo;
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}&backgroundColor=b6e3f4`;
};

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('split-ease-token'));
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('split-ease-user');
    return saved ? JSON.parse(saved) : null;
  });

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const logCurl = (url: string, options: RequestInit) => {
    const method = options.method || 'GET';
    const headers = options.headers as Record<string, string> || {};
    let curl = `curl -X ${method} "${url}"`;
    
    Object.entries(headers).forEach(([key, value]) => {
      curl += ` -H "${key}: ${value}"`;
    });
    
    if (options.body) {
      curl += ` -d '${options.body}'`;
    }

    console.warn("🚀 PEGANDO AL BACKEND");
    console.log("%c" + curl, "color: #0ea5e9; font-family: monospace; font-weight: bold; padding: 6px; background: #0f172a; border-radius: 4px; display: block; margin: 4px 0;");
  };

  const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
    };

    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_BASE_URL}${cleanEndpoint}`;
    
    logCurl(url, { ...options, headers });

    try {
      const response = await fetch(url, { ...options, headers });
      
      if (response.status === 401) { 
        handleLogout(); 
        throw new Error("Session expired"); 
      }

      if (!response.ok) {
        let errorMsg = `Error: ${response.status}`;
        try { 
          const errData = await response.json(); 
          errorMsg = errData.error || errData.message || errorMsg; 
        } catch (e) { }
        throw new Error(errorMsg);
      }

      if (response.status === 204) return null;
      
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      }
      return null;
    } catch (err: any) {
      console.error(`❌ Falló la pegada HTTP:`, err.message);
      throw err;
    }
  };

  const loadUserGroups = useCallback(async () => {
    if (!token) return;
    setIsSyncing(true);
    try {
      const data = await apiFetch('/groups');
      setGroups(data || []);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally { setIsSyncing(false); }
  }, [token]);

  // DERIVACIÓN DE DATOS: Usamos lo que ya bajamos en loadUserGroups
  const currentGroup = useMemo(() => {
    return groups.find(g => (g._id || g.id) === groupId);
  }, [groups, groupId]);

  const users = useMemo(() => currentGroup?.users || [], [currentGroup]);
  const expenses = useMemo(() => currentGroup?.expenses || [], [currentGroup]);

  const handleDeleteGroup = useCallback(async (id: string) => {
    if (!token || !id) return;
    if (!confirm("¿Seguro que querés borrar este grupo?")) return;
    
    setIsSyncing(true);
    try {
      await apiFetch(`/groups/${id}`, { method: 'DELETE' });
      setGroups(prev => prev.filter(g => (g._id || g.id) !== id));
      if (groupId === id) {
        setGroupId(null);
        window.location.hash = '';
      }
      showToast("Grupo eliminado");
    } catch (err: any) { 
      showToast(err.message, "error"); 
    }
    finally { setIsSyncing(false); }
  }, [token, groupId]);

  const handleSelectGroup = (id: string) => {
    if (!id) return;
    window.location.hash = `group=${id}`;
  };

  const handleGoBack = () => {
    window.location.hash = '';
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    setGroupId(null);
    setGroups([]);
    localStorage.removeItem('split-ease-token');
    localStorage.removeItem('split-ease-user');
    window.location.hash = ''; 
  };

  const handleAuthSuccess = (newToken: string, user: User) => {
    setToken(newToken);
    setCurrentUser(user);
    localStorage.setItem('split-ease-token', newToken);
    localStorage.setItem('split-ease-user', JSON.stringify(user));
    // Después del login, nos aseguramos de limpiar el hash para ir al Dashboard
    window.location.hash = '';
  };

  const handleAddUser = async (name: string) => {
    if (!groupId || !token) return;
    setIsSyncing(true);
    try {
      const picture = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4`;
      const newUser = await apiFetch(`/groups/${groupId}/users`, {
        method: 'POST',
        body: JSON.stringify({ name, picture })
      });
      setGroups(prev => prev.map(g => {
        if ((g._id || g.id) === groupId) {
          return { ...g, users: [...(g.users || []), newUser] };
        }
        return g;
      }));
      showToast(`${name} added`);
    } catch (err: any) { showToast(err.message, "error"); }
    finally { setIsSyncing(false); }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!groupId || !token) return;
    setIsSyncing(true);
    try {
      await apiFetch(`/groups/${groupId}/users/${userId}`, { method: 'DELETE' });
      setGroups(prev => prev.map(g => {
        if ((g._id || g.id) === groupId) {
          return { ...g, users: g.users.filter(u => (u.id || u._id) !== userId) };
        }
        return g;
      }));
      showToast("Member removed");
    } catch (err: any) { showToast(err.message, "error"); }
    finally { setIsSyncing(false); }
  };

  const handleAddExpense = async (expenseData: Omit<Expense, 'id'>) => {
    if (!groupId || !token) return;
    setIsSyncing(true);
    try {
      const newExpense = await apiFetch(`/groups/${groupId}/expenses`, {
        method: 'POST',
        body: JSON.stringify(expenseData)
      });
      setGroups(prev => prev.map(g => {
        if ((g._id || g.id) === groupId) {
          return { ...g, expenses: [newExpense, ...(g.expenses || [])] };
        }
        return g;
      }));
      showToast("Expense saved");
    } catch (err: any) { showToast(err.message, "error"); }
    finally { setIsSyncing(false); }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!groupId || !token) return;
    setIsSyncing(true);
    try {
      await apiFetch(`/groups/${groupId}/expenses/${expenseId}`, { method: 'DELETE' });
      setGroups(prev => prev.map(g => {
        if ((g._id || g.id) === groupId) {
          return { ...g, expenses: g.expenses.filter(e => (e._id || e.id) !== expenseId) };
        }
        return g;
      }));
      showToast("Expense deleted");
    } catch (err: any) { showToast(err.message, "error"); }
    finally { setIsSyncing(false); }
  };

  const handleCreateGroup = async (name: string, emoji?: string) => {
    if (!token) return;
    setIsSyncing(true);
    try {
      const data = await apiFetch('/groups', { 
        method: 'POST',
        body: JSON.stringify({ name, emoji }) 
      });
      setGroups(prev => [data, ...prev]);
      handleSelectGroup(data._id || data.id);
      showToast(`Group "${name}" created`);
    } catch (err: any) { showToast(err.message, "error"); }
    finally { setIsSyncing(false); }
  };

  // ÚNICO MONITOR DE RUTA Y CARGA INICIAL
  useEffect(() => {
    if (!token) return;
    
    const syncRoute = () => {
      const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
      const gid = hashParams.get('group');
      
      // Si el gid es inválido o no existe, nos aseguramos de estar en el Dashboard
      if (gid && gid !== 'null' && gid !== 'undefined' && gid !== '2') {
        setGroupId(gid);
      } else {
        setGroupId(null);
        if (window.location.hash.includes('group=')) {
          window.location.hash = ''; // Limpiamos hash sucio
        }
      }
    };

    // Solo traemos todos los grupos, nada más.
    loadUserGroups();

    syncRoute();
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, [token]); // Solo re-ejecuta si cambia el token (login/logout)

  if (!token || !currentUser) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} apiBaseUrl="https://split-ease-back.onrender.com" showToast={showToast} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-4 sm:p-8 pb-24">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className={`px-6 py-3 rounded-2xl shadow-2xl font-bold border ${toast.type === 'error' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-white dark:bg-slate-800 text-sky-500 border-sky-100 dark:border-sky-900/30'}`}>
            {toast.message}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <button onClick={handleGoBack} className="hover:scale-110 transition-transform">
              <Logo className="w-12 h-12" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black">Split<span className="text-sky-500">Easy</span></h1>
                {groupId && <span className="text-slate-300 dark:text-slate-700 font-black">/</span>}
                {groupId && (
                  <div className="flex items-center gap-2">
                    {currentGroup?.emoji && <span className="text-xl">{currentGroup.emoji}</span>}
                    <span className="text-lg font-bold text-slate-500 truncate max-w-[150px]">{currentGroup?.name || 'Loading...'}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                  {isSyncing ? 'Syncing...' : 'Cloud Sync'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white dark:bg-slate-800 p-1.5 pr-4 rounded-full shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-3">
              <img src={getUserAvatar(currentUser)} className="w-8 h-8 rounded-full border-2 border-sky-500 bg-slate-100" alt="Me" />
              <span className="text-sm font-bold truncate max-w-[100px]">{currentUser.name}</span>
            </div>
            <button onClick={handleLogout} className="p-2.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" /></svg>
            </button>
          </div>
        </header>

        {groupId ? (
          <main className="space-y-8">
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
              <button onClick={handleGoBack} className="text-sm font-bold text-sky-500 flex items-center gap-1 hover:underline">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                Back to my groups
              </button>
            </div>
            <UserManagement users={users} onAddUser={handleAddUser} onDeleteUser={handleDeleteUser} hasExpenses={expenses.length > 0} />
            {users.length >= 2 && <ExpenseForm users={users} onAddExpense={handleAddExpense} aiStatus="ok" aiDiagnostic={null} />}
            <Summary users={users} expenses={expenses} />
            <ExpenseList expenses={expenses} users={users} onDeleteExpense={handleDeleteExpense} />
          </main>
        ) : (
          <GroupDashboard 
            groups={groups} 
            onCreateGroup={handleCreateGroup} 
            onDeleteGroup={handleDeleteGroup}
            onSelectGroup={handleSelectGroup} 
            isSyncing={isSyncing} 
            currentUserId={currentUser._id || currentUser.id}
          />
        )}
      </div>
    </div>
  );
};

export default App;
