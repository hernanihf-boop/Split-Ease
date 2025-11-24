
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

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setAiError('File is too large. Max size is 5MB.');
        return;
    }
    if (!file.type.startsWith('image/')) {
        setAiError('Invalid file type. Please select an image.');
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Image = reader.result as string;
      setReceiptImage(base64Image);
      processImageWithAI(base64Image, file.type);
    };
    reader.onerror = () => {
        setAiError('Failed to read file.');
    };
    reader.readAsDataURL(file);
  };

  const processImageWithAI = async (base64ImageWithMime: string, mimeType: string) => {
    setAiIsLoading(true);
    setAiError(null);
    setFormError('');
    try {
      const base64Data = base64ImageWithMime.split(',')[1];
      const apiResponse = await fetch('/.netlify/functions/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              base64Image: base64Data,
              mimeType: mimeType,
          }),
      });

      const result = await apiResponse.json();

      if (!apiResponse.ok) {
          throw new Error(result.error || 'The AI service failed to process the request.');
      }
      
      const jsonStr = result.text.trim();
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      const contentToParse = match && match[2] ? match[2].trim() : jsonStr;

      try {
        const parsedData = JSON.parse(contentToParse);
        const { merchantName, transactionDate, totalAmount } = parsedData;

        setDescription(merchantName || '');
        setAmount(totalAmount ? Number(totalAmount).toFixed(2) : '');
        
        if (transactionDate) {
            const d = new Date(transactionDate);
            if (!isNaN(d.getTime())) {
                if (/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)) {
                     setExtractedTransactionDate(new Date(`${transactionDate}T12:00:00Z`).toISOString());
                } else {
                     setExtractedTransactionDate(d.toISOString());
                }
            }
        }

        if (!totalAmount) {
            setAiError("AI couldn't read the amount. Please enter it manually.");
        }

      } catch (e) {
        console.error("Failed to parse JSON response:", e);
        setAiError("AI result wasn't as expected. Please fill details manually.");
      }

    } catch (err: any) {
      console.error("AI processing failed:", err);
      setAiError(err.message || "Could not process receipt. Check API key or try again.");
      setAmount('');
      setDescription('');
    } finally {
      setAiIsLoading(false);
      selectAllParticipants();
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const parsedAmount = parseFloat(amount);
    if (description.trim() === '' || !parsedAmount || parsedAmount <= 0 || paidById === '' || participantIds.length === 0 || !receiptImage) {
      setFormError('Please fill out all fields, ensure amount is positive, and at least one participant is selected.');
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

  const handleParticipantChange = (userId: string) => {
    setParticipantIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };
  
  const selectAllParticipants = () => {
    setParticipantIds(users.map(u => u.id));
  };

  if (users.length < 2) {
    return null;
  }

  if (!receiptImage) {
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                <SparklesIcon className="w-7 h-7 mr-3 text-violet-500" />
                Add Expense via Receipt
            </h2>
            <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                id="receipt-upload"
            />
            <label
                htmlFor="receipt-upload"
                className="cursor-pointer w-full flex flex-col justify-center items-center px-6 py-10 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition"
            >
                <CameraIcon className="w-12 h-12 mb-3 text-slate-400 dark:text-slate-500" />
                <span className="font-semibold text-sky-500">Tap to Scan Receipt</span>
                <p className="text-xs mt-1">Take a photo or upload an image file</p>
            </label>
            {aiError && <p className="text-red-500 text-sm mt-4 text-center">{aiError}</p>}
        </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center">
            <CurrencyDollarIcon className="w-7 h-7 mr-3 text-green-500" />
            Confirm Expense
        </h2>
        <button onClick={resetFormState} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold">Start Over</button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
            <img src={receiptImage} alt="Receipt preview" className="w-full max-h-60 object-contain rounded-lg bg-slate-100 dark:bg-slate-700 p-2" />
            {aiIsLoading && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded-lg">
                    <SparklesIcon className="w-10 h-10 text-violet-400 animate-pulse" />
                    <p className="text-white mt-2 font-semibold">Scanning with AI...</p>
                </div>
            )}
        </div>

        {aiError && <p className="text-yellow-500 bg-yellow-100 dark:bg-yellow-900/50 p-3 rounded-lg text-sm text-center">{aiError}</p>}

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Description</label>
          <input
            id="description" type="text" value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Dinner, Movie tickets" required
            className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none transition"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Amount ($)</label>
              <input
                id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00" required
                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none transition"
                step="0.01"
              />
            </div>
            <div>
              <label htmlFor="paidBy" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Paid By</label>
              <select
                id="paidBy" value={paidById} onChange={(e) => setPaidById(e.target.value)}
                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none transition"
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>
        </div>
        <div>
          <div className="flex justify-between items-baseline">
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Split Among</label>
            <button type="button" onClick={selectAllParticipants} className="text-sm text-sky-500 hover:text-sky-600 font-medium">Select All</button>
          </div>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-slate-100 dark:bg-slate-700/50 p-4 rounded-lg">
            {users.map(user => (
              <label key={user.id} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox" checked={participantIds.includes(user.id)} onChange={() => handleParticipantChange(user.id)}
                  className="h-5 w-5 rounded border-slate-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-slate-700 dark:text-slate-200">{user.name}</span>
              </label>
            ))}
          </div>
        </div>
        
        {formError && <p className="text-red-500 text-sm">{formError}</p>}
        <button
          type="submit" disabled={aiIsLoading}
          className="w-full px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition-colors duration-300 flex items-center justify-center text-lg disabled:bg-green-300 disabled:cursor-not-allowed"
        >
          {aiIsLoading ? 'Processing...' : 'Add Expense'}
        </button>
      </form>
    </div>
  );
};

export default ExpenseForm;