
import React, { useState } from 'react';
import { Expense, User } from '../types.ts';
import { TrashIcon, PhotographIcon, DownloadIcon } from './icons.tsx';
import { getUserAvatar } from '../utils.ts';

interface ExpenseListProps {
  expenses: Expense[];
  users: User[];
  onDeleteExpense: (id: string) => void;
  onDownloadReceipt: (expenseId: string, expenseDescription: string) => void;
}

const ExpenseItem: React.FC<{ 
    expense: Expense, 
    users: User[], 
    onDeleteExpense: (id: string) => void,
    onDownloadReceipt: (expenseId: string, expenseDescription: string) => void 
}> = ({ expense, users, onDeleteExpense, onDownloadReceipt }) => {
    const [showReceipt, setShowReceipt] = useState(false);
    
    // Find the full user object for the payer to get their custom avatar
    const payer = users.find(u => (u.id || u._id) === expense.paidById);
    const payerName = payer?.name || expense.payer_name || 'Unknown User';
    const payerAvatar = getUserAvatar(payer || { name: payerName });

    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-grow flex gap-4 min-w-0">
                    <div className="relative flex-shrink-0 mt-1">
                        <img src={payerAvatar} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-700 shadow-sm" alt={payerName} />
                    </div>
                    <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 dark:text-white leading-tight truncate">{expense.description}</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Paid by <span className="font-bold text-slate-700 dark:text-slate-300">{payerName}</span>
                        </p>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {expense.participantIds.map(id => {
                            const u = users.find(usr => (usr.id || usr._id) === id);
                            return <img key={id} src={getUserAvatar(u)} className="w-5 h-5 rounded-full border border-white dark:border-slate-700 -ml-1.5 first:ml-0" title={u?.name} />;
                          })}
                        </div>
                    </div>
                </div>
                <div className="text-right flex-shrink-0">
                    <p className="text-lg font-black text-slate-900 dark:text-white">${expense.amount.toFixed(2)}</p>
                    <div className="flex items-center justify-end gap-2 mt-2">
                        {expense.receiptImage && (
                          <>
                            <button onClick={() => setShowReceipt(!showReceipt)} className="p-1.5 text-slate-400 hover:text-sky-500 transition-colors" title="Show Receipt">
                              <PhotographIcon className="w-4 h-4" />
                            </button>
                             <button onClick={() => onDownloadReceipt(expense.id || expense._id!, expense.description)} className="p-1.5 text-slate-400 hover:text-sky-500 transition-colors" title="Download Receipt">
                               <DownloadIcon className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button onClick={() => onDeleteExpense(expense.id || expense._id!)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors" title="Delete Expense">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
            {showReceipt && expense.receiptImage && (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-700">
                    <img src={expense.receiptImage} className="w-full h-auto max-h-80 object-contain bg-slate-50 dark:bg-slate-900" alt="Receipt" />
                </div>
            )}
        </div>
    );
};

const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, users, onDeleteExpense, onDownloadReceipt }) => {
  if (expenses.length === 0) return null;
  const sortedExpenses = [...expenses].sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-2">Expense History</h2>
      <div className="space-y-3">
        {sortedExpenses.map(expense => (
          <ExpenseItem 
            key={expense.id || expense._id} 
            expense={expense} 
            users={users} 
            onDeleteExpense={onDeleteExpense} 
            onDownloadReceipt={onDownloadReceipt}
          />
        ))}
      </div>
    </div>
  );
};

export default ExpenseList;
