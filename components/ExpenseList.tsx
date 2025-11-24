
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
    const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown User';

    const transactionDateTime = new Date(expense.transactionDate);
    const uploadDateTime = new Date(expense.uploadDate);

    // Check if the time part is meaningful (i.e., not noon UTC that we set as a default for date-only values)
    const timeIsMeaningful = transactionDateTime.getUTCHours() !== 12 || transactionDateTime.getUTCMinutes() !== 0 || transactionDateTime.getUTCSeconds() !== 0;

    const formattedTransactionDate = transactionDateTime.toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric'
    });
    
    const formattedTransactionTime = timeIsMeaningful ? transactionDateTime.toLocaleTimeString(undefined, {
        hour: 'numeric', minute: '2-digit'
    }) : '';

    const uploadTitle = `Uploaded: ${uploadDateTime.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`;

    return (
        <div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-lg flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-grow">
                    <div className="flex justify-between items-start">
                        <p className="text-lg font-semibold text-slate-800 dark:text-white">{expense.description}</p>
                        <p className="text-lg font-bold text-slate-800 dark:text-white">${expense.amount.toFixed(2)}</p>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex justify-between items-center" title={uploadTitle}>
                        <span>Paid by <span className="font-semibold text-slate-600 dark:text-slate-300">{getUserName(expense.paidById)}</span></span>
                        <div className="text-right">
                            <span className="text-xs">{formattedTransactionDate}</span>
                            {formattedTransactionTime && <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">{formattedTransactionTime}</span>}
                        </div>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-2 flex-wrap">
                        <UsersIcon className="w-4 h-4"/>
                        <span>Split with: {expense.participantIds.map(getUserName).join(', ')}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-start">
                    {expense.receiptImage && (
                        <button
                            onClick={() => setShowReceipt(!showReceipt)}
                            className="text-slate-400 hover:text-sky-500 transition-colors p-2 -m-2"
                            title={showReceipt ? "Hide receipt" : "View receipt"}
                        >
                            <PhotographIcon className="w-5 h-5"/>
                        </button>
                    )}
                    <button
                        onClick={() => onDeleteExpense(expense.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-2 -m-2"
                        title="Delete expense"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
            {showReceipt && expense.receiptImage && (
                <div className="mt-2 border-t border-slate-200 dark:border-slate-600 pt-3">
                     <img src={expense.receiptImage} alt={`Receipt for ${expense.description}`} className="w-full max-h-96 object-contain rounded-md bg-slate-200 dark:bg-slate-600"/>
                </div>
            )}
        </div>
    );
};

const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, users, onDeleteExpense }) => {
  if (expenses.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">Expense History</h2>
      <div className="space-y-4">
        {expenses.map(expense => (
          <ExpenseItem key={expense.id} expense={expense} users={users} onDeleteExpense={onDeleteExpense} />
        ))}
      </div>
    </div>
  );
};

export default ExpenseList;