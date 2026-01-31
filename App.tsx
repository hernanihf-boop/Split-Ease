
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Expense, Group } from './types.ts';
import AuthScreen from './components/AuthScreen.tsx';
import GroupDashboard from './components/GroupDashboard.tsx';
import GroupDetails from './components/GroupDetails.tsx';
import { Logo } from './components/icons.tsx';
import { getUserAvatar } from './utils.ts';

const API_BASE_URL = 'https://split-ease-back.onrender.com/api';

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('split-ease-token'));
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('split-ease-user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(() => localStorage.getItem('split-ease-invite-code'));

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const apiFetch = async (endpoint: string, options: RequestInit = {}, overrideToken?: string) => {
    const currentToken = overrideToken || token;
    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
    };

    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }
    
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_BASE_URL}${cleanEndpoint}`;
    
    console.log(`📡 ${options.method || 'GET'} ${url}`);

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
      if (contentType && contentType.startsWith("image/")) {
        return await response.blob();
      }
      return null;
    } catch (err: any) {
      console.error(`❌ HTTP Error:`, err.message);
      throw err;
    }
  };

  const loadUserGroups = useCallback(async () => {
    if (!token) return;
    setIsSyncing(true);
    try {
      const data = await apiFetch('/groups');
      if (Array.isArray(data)) {
        const mappedGroups = data.map(group => ({
            ...group,
            id: String(group.id),
            _id: group._id ? String(group._id) : undefined,
            users: (group.members || group.users || []).map((user: any) => ({
                ...user,
                id: String(user.id)
            })),
            expenses: (group.expenses || []).map((exp: any) => ({
                ...exp,
                id: String(exp.id)
            }))
        }));
        setGroups(mappedGroups);
      } else {
        setGroups([]);
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally { setIsSyncing(false); }
  }, [token, showToast]);

  const loadGroupData = useCallback(async (id: string) => {
    if (!token || !id || id === 'null' || id === 'undefined') return;
    setIsSyncing(true);
    try {
       const [data, settlementsResponse, expensesResponse] = await Promise.all([
        apiFetch(`/groups/${id}`),
        apiFetch(`/groups/${id}/settlements`),
        apiFetch(`/groups/${id}/expenses`),
      ]);
      
      const allUserIdsInGroup = (data.members || []).map((user: any) => String(user.id));
      
      const mappedGroup: Group = {
        ...data,
        id: String(data.id),
        _id: data._id ? String(data._id) : undefined,
        users: (data.members || []).map((user: any) => ({
            ...user,
            id: String(user.id),
            _id: user._id ? String(user._id) : undefined,
        })),
        expenses: (expensesResponse || []).map((exp: any) => ({
            description: exp.description,
            amount: exp.amount,
            id: String(exp.id),
            paidById: String(exp.payer_id),
            payer_name: exp.payer_name,
            participantIds: (exp.participant_ids || allUserIdsInGroup), 
            transactionDate: exp.date || new Date().toISOString(),
            uploadDate: exp.date || new Date().toISOString(),
            receiptImage: exp.image_path ? `${API_BASE_URL.replace('/api', '')}${exp.image_path}` : undefined,
        })),
        settlements: settlementsResponse?.settlements || [],
        total_spent: data.total_spent,
      };

      setGroups(prev => {
        const exists = prev.some(g => String(g._id || g.id) === id);
        if (exists) {
            return prev.map(g => (String(g._id || g.id) === id ? mappedGroup : g));
        }
        return [...prev, mappedGroup];
      });
      setGroupId(id);
    } catch (err: any) {
      console.error("Error loading group:", id, err.message);
      setGroupId(null);
      window.location.hash = ''; 
    } finally { setIsSyncing(false); }
  }, [token, showToast]);
  
  const handleJoinGroup = async (inviteCode: string, newToken: string) => {
    if (!newToken) return null;
    setIsSyncing(true);
    try {
      const result = await apiFetch('/groups/join', {
        method: 'POST',
        body: JSON.stringify({ invite_code: inviteCode }),
      }, newToken);
      localStorage.removeItem('split-ease-invite-code');
      setPendingInviteCode(null);
      showToast(`Successfully joined group: ${result.name}!`);
      return result._id || result.id;
    } catch (err: any) {
      showToast(err.message, 'error');
      localStorage.removeItem('split-ease-invite-code');
      setPendingInviteCode(null);
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  const currentGroup = useMemo(() => {
    if (!groupId) return undefined;
    return groups.find(g => String(g._id || g.id) === groupId);
  }, [groups, groupId]);

  const handleDeleteGroup = useCallback(async (id: string) => {
    if (!token || !id) return;
    if (!confirm("Delete this group permanently?")) return;
    setIsSyncing(true);
    try {
      await apiFetch(`/groups/${id}`, { method: 'DELETE' });
      setGroups(prev => prev.filter(g => (g._id || g.id) !== id));
      if (groupId === id) {
        setGroupId(null);
        window.location.hash = '';
      }
      showToast("Group deleted");
    } catch (err: any) { showToast(err.message, "error"); }
    finally { setIsSyncing(false); }
  }, [token, groupId, showToast]);

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
    localStorage.removeItem('split-ease-invite-code');
    window.location.hash = ''; 
  };
  
  const handleAuthSuccess = async (newToken: string, user: User) => {
    localStorage.setItem('split-ease-token', newToken);
    localStorage.setItem('split-ease-user', JSON.stringify(user));
    setToken(newToken);
    setCurrentUser(user);

    const inviteCode = localStorage.getItem('split-ease-invite-code');
    if (inviteCode) {
      const joinedGroupId = await handleJoinGroup(inviteCode, newToken);
      if (joinedGroupId) {
        handleSelectGroup(joinedGroupId);
      } else {
        window.location.hash = '';
      }
    } else {
      window.location.hash = '';
    }
  };

  const handleAddUser = async (email: string) => {
    if (!groupId || !token) return;
    setIsSyncing(true);
    try {
      await apiFetch(`/groups/${groupId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      loadGroupData(groupId);
      showToast(`Invitation sent to ${email}`);
    } catch (err: any) {
      showToast(err.message, "error");
    }
    finally { setIsSyncing(false); }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!groupId || !token) return;
    setIsSyncing(true);
    try {
      await apiFetch(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' });
      loadGroupData(groupId);
      showToast("Member removed");
    } catch (err: any) { showToast(err.message, "error"); }
    finally { setIsSyncing(false); }
  };

  const handleAddExpense = async (expenseData: Omit<Expense, 'id'>) => {
    if (!groupId || !token) return;
    setIsSyncing(true);
    try {
      const payload: any = {
        group_id: parseInt(groupId, 10),
        description: expenseData.description,
        amount: expenseData.amount,
        payer_id: parseInt(expenseData.paidById, 10),
        participant_ids: expenseData.participantIds.map(id => parseInt(id, 10)),
      };

      if (expenseData.transactionDate) {
        payload.date = expenseData.transactionDate;
      }

      if (expenseData.receiptImage) {
        payload.receipt_image_base64 = expenseData.receiptImage.split(',')[1];
      }
      
      await apiFetch(`/expenses`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      loadGroupData(groupId); 
      showToast("Expense saved");
    } catch (err: any) { showToast(err.message, "error"); }
    finally { setIsSyncing(false); }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!groupId || !token) return;
    setIsSyncing(true);
    try {
      await apiFetch(`/expenses/${expenseId}`, { method: 'DELETE' });
      loadGroupData(groupId);
      showToast("Expense deleted");
    } catch (err: any) { showToast(err.message, "error"); }
    finally { setIsSyncing(false); }
  };

  const handleDownloadReceipt = async (expenseId: string, expenseDescription: string) => {
    if (!token) return;
    setIsSyncing(true);
    try {
      const blob = await apiFetch(`/expenses/${expenseId}/image`, { method: 'GET' });
      if (blob instanceof Blob) {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const extension = blob.type.split('/')[1] || 'jpg';
        const filename = `receipt-${expenseDescription.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30)}.${extension}`;
        link.download = filename;
        
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        showToast("Receipt downloaded");
      } else {
        throw new Error("Could not download receipt. File not found or is not an image.");
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsSyncing(false);
    }
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

  useEffect(() => {
    const syncRoute = () => {
      const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
      const gid = hashParams.get('group');
      
      if (token) {
        if (gid && gid !== 'null' && gid !== 'undefined') {
          loadGroupData(gid);
        } else {
          setGroupId(null);
          loadUserGroups();
        }
      } else {
        // Not logged in, check for invite link to save it
        if (gid) {
          localStorage.setItem('split-ease-invite-code', gid);
          setPendingInviteCode(gid);
          // Clean the URL for the user
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    };

    syncRoute();
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, [token, loadGroupData, loadUserGroups]);

  if (!token || !currentUser) {
    return <AuthScreen 
              onAuthSuccess={handleAuthSuccess} 
              apiBaseUrl="https://split-ease-back.onrender.com" 
              showToast={showToast}
              inviteCode={pendingInviteCode}
            />;
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
        
        {groupId ? (
          currentGroup ? (
            <GroupDetails 
              group={currentGroup}
              currentUser={currentUser}
              onBack={handleGoBack}
              onAddUser={handleAddUser}
              onDeleteUser={handleDeleteUser}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
              onDeleteGroup={handleDeleteGroup}
              onDownloadReceipt={handleDownloadReceipt}
              aiStatus="ok"
              aiDiagnostic={null}
            />
          ) : (
            <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 animate-pulse">
               <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
               <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
          )
        ) : (
          <div className="animate-in fade-in duration-300">
            <header className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
              <div className="flex items-center gap-4">
                <Logo className="w-12 h-12" />
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black">Split<span className="text-sky-500">Easy</span></h1>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                      {isSyncing ? 'Syncing...' : 'Connected'}
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
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" /></svg>
                </button>
              </div>
            </header>

            <GroupDashboard 
              groups={groups} 
              onCreateGroup={handleCreateGroup} 
              onSelectGroup={handleSelectGroup} 
              isSyncing={isSyncing} 
              currentUserId={currentUser._id || currentUser.id}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;