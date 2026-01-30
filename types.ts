
export interface User {
  id: string;
  _id?: string; // Soporte para MongoDB
  name: string;
  email: string;
  picture?: string;
  avatar_url?: string; // Campo adicional para compatibilidad
}

export interface Group {
  id: string;
  _id?: string; // Soporte para MongoDB
  name: string;
  emoji?: string; // Cambiado de icon a emoji según documentación del backend
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  is_owner?: boolean; // Flag from backend
  isOwner?: boolean;  // CamelCase variant
  users: User[]; // La API devuelve los usuarios del grupo
  expenses: Expense[]; // La API devuelve los gastos del grupo
}

export interface Expense {
  id: string;
  _id?: string;
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
