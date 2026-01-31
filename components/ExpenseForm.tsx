
import React, { useState, useRef, useEffect } from 'react';
import { User, Expense } from '../types.ts';
import { CameraIcon, TrashIcon, SparklesIcon, PencilIcon, PhotographIcon } from './icons.tsx';
import { GoogleGenAI, Type } from "@google/genai";

interface ExpenseFormProps {
  users: User[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  aiStatus: 'checking' | 'ok' | 'error';
  aiDiagnostic: string | null;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ users, onAddExpense, aiStatus, aiDiagnostic }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [receiptImage, setReceiptImage] = useState<string | undefined>();
  const [isManualMode, setIsManualMode] = useState(false);
  const [formError, setFormError] = useState('');
  const [aiIsLoading, setAiIsLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [extractedTransactionDate, setExtractedTransactionDate] = useState('');

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (users.length > 0 && !paidById) {
      setPaidById(users[0].id);
    }
  }, [users, paidById]);

  useEffect(() => {
    if ((receiptImage || isManualMode) && participantIds.length === 0) {
      setParticipantIds(users.map(u => u.id));
    }
  }, [receiptImage, isManualMode, users]);

  const resetFormState = () => {
    setDescription('');
    setAmount('');
    setParticipantIds([]);
    setReceiptImage(undefined);
    setIsManualMode(false);
    setFormError('');
    setAiIsLoading(false);
    setAiError(null);
    setExtractedTransactionDate('');
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    
    if (users.length > 0) {
        setPaidById(users[0].id);
    }
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { 
        setAiError('Image is too large (max 10MB).');
        return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Image = reader.result as string;
      setReceiptImage(base64Image);
      setIsManualMode(false);
      processImageWithAI(base64Image, file.type);
    };
    reader.readAsDataURL(file);
  };

  const processImageWithAI = async (base64ImageWithMime: string, mimeType: string) => {
    setAiIsLoading(true);
    setAiError(null);
    
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey || apiKey === "YOUR_API_KEY" || apiKey.length < 10) {
        throw new Error("CONFIG_ERROR: API_KEY is missing or invalid.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const base64Data = base64ImageWithMime.split(',')[1];

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: "Analyze this receipt and extract: the merchant name (merchantName), the total amount (totalAmount), and the date (transactionDate in YYYY-MM-DD format).",
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              merchantName: { type: Type.STRING },
              totalAmount: { type: Type.NUMBER },
              transactionDate: { type: Type.STRING },
            },
            required: ["merchantName", "totalAmount"],
          },
        },
      });

      const resultText = response.text;
      if (!resultText) throw new Error("API_EMPTY_RESPONSE: AI did not return content.");
      
      const parsedData = JSON.parse(resultText);
      
      setDescription(parsedData.merchantName || 'New Expense');
      setAmount(parsedData.totalAmount ? Number(parsedData.totalAmount).toFixed(2) : '');
      
      if (parsedData.transactionDate) {
          const d = new Date(parsedData.transactionDate);
          if (!isNaN(d.getTime())) {
            setExtractedTransactionDate(d.toISOString());
          }
      } else {
        setExtractedTransactionDate(new Date().toISOString());
      }
    } catch (err: any) {
      console.error("AI Error:", err);
      let displayError = "Error connecting to AI.";
      
      if (err.message?.includes("CONFIG_ERROR")) {
        displayError = err.message;
      } else if (err.message?.includes("API_KEY_INVALID") || err.status === 403) {
        displayError = "Error: Gemini API Key is invalid or expired.";
      } else if (err.status === 429) {
        displayError = "Error: AI rate limit exceeded. Please try again in a moment.";
      } else {
        displayError = `Error detail: ${err.message || "Unknown scanning error"}`;
      }
      
      setAiError(displayError);
      setIsManualMode(true);
    } finally {
      setAiIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!description || isNaN(parsedAmount) || participantIds.length === 0) {
      setFormError('Please complete all required fields.');
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

  const showForm = receiptImage || isManualMode;

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700">
      {!showForm ? (
        <>
          <div className="flex items-center mb-6">
            <SparklesIcon className="w-6 h-6 mr-2 text-violet-400" />
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
              Add Expense
            </h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Camera Button */}
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              ref={cameraInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              id="camera-upload" 
              disabled={aiStatus !== 'ok'}
            />
            <label 
              htmlFor="camera-upload" 
              className={`cursor-pointer flex flex-col items-center justify-center p-8 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800/80 transition-colors active:scale-95 group ${aiStatus !== 'ok' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <CameraIcon className="w-10 h-10 text-sky-400 mb-2 transition-transform group-hover:scale-110" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Camera</span>
            </label>

            {/* Gallery Button */}
            <input 
              type="file" 
              accept="image/*" 
              ref={galleryInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              id="gallery-upload" 
              disabled={aiStatus !== 'ok'}
            />
            <label 
              htmlFor="gallery-upload" 
              className={`cursor-pointer flex flex-col items-center justify-center p-8 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800/80 transition-colors active:scale-95 group ${aiStatus !== 'ok' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <PhotographIcon className="w-10 h-10 text-violet-400 mb-2 transition-transform group-hover:scale-110" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Gallery</span>
            </label>
          </div>

          {/* Manual Entry Button */}
          <button 
            onClick={() => setIsManualMode(true)}
            className="w-full flex items-center justify-center gap-3 py-5 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800/80 transition-colors active:scale-95"
          >
            <PencilIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Manual Entry</span>
          </button>
          
          {aiError && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-tight mb-1">AI Error:</p>
                <p className="text-red-500 dark:text-red-300 text-xs leading-relaxed">{aiError}</p>
            </div>
          )}
        </>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              {receiptImage ? <SparklesIcon className="w-5 h-5 text-violet-500" /> : <PencilIcon className="w-5 h-5 text-sky-500" />}
              {receiptImage ? 'Extracted Data' : 'Manual Entry'}
            </h3>
            <button type="button" onClick={resetFormState} className="text-slate-400 hover:text-red-500" disabled={aiIsLoading}>
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>

          {receiptImage && (
            <div className="relative group">
                <img src={receiptImage} className="w-full max-h-48 object-contain rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700" />
                {aiIsLoading && (
                  <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center rounded-xl text-white font-bold backdrop-blur-[2px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                    <span className="mt-2 text-sm">Scanning with AI...</span>
                  </div>
                )}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Description / Merchant</label>
              <input 
                type="text" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="e.g. Starbucks, Group Dinner..." 
                className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-sky-500 outline-none transition-all disabled:opacity-50" 
                required 
                disabled={aiIsLoading}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Total Amount ($)</label>
                <input 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  placeholder="0.00" 
                  step="0.01" 
                  className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-sky-500 outline-none transition-all disabled:opacity-50" 
                  required 
                  disabled={aiIsLoading}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Paid by</label>
                <select 
                  value={paidById} 
                  onChange={(e) => setPaidById(e.target.value)} 
                  className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-sky-500 outline-none transition-all disabled:opacity-50"
                  disabled={aiIsLoading}
                >
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Who participates?</label>
              <div className="flex flex-wrap gap-2">
                {users.map(user => {
                  const isChecked = participantIds.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      disabled={aiIsLoading}
                      onClick={() => {
                        setParticipantIds(prev => 
                          isChecked ? prev.filter(id => id !== user.id) : [...prev, user.id]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                        isChecked 
                        ? 'bg-sky-500 text-white border-sky-500 shadow-sm' 
                        : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-600'
                      } ${aiIsLoading ? 'opacity-50' : ''}`}
                    >
                      {user.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {formError && <p className="text-red-500 text-sm text-center font-bold">{formError}</p>}
          
          <div className="flex flex-col gap-2 pt-2">
            <button 
              type="submit" 
              className="w-full py-4 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl shadow-lg transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={aiIsLoading}
            >
              {aiIsLoading ? 'Analyzing...' : 'Confirm Expense'}
            </button>
            <button 
              type="button" 
              onClick={resetFormState} 
              className="w-full py-2 text-slate-400 text-sm hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              disabled={aiIsLoading}
            >
              Cancel
            </button>
          </div>
          
          {aiError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg">
                <p className="text-red-500 dark:text-red-400 text-[10px] leading-tight font-mono">{aiError}</p>
            </div>
          )}
        </form>
      )}
    </div>
  );
};

export default ExpenseForm;
