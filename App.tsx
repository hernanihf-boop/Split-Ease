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
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detectar si la app ya está instalada/abierta en modo standalone
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(isPWA);

    const params = new URLSearchParams(window.location.search);
    const sharedData = params.get('import');
    
    if (sharedData) {
      try {
        const decoded = JSON.parse(atob(sharedData));
        if (confirm(`¿Deseas importar el grupo "${decoded.name || 'Compartido'}" con ${decoded.expenses.length} gastos? Esto reemplazará tus datos actuales.`)) {
          setUsers(decoded.users);
          setExpenses(decoded.expenses);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (e) {
        console.error("Error al importar datos compartidos", e);
      }
    }
  }, []);

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
        alert("No se pueden eliminar usuarios mientras existan gastos.");
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

  const handleShareGroup = () => {
    const data = { name: "Grupo SplitEase", users, expenses };
    const encoded = btoa(JSON.stringify(data));
    const shareUrl = `${window.location.origin}${window.location.pathname}?import=${encoded}`;

    if (navigator.share) {
      navigator.share({
        title: 'SplitEase - Grupo Compartido',
        text: '¡Mira los gastos de nuestro grupo!',
        url: shareUrl,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Enlace copiado. ¡Envíalo a tus amigos!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {!isStandalone && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-xl text-xs sm:text-sm text-amber-800 dark:text-amber-300 flex items-center justify-between">
            <span>✨ Para una mejor experiencia, <b>instala esta app</b> desde el menú de tu navegador.</span>
            <button onClick={() => setIsStandalone(true)} className="ml-2 font-bold opacity-70">✕</button>
          </div>
        )}

        <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left flex items-center gap-4">
            <div className="relative">
               <div className="absolute inset-0 bg-sky-500 blur-lg opacity-20 rounded-xl"></div>
               <img src="/icon.svg" className="relative w-14 h-14 rounded-2xl shadow-xl border-2 border-white dark:border-slate-800" alt="Logo" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
                Split<span className="text-sky-500">Ease</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">Escanea y divide gastos con IA</p>
            </div>
          </div>
          
          {(users.length > 0 || expenses.length > 0) && (
            <button 
              onClick={handleShareGroup}
              className="flex items-center gap-2 px-4 py-2 bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 font-bold rounded-full hover:bg-sky-200 transition-all active:scale-95 border border-sky-200 dark:border-sky-800 text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
              </svg>
              Compartir Grupo
            </button>
          )}
        </header>

        <main className="space-y-8">
          <UserManagement users={users} onAddUser={handleAddUser} onDeleteUser={handleDeleteUser} hasExpenses={expenses.length > 0} />
          {users.length >= 2 && <ExpenseForm users={users} onAddExpense={handleAddExpense} />}
          <Summary users={users} expenses={expenses} />
          <ExpenseList expenses={expenses} users={users} onDeleteExpense={handleDeleteExpense} />
        </main>
        
        <footer className="text-center text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-widest pt-8 pb-4">
            Hecho con IA • Progressive Web App
        </footer>
      </div>
    </div>
  );
};

export default App;