
import React, { useState, useEffect, useCallback } from 'react';
import { User, Expense } from './types.ts';
import UserManagement from './components/UserManagement.tsx';
import ExpenseForm from './components/ExpenseForm.tsx';
import ExpenseList from './components/ExpenseList.tsx';
import Summary from './components/Summary.tsx';

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>(() => {
    const savedUsers = localStorage.getItem('split-ease-users');
    return savedUsers ? JSON.parse(savedUsers) : [];
  });
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const savedExpenses = localStorage.getItem('split-ease-expenses');
    return savedExpenses ? JSON.parse(savedExpenses) : [];
  });

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
        alert("Cannot delete users when there are existing expenses. Please clear expenses first.");
        return;
    }
    setUsers(prev => prev.filter(user => user.id !== id));
  }, [expenses.length]);

  const handleAddExpense = useCallback((expenseData: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
    };
    setExpenses(prev => [newExpense, ...prev]);
  }, []);

  const handleDeleteExpense = useCallback((id: string) => {
    setExpenses(prev => prev.filter(expense => expense.id !== id));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Split<span className="text-sky-500">Ease</span>
          </h1>
          <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
            Scan receipts with AI to split group expenses, hassle-free.
          </p>
        </header>

        <main className="space-y-8">
          <UserManagement users={users} onAddUser={handleAddUser} onDeleteUser={handleDeleteUser} hasExpenses={expenses.length > 0} />
          {users.length >= 2 && <ExpenseForm users={users} onAddExpense={handleAddExpense} />}
          <Summary users={users} expenses={expenses} />
          <ExpenseList expenses={expenses} users={users} onDeleteExpense={handleDeleteExpense} />
        </main>
        
        <footer className="text-center text-slate-500 dark:text-slate-400 text-sm pt-8">
            <p>Powered by Gemini, React & Tailwind CSS.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;