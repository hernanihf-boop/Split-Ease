
import React, { useState } from 'react';
import { User } from '../types.ts';
import { UserPlusIcon, TrashIcon } from './icons.tsx';

interface UserManagementProps {
  users: User[];
  onAddUser: (name: string) => void;
  onDeleteUser: (id: string) => void;
  hasExpenses: boolean;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, onAddUser, onDeleteUser, hasExpenses }) => {
  const [newUserName, setNewUserName] = useState('');
  const [error, setError] = useState('');

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName.trim() === '') {
      setError('Name cannot be empty.');
      return;
    }
    if (users.some(user => user.name.toLowerCase() === newUserName.trim().toLowerCase())) {
        setError('Friend already in the group.');
        return;
    }
    onAddUser(newUserName.trim());
    setNewUserName('');
    setError('');
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700/50">
      <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-5 flex items-center">
        <div className="bg-sky-100 dark:bg-sky-900/30 p-2 rounded-lg mr-3">
          <UserPlusIcon className="w-5 h-5 text-sky-500" />
        </div>
        Group Friends
      </h2>
      
      <form onSubmit={handleAddUser} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newUserName}
          onChange={(e) => { setNewUserName(e.target.value); if (error) setError(''); }}
          placeholder="Add a friend's name..."
          className="flex-grow px-4 py-3 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none transition-all"
        />
        <button
          type="submit"
          className="px-5 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-all active:scale-95 shadow-lg shadow-sky-500/20"
        >
          Add
        </button>
      </form>
      
      {error && <p className="text-red-500 text-xs mb-4 font-medium px-2">{error}</p>}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {users.map(user => (
          <div key={user.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 group hover:border-sky-200 dark:hover:border-sky-900 transition-all">
            <div className="flex items-center gap-3">
              {user.picture ? (
                <img src={user.picture} className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white" alt={user.name} />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-[120px]">{user.name}</span>
            </div>
            
            <button
              onClick={() => onDeleteUser(user.id)}
              disabled={hasExpenses}
              className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 transition-all disabled:hidden"
              title="Remove friend"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      
      {users.length < 2 && (
        <p className="text-slate-400 text-xs text-center mt-4 italic">Add at least one friend to start splitting expenses.</p>
      )}
    </div>
  );
};

export default UserManagement;
