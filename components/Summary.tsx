
import React, { useMemo } from 'react';
import * as XLSX from 'xlsx';
import { User, Expense, Settlement } from '../types.ts';
import { DownloadIcon } from './icons.tsx';

interface SummaryProps {
  users: User[];
  expenses: Expense[];
}

const Summary: React.FC<SummaryProps> = ({ users, expenses }) => {
  const settlements = useMemo<Settlement[]>(() => {
    if (users.length < 2 || expenses.length === 0) {
      return [];
    }

    const balances = new Map<string, number>();
    users.forEach(user => balances.set(user.id, 0));

    expenses.forEach(expense => {
      const payerId = expense.paidById;
      const amount = expense.amount;
      const participants = expense.participantIds;
      const share = amount / participants.length;

      // Credit the payer
      balances.set(payerId, (balances.get(payerId) || 0) + amount);

      // Debit the participants
      participants.forEach(participantId => {
        balances.set(participantId, (balances.get(participantId) || 0) - share);
      });
    });

    const debtors = Array.from(balances.entries())
      .filter(([, balance]) => balance < -0.01)
      .map(([id, balance]) => ({ id, balance: -balance }));

    const creditors = Array.from(balances.entries())
      .filter(([, balance]) => balance > 0.01)
      .map(([id, balance]) => ({ id, balance }));

    debtors.sort((a, b) => b.balance - a.balance);
    creditors.sort((a, b) => b.balance - a.balance);
    
    const newSettlements: Settlement[] = [];
    
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amountToSettle = Math.min(debtor.balance, creditor.balance);

      if (amountToSettle > 0.01) {
          newSettlements.push({
            from: users.find(u => u.id === debtor.id)?.name || 'Unknown',
            to: users.find(u => u.id === creditor.id)?.name || 'Unknown',
            amount: amountToSettle,
          });
      }

      debtor.balance -= amountToSettle;
      creditor.balance -= amountToSettle;

      if (debtor.balance < 0.01) {
        i++;
      }
      if (creditor.balance < 0.01) {
        j++;
      }
    }

    return newSettlements;
  }, [users, expenses]);

  const handleDownloadXLSX = () => {
    if (expenses.length === 0) return;

    const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown';

    // Prepare data for "Detailed Expenses" sheet
    const expenseHeaders = ['Transaction Date', 'Description', 'Amount', 'Paid By', 'Split With', 'Upload Date'];
    const expenseData = [...expenses].reverse().map(e => [
        new Date(e.transactionDate).toLocaleString(),
        e.description,
        e.amount,
        getUserName(e.paidById),
        e.participantIds.map(getUserName).join('; '),
        new Date(e.uploadDate).toLocaleString()
    ]);

    // Prepare data for "Settlement Summary" sheet
    const settlementHeaders = ['Owes', 'Pays To', 'Amount'];
    const settlementData = settlements.map(s => [
        s.from,
        s.to,
        s.amount
    ]);
    
    // Create worksheets
    const expenseSheet = XLSX.utils.aoa_to_sheet([expenseHeaders, ...expenseData]);
    const settlementSheet = XLSX.utils.aoa_to_sheet([settlementHeaders, ...settlementData]);

    // Auto-fit columns for better readability
    const setColumnWidths = (worksheet: XLSX.WorkSheet, data: any[][]) => {
        const objectMaxLength: number[] = [];
        data.forEach((row) => {
            row.forEach((cell, colIndex) => {
                const cellLength = cell ? String(cell).length : 0;
                if (!objectMaxLength[colIndex] || cellLength > objectMaxLength[colIndex]) {
                    objectMaxLength[colIndex] = cellLength;
                }
            });
        });
        worksheet['!cols'] = objectMaxLength.map(w => ({ wch: w + 2 }));
    };

    setColumnWidths(expenseSheet, [expenseHeaders, ...expenseData]);
    if (settlements.length > 0) {
      setColumnWidths(settlementSheet, [settlementHeaders, ...settlementData]);
    }
    
    // Create workbook and add sheets
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, expenseSheet, "Detailed Expenses");
    if (settlements.length > 0) {
        XLSX.utils.book_append_sheet(wb, settlementSheet, "Settlement Summary");
    }
    
    // Generate and download file
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `splitease_report_${date}.xlsx`);
  };

  if (expenses.length === 0) {
    return null;
  }

  if (settlements.length === 0 && expenses.length > 0) {
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg text-center">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">All Settled Up!</h2>
            <p className="text-slate-500 dark:text-slate-400">All expenses are balanced among everyone.</p>
             <button 
                onClick={handleDownloadXLSX}
                className="mt-4 flex mx-auto items-center p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50 transition-colors duration-300"
                title="Download full report as XLSX"
            >
                <DownloadIcon className="w-5 h-5"/>
            </button>
        </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">How to Settle Up</h2>
            <button 
                onClick={handleDownloadXLSX}
                disabled={expenses.length === 0}
                className="flex items-center p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download full report as XLSX"
            >
                <DownloadIcon className="w-5 h-5"/>
            </button>
      </div>
      <div className="space-y-3">
        {settlements.map((settlement, index) => (
          <div key={index} className="bg-sky-100 dark:bg-sky-900/50 p-4 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="font-semibold text-sky-800 dark:text-sky-200">{settlement.from}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <span className="font-semibold text-sky-800 dark:text-sky-200">{settlement.to}</span>
            </div>
            <div className="text-lg font-bold text-sky-600 dark:text-sky-300">
              ${settlement.amount.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Summary;
