
export interface User {
  id: string;
  _id?: string; // Soporte para MongoDB
  name: string;
  email?: string;
  picture?: string;
  avatar_url?: string; // Campo adicional para compatibilidad
}

export interface Settlement {
  from_user_id: number | string;
  from_name: string;
  from_avatar_url?: string;
  to_user_id: number | string;
  to_name: string;
  to_avatar_url?: string;
  amount: number;
}

export interface Group {
  id: string;
  _id?: string; // Soporte para MongoDB
  name: string;
  emoji?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  ownerId?: string;
  created_by?: number | string;
  is_owner?: boolean;
  isOwner?: boolean;
  
  // Nuevos campos del backend
  invite_code?: string;
  invite_link?: string;
  total_spent?: number;
  
  // Listas de datos
  users: User[]; // Mapeado de 'members' del backend
  expenses: Expense[];
  settlements?: Settlement[]; // Del backend
}

export interface Expense {
  id: string;
  _id?: string;
  description: string;
  amount: number;
  
  // Frontend usa paidById, backend usa payer_id
  paidById: string; 
  payer_id?: string | number;
  payer_name?: string;

  participantIds: string[];
  
  // Frontend transactionDate, backend date
  transactionDate: string;
  date?: string;
  
  uploadDate: string;
  receiptImage?: string;
  image_path?: string;
}