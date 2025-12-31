
import React, { useState, useRef, useEffect } from 'react';
import { User, Expense } from '../types.ts';
import { CurrencyDollarIcon, CameraIcon, TrashIcon, SparklesIcon } from './icons.tsx';

interface ExpenseFormProps {
  users: User[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ users, onAddExpense }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [receiptImage, setReceiptImage] = useState<string | undefined>();
  const [formError, setFormError] = useState('');
  const [aiIsLoading, setAiIsLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [extractedTransactionDate, setExtractedTransactionDate] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (users.length > 0 && !paidById) {
      setPaidById(users[0].id);
    }
  }, [users, paidById]);

  const resetFormState = () => {
    setDescription('');
    setAmount('');
    setParticipantIds([]);
    setReceiptImage(undefined);
    setFormError('');
    setAiIsLoading(false);
    setAiError(null);
    setExtractedTransactionDate('');
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
    if (users.length > 0) {
        setPaidById(users[0].id);
    }
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { 
        setAiError('La imagen es demasiado grande (máx 5MB).');
        return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Image = reader.result as string;
      setReceiptImage(base64Image);
      processImageWithAI(base64Image, file.type);
    };
    reader.readAsDataURL(file);
  };

  const processImageWithAI = async (base64ImageWithMime: string, mimeType: string) => {
    setAiIsLoading(true);
    setAiError(null);
    try {
      const base64Data = base64ImageWithMime.split(',')[1];
      // Cambiado de /.netlify/functions/gemini a /api/gemini
      const apiResponse = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              base64Image: base64Data,
              mimeType: mimeType,
          }),
      });

      const result = await apiResponse.json();
      if (!apiResponse.ok) throw new Error(result.error || 'Error en IA');
      
      const contentToParse = result.text.trim().replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(contentToParse);
      
      setDescription(parsedData.merchantName || '');
      setAmount(parsedData.totalAmount ? Number(parsedData.totalAmount).toFixed(2) : '');
      if (parsedData.transactionDate) {
          const d = new Date(parsedData.transactionDate);
          if (!isNaN(d.getTime())) setExtractedTransactionDate(d.toISOString());
      }
    } catch (err: any) {
      setAiError("No se pudo procesar el recibo automáticamente.");
    } finally {
      setAiIsLoading(false);
      setParticipantIds(users.map(u => u.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!description || !parsedAmount || participantIds.length === 0) {
      setFormError('Completa todos los campos obligatorios.');
      return;
    }
    onAddExpense({
      description,
      amount: parsedAmount,
      paidById,
      participantIds,
      receiptImage,
      transactionDate: extractedTransactionDate || new Date().toISOString(),
      uploadDate: new Date().toISOString(),
    });
    resetFormState();
  };

  if (users.length < 2) return null;

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700">
      {!receiptImage ? (
        <>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4 flex items-center">
              <SparklesIcon className="w-7 h-7 mr-3 text-violet-500" />
              Añadir Gasto
          </h2>
          <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleFileChange} className="hidden" id="receipt-upload" />
          <label htmlFor="receipt-upload" className="cursor-pointer w-full flex flex-col justify-center items-center px-6 py-12 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all">
              <CameraIcon className="w-16 h-16 mb-4 text-sky-500" />
              <span className="font-bold text-lg text-sky-600">Escanear Recibo</span>
          </label>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
              <img src={receiptImage} className="w-full max-h-64 object-contain rounded-xl bg-slate-50 dark:bg-slate-900" />
              {aiIsLoading && <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center rounded-xl text-white font-bold">Analizando...</div>}
          </div>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción" className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700" />
          <div className="grid grid-cols-2 gap-4">
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Monto" step="0.01" className="p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700" />
            <select value={paidById} onChange={(e) => setPaidById(e.target.value)} className="p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700">
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <button type="submit" className="w-full py-4 bg-sky-500 text-white font-bold rounded-xl shadow-lg">Confirmar Gasto</button>
          <button type="button" onClick={resetFormState} className="w-full text-slate-500 text-sm">Cancelar</button>
        </form>
      )}
    </div>
  );
};

export default ExpenseForm;
