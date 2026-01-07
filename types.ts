
export interface User {
  id: string;
  name: string;
  picture?: string;
  email?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidById: string;
  participantIds: string[];
  transactionDate: string;
  uploadDate: string;
  receiptImage?: string;
}

export interface Settlement {
  from: string; // User name
  to: string; // User name
  amount: number;
}
