
import React from 'react';
import * as XLSX from 'xlsx';
import { User, Expense, Settlement } from '../types.ts';
import { DownloadIcon } from './icons.tsx';
import { getUserAvatar } from '../utils.ts';

interface SummaryProps {
  users: User[];
  expenses: Expense[];
  backendSettlements?: Settlement[];
}

const Summary: React.FC<SummaryProps> = ({ users, expenses, backendSettlements }) => {
  
  const settlements = backendSettlements || [];

  const handleDownloadXLSX = () => {
    const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown';

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Prepare data for "Detailed Expenses" sheet
    const expenseHeaders = ['Date', 'Description', 'Amount', 'Paid By', 'Split With'];
    const expenseData = [...expenses].reverse().map(e => [
        new Date(e.transactionDate).toLocaleString(),
        e.description,
        e.amount,
        users.find(u => u.id === e.paidById)?.name || e.payer_name || 'Unknown',
        e.participantIds.map(getUserName).join('; ')
    ]);
    const expenseSheet = XLSX.utils.aoa_to_sheet([expenseHeaders, ...expenseData]);
    XLSX.utils.book_append_sheet(wb, expenseSheet, "Expenses");

    // Prepare data for "Settlement Summary" sheet
    if (settlements.length > 0) {
      const settlementHeaders = ['Owes (From)', 'Pays To', 'Amount'];
      const settlementData = settlements.map(s => [
          s.from_name,
          s.to_name,
          s.amount
      ]);
      const settlementSheet = XLSX.utils.aoa_to_sheet([settlementHeaders, ...settlementData]);
      XLSX.utils.book_append_sheet(wb, settlementSheet, "Settlements");
    }
    
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `SplitEasy_Report_${date}.xlsx`);
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">
        <div className="flex justify-between items-center">
            <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
              <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-1.5 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </span>
              Balances & Debts
            </h3>
            <button 
                onClick={handleDownloadXLSX}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
            >
                <DownloadIcon className="w-4 h-4"/>
                Export
            </button>
      </div>

      {settlements.length === 0 ? (
        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl text-center border border-emerald-100 dark:border-emerald-900/30">
            <p className="text-emerald-600 dark:text-emerald-400 font-bold">All settled up! 🎉</p>
            <p className="text-xs text-emerald-500/80 mt-1">No one owes anything.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {settlements.map((settlement, index) => {
            const fromUser = users.find(u => String(u.id || u._id) === String(settlement.from_user_id));
            const toUser = users.find(u => String(u.id || u._id) === String(settlement.to_user_id));

            const fromName = fromUser?.name || settlement.from_name;
            const toName = toUser?.name || settlement.to_name;

            const fromAvatar = getUserAvatar(fromUser || { name: fromName, avatar_url: settlement.from_avatar_url });
            const toAvatar = getUserAvatar(toUser || { name: toName, avatar_url: settlement.to_avatar_url });

            return (
              <div key={index} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl flex items-center justify-between group hover:shadow-md transition-all border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4 flex-grow min-w-0">
                  {/* Debtor */}
                  <div className="flex items-center gap-3 w-2/5 min-w-0">
                    <img src={fromAvatar} className="w-8 h-8 rounded-full flex-shrink-0" alt={fromName} title={fromName} />
                    <span className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate">{fromName}</span>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center justify-center text-slate-400 px-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  </div>

                  {/* Creditor */}
                  <div className="flex items-center gap-3 w-2/5 min-w-0">
                    <img src={toAvatar} className="w-8 h-8 rounded-full flex-shrink-0" alt={toName} title={toName} />
                    <span className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate">{toName}</span>
                  </div>
                </div>
                
                {/* Amount */}
                <div className="text-right flex-shrink-0 ml-4">
                  <div className="text-lg font-black text-emerald-500">
                    ${settlement.amount.toFixed(2)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Summary;