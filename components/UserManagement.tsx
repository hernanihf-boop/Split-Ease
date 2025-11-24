
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
      setError('User name cannot be empty.');
      return;
    }
    if (users.some(user => user.name.toLowerCase() === newUserName.trim().toLowerCase())) {
        setError('A user with this name already exists.');
        return;
    }
    onAddUser(newUserName.trim());
    setNewUserName('');
    setError('');
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4 flex items-center">
        <UserPlusIcon className="w-7 h-7 mr-3 text-sky-500" />
        Manage Users
      </h2>
      <form onSubmit={handleAddUser} className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          value={newUserName}
          onChange={(e) => {
            setNewUserName(e.target.value);
            if (error) setError('');
          }}
          placeholder="Enter new user name"
          className="flex-grow w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none transition"
        />
        <button
          type="submit"
          className="w-full sm:w-auto px-6 py-2 bg-sky-500 text-white font-semibold rounded-lg hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50 transition-colors duration-300 flex items-center justify-center"
        >
          <UserPlusIcon className="w-5 h-5 mr-2"/>
          Add User
        </button>
      </form>
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      <div className="space-y-2">
        {users.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-center py-4">No users added yet. Add at least two to start splitting!</p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {users.map(user => (
              <li key={user.id} className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 p-3 rounded-lg">
                <span className="text-slate-700 dark:text-slate-200 font-medium truncate">{user.name}</span>
                <button
                    onClick={() => onDeleteUser(user.id)}
                    className={`text-slate-400 hover:text-red-500 transition-colors ${hasExpenses ? 'cursor-not-allowed opacity-50' : ''}`}
                    title={hasExpenses ? "Cannot delete users while expenses exist" : "Delete user"}
                    disabled={hasExpenses}
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default UserManagement;