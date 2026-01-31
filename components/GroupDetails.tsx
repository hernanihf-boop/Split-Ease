
import React, { useState } from 'react';
import { Group, User, Expense } from '../types.ts';
import UserManagement from './UserManagement.tsx';
import ExpenseForm from './ExpenseForm.tsx';
import ExpenseList from './ExpenseList.tsx';
import Summary from './Summary.tsx';
import { getUserAvatar } from '../utils.ts';
import { TrashIcon } from './icons.tsx';

interface GroupDetailsProps {
  group: Group;
  currentUser: User;
  onBack: () => void;
  onAddUser: (email: string) => void;
  onDeleteUser: (userId: string) => void;
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onDeleteExpense: (expenseId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onDownloadReceipt: (expenseId: string, expenseDescription: string) => void;
  aiStatus: 'checking' | 'ok' | 'error';
  aiDiagnostic: string | null;
}

const GroupDetails: React.FC<GroupDetailsProps> = ({ 
  group, 
  currentUser,
  onBack, 
  onAddUser, 
  onDeleteUser, 
  onAddExpense, 
  onDeleteExpense,
  onDeleteGroup,
  onDownloadReceipt,
  aiStatus,
  aiDiagnostic
}) => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'members'>('expenses');
  const [copied, setCopied] = useState(false);

  const copyInviteLink = () => {
    if (group.invite_link) {
      navigator.clipboard.writeText(group.invite_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isOwner = group.is_owner || group.isOwner;
  const groupId = group.id || group._id!;
  
  const handleDeleteClick = () => {
    onDeleteGroup(groupId);
  };

  return (
    <div className="animate-in slide-in-from-right-4 duration-300 pb-20">
      {/* Navigation Bar */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-sky-500 transition-colors group">
          <div className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-100 dark:border-slate-700 group-hover:border-sky-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="http://www.w3.org/2000/svg" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </div>
          <span>Back to Dashboard</span>
        </button>
        <div className="flex items-center gap-2 relative z-30">
            {isOwner && (
                <span className="text-xs font-bold bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300 px-3 py-1.5 rounded-lg">Owner</span>
            )}
            {isOwner && (
                <button
                    onClick={handleDeleteClick}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-xs font-bold rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    title="Delete Group"
                >
                    <TrashIcon className="w-4 h-4" />
                    <span>Delete Group</span>
                </button>
            )}
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
            <span className="text-9xl">{group.emoji || '👥'}</span>
        </div>
        
        <div className="relative z-10">
            <div className="flex items-center gap-4 mb-2">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-4xl shadow-inner border border-slate-100 dark:border-slate-700">
                    {group.emoji || '👥'}
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white leading-none">{group.name}</h1>
                    <p className="text-slate-400 font-medium text-sm mt-1">{group.users.length} members</p>
                </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Spent</p>
                    <p className="text-4xl font-black text-slate-800 dark:text-white">
                        ${(group.total_spent || group.expenses.reduce((acc, curr) => acc + curr.amount, 0)).toFixed(2)}
                    </p>
                </div>

                {group.invite_link && (
                    <div className="w-full sm:w-auto bg-slate-50 dark:bg-slate-900 p-2 pl-4 rounded-xl flex items-center justify-between gap-3 border border-slate-200 dark:border-slate-700">
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Invite Code</span>
                            <span className="font-mono font-bold text-slate-600 dark:text-slate-300 truncate text-sm">
                                {group.invite_code || group.invite_link.split('group=')[1]}
                            </span>
                        </div>
                        <button 
                            onClick={copyInviteLink}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-sky-500 text-white hover:bg-sky-600'}`}
                        >
                            {copied ? 'Copied!' : 'Copy Link'}
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-200 dark:bg-slate-800/50 rounded-2xl mb-6">
        {(['expenses', 'balances', 'members'] as const).map(tab => (
            <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all capitalize ${
                    activeTab === tab 
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-md transform scale-[1.02]' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
                {tab}
            </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === 'expenses' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {group.users.length >= 2 ? (
                    <ExpenseForm 
                        users={group.users} 
                        onAddExpense={onAddExpense} 
                        aiStatus={aiStatus} 
                        aiDiagnostic={aiDiagnostic} 
                    />
                ) : (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-xl border border-amber-100 dark:border-amber-900/30 text-center text-sm font-bold">
                        Add more members to start splitting expenses.
                    </div>
                )}
                <ExpenseList 
                    expenses={group.expenses} 
                    users={group.users} 
                    onDeleteExpense={onDeleteExpense} 
                    onDownloadReceipt={onDownloadReceipt}
                />
            </div>
        )}

        {activeTab === 'balances' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Summary 
                    users={group.users} 
                    expenses={group.expenses} 
                    backendSettlements={group.settlements} 
                />
            </div>
        )}

        {activeTab === 'members' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <UserManagement 
                    users={group.users} 
                    onAddUser={onAddUser} 
                    onDeleteUser={onDeleteUser} 
                    hasExpenses={group.expenses.length > 0} 
                />
            </div>
        )}
      </div>
    </div>
  );
};

export default GroupDetails;