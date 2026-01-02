
import React, { useState, useRef, useEffect } from 'react';
import { User, Expense } from '../types.ts';
import { CameraIcon, TrashIcon, SparklesIcon, PencilIcon, PhotographIcon } from './icons.tsx';
import { GoogleGenAI, Type } from "@google/genai";

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

    if (file.size > 5 * 1024 * 1024) { 
        setAiError('La imagen es demasiado grande (máx 5MB).');
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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
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
              text: "Analiza este recibo y extrae: el nombre del comercio (merchantName), el monto total (totalAmount) y la fecha (transactionDate en formato YYYY-MM-DD).",
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
      if (!resultText) throw new Error("No se recibió respuesta de la IA");
      
      const parsedData = JSON.parse(resultText);
      
      setDescription(parsedData.merchantName || 'Gasto nuevo');
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
      console.error("AI Direct Call Error:", err);
      setAiError("No se pudo extraer la información automáticamente. Por favor, completa los datos manualmente.");
      setIsManualMode(true);
    } finally {
      setAiIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!description || isNaN(parsedAmount) || participantIds.length === 0) {
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

  const showForm = receiptImage || isManualMode;

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700">
      {!showForm ? (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center">
                <SparklesIcon className="w-7 h-7 mr-3 text-violet-500" />
                Añadir Gasto
            </h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Cámara Input */}
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              ref={cameraInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              id="camera-upload" 
            />
            <label 
              htmlFor="camera-upload" 
              className="cursor-pointer flex flex-col justify-center items-center p-6 border-2 border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-900/50 hover:bg-sky-50 dark:hover:bg-sky-900/10 hover:border-sky-300 transition-all active:scale-95 group"
            >
                <CameraIcon className="w-10 h-10 mb-2 text-sky-500 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Cámara</span>
            </label>

            {/* Galería Input */}
            <input 
              type="file" 
              accept="image/*" 
              ref={galleryInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              id="gallery-upload" 
            />
            <label 
              htmlFor="gallery-upload" 
              className="cursor-pointer flex flex-col justify-center items-center p-6 border-2 border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-900/50 hover:bg-violet-50 dark:hover:bg-violet-900/10 hover:border-violet-300 transition-all active:scale-95 group"
            >
                <PhotographIcon className="w-10 h-10 mb-2 text-violet-500 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Galería</span>
            </label>
          </div>

          <button 
            onClick={() => setIsManualMode(true)}
            className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all active:scale-[0.98]"
          >
            <PencilIcon className="w-5 h-5 text-slate-400" />
            Ingreso Manual
          </button>
          
          {aiError && <p className="mt-4 text-red-500 text-xs text-center font-medium bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{aiError}</p>}
        </>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              {receiptImage ? <SparklesIcon className="w-5 h-5 text-violet-500" /> : <PencilIcon className="w-5 h-5 text-sky-500" />}
              {receiptImage ? 'Datos Extraídos' : 'Ingreso Manual'}
            </h3>
            <button type="button" onClick={resetFormState} className="text-slate-400 hover:text-red-500">
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>

          {receiptImage && (
            <div className="relative group">
                <img src={receiptImage} className="w-full max-h-48 object-contain rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700" />
                {aiIsLoading && (
                  <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center rounded-xl text-white font-bold backdrop-blur-[2px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                    <span className="mt-2 text-sm">Escaneando con IA...</span>
                  </div>
                )}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Descripción / Establecimiento</label>
              <input 
                type="text" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Ej: Starbucks, Cena Grupal..." 
                className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-sky-500 outline-none transition-all disabled:opacity-50" 
                required 
                disabled={aiIsLoading}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Monto Total ($)</label>
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
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Pagado por</label>
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
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">¿Quiénes participan?</label>
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
              {aiIsLoading ? 'Extrayendo...' : 'Confirmar Gasto'}
            </button>
            <button 
              type="button" 
              onClick={resetFormState} 
              className="w-full py-2 text-slate-400 text-sm hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ExpenseForm;
