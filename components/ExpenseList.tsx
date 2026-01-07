
import React, { useState } from 'react';
import { Expense, User } from '../types.ts';
import { TrashIcon, UsersIcon, PhotographIcon } from './icons.tsx';

interface ExpenseListProps {
  expenses: Expense[];
  users: User[];
  onDeleteExpense: (id: string) => void;
}

const ExpenseItem: React.FC<{ expense: Expense, users: User[], onDeleteExpense: (id: string) => void }> = ({ expense, users, onDeleteExpense }) => {
    const [showReceipt, setShowReceipt] = useState(false);
    const payer = users.find(u => u.id === expense.paidById);

    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-grow flex gap-4">
                    <div className="relative flex-shrink-0 mt-1">
                        {payer?.picture ? (
                          <img src={payer.picture} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-700 shadow-sm" alt={payer.name} />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold">
                            {payer?.name.charAt(0)}
                          </div>
                        )}
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{expense.description}</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Paid by <span className="font-bold text-slate-700 dark:text-slate-300">{payer?.name || 'Unknown'}</span>
                        </p>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {expense.participantIds.map(id => {
                            const u = users.find(usr => usr.id === id);
                            return u?.picture ? (
                              <img key={id} src={u.picture} className="w-5 h-5 rounded-full border border-white dark:border-slate-700 -ml-1.5 first:ml-0" title={u.name} />
                            ) : (
                              <div key={id} className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 border border-white dark:border-slate-700 -ml-1.5 first:ml-0 flex items-center justify-center text-[8px] font-bold" title={u?.name}>
                                {u?.name.charAt(0)}
                              </div>
                            )
                          })}
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-black text-slate-900 dark:text-white">${expense.amount.toFixed(2)}</p>
                    <div className="flex items-center justify-end gap-2 mt-2">
                        {expense.receiptImage && (
                          <button onClick={() => setShowReceipt(!showReceipt)} className="p-1.5 text-slate-400 hover:text-sky-500 transition-colors">
                            <PhotographIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => onDeleteExpense(expense.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
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

const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, users, onDeleteExpense }) => {
  if (expenses.length === 0) return null;
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-2">Expense History</h2>
      <div className="space-y-3">
        {expenses.map(expense => (
          <ExpenseItem key={expense.id} expense={expense} users={users} onDeleteExpense={onDeleteExpense} />
        ))}
      </div>
    </div>
  );
};

export default ExpenseList;
