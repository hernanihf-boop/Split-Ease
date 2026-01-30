
import React, { useState } from 'react';
import { Group, Expense } from '../types.ts';
import { UsersIcon, CurrencyDollarIcon, SparklesIcon, TrashIcon } from './icons.tsx';
import { getUserAvatar } from '../App.tsx';

interface GroupDashboardProps {
  groups: Group[];
  onCreateGroup: (name: string, emoji?: string) => void;
  onDeleteGroup: (id: string) => void;
  onSelectGroup: (id: string) => void;
  isSyncing: boolean;
  currentUserId: string;
}

const QUICK_EMOJIS = ['✈️', '🍔', '🏠', '🚗', '🍻', '🛍️', '🎮', '💡', '🎾', '🎸', '🍹', '🏔️'];

const GroupDashboard: React.FC<GroupDashboardProps> = ({ groups, onCreateGroup, onDeleteGroup, onSelectGroup, isSyncing, currentUserId }) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(QUICK_EMOJIS[0]);
  const [showCreate, setShowCreate] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    onCreateGroup(newGroupName.trim(), selectedEmoji);
    setNewGroupName('');
    setSelectedEmoji(QUICK_EMOJIS[0]);
    setShowCreate(false);
  };

  const calculateTotal = (group: Group) => {
    if (!group.expenses || !Array.isArray(group.expenses)) return 0;
    return group.expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  };

  const getLastActivityDate = (group: any) => {
    const dateStr = group.updated_at || group.updatedAt || group.created_at || group.createdAt;
    if (!dateStr) return 'No activity';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'No activity';
    return date.toLocaleDateString('en-US', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white">My <span className="text-sky-500">Groups</span></h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Organize expenses with family, friends or trips</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          className="w-full sm:w-auto bg-sky-500 hover:bg-sky-600 text-white px-6 py-4 rounded-2xl shadow-lg shadow-sky-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 font-bold"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
          <span>New Group</span>
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl border border-sky-100 dark:border-sky-900/30 flex flex-col gap-6 animate-in zoom-in duration-300">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Icon</label>
              <div className="flex gap-3 items-center">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-sky-100 dark:border-sky-900 flex items-center justify-center text-3xl shadow-inner">
                  {selectedEmoji}
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {QUICK_EMOJIS.map(emoji => (
                    <button
                      key={emoji} type="button" onClick={() => setSelectedEmoji(emoji)}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${selectedEmoji === emoji ? 'bg-sky-500 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-900'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex-grow flex flex-col gap-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Group Name</label>
              <input 
                autoFocus type="text" placeholder="e.g. Japan Trip 🏯" 
                value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-sky-500 text-lg font-medium"
                required
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSyncing} className="flex-grow bg-sky-500 text-white px-8 py-4 rounded-xl font-bold shadow-lg disabled:opacity-50">
              {isSyncing ? 'Creating...' : 'Create Group Now'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-6 py-4 text-slate-400 font-bold">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map(group => {
          const gid = group._id || group.id; // IMPORTANTE: Captura el ID real
          const totalAmount = calculateTotal(group);
          const memberCount = group.users?.length || 0;
          const lastUpdate = getLastActivityDate(group);
          const canDelete = Boolean(group.is_owner || group.isOwner);

          return (
            <div 
              key={gid}
              onClick={() => onSelectGroup(gid)}
              className="group cursor-pointer bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-xl border border-slate-100 dark:border-slate-700 transition-all relative overflow-hidden flex flex-col justify-between h-60"
            >
              {canDelete && (
                <div className="absolute top-4 right-4 z-30">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation(); 
                      console.warn(`🗑️ BOTÓN TACHO: Eliminando ${gid}`);
                      onDeleteGroup(gid);
                    }}
                    className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-2xl transition-all"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              )}
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-sky-50 dark:bg-sky-900/40 w-14 h-14 rounded-2xl flex items-center justify-center">
                    {group.emoji ? <span className="text-3xl">{group.emoji}</span> : <UsersIcon className="w-7 h-7 text-sky-500" />}
                  </div>
                  {totalAmount > 0 && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-black">
                      ${totalAmount.toFixed(2)}
                    </div>
                  )}
                </div>
                <h4 className="text-xl font-black text-slate-800 dark:text-white line-clamp-1">{group.name}</h4>
              </div>

              <div className="space-y-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-3">
                    {group.users?.slice(0, 3).map((u, i) => (
                      <img key={i} src={getUserAvatar(u)} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800" alt={u.name} />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase">{memberCount} members</span>
                </div>
                <div className="border-t border-slate-50 dark:border-slate-700 pt-3">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Last Activity: {lastUpdate}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GroupDashboard;
