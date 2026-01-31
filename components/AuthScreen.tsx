
import React, { useState, useMemo } from 'react';
import { Logo } from './icons.tsx';
import { User } from '../types.ts';

interface AuthScreenProps {
  onAuthSuccess: (token: string, user: User) => void;
  apiBaseUrl: string; 
  showToast: (msg: string, type?: 'success' | 'error') => void;
  inviteCode: string | null;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess, apiBaseUrl, showToast, inviteCode }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '', 
    name: '',
  });

  const randomAvatars = useMemo(() => {
    const seeds = ['Felix', 'Aneka', 'James', 'Aria', 'Jack', 'Snowball'];
    return seeds.map(s => `https://api.dicebear.com/7.x/avataaars/svg?seed=${s}&mouth=smile&eyes=happy&backgroundColor=b6e3f4,c0aede,d1d4f9`);
  }, []);

  const [selectedAvatar, setSelectedAvatar] = useState(randomAvatars[0]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (localError) setLocalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLocalError(null);

    if (!isLogin) { // SIGN UP
      if (formData.password !== formData.confirmPassword) {
        setLocalError("Passwords do not match.");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`${apiBaseUrl}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            picture: selectedAvatar,
          })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Registration failed');
        onAuthSuccess(data.token, data.user);
        showToast('Welcome to SplitEasy!', 'success');
      } catch (err: any) {
        setLocalError(err.message);
        showToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    } else { // LOGIN
      try {
        const response = await fetch(`${apiBaseUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Login failed');
        onAuthSuccess(data.token, data.user);
      } catch (err: any) {
        setLocalError(err.message);
        showToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-5 duration-500">
        <div className="flex flex-col items-center mb-8">
          <Logo className="w-20 h-20" />
          <h1 className="text-3xl font-black text-slate-800 dark:text-white mt-4">Split<span className="text-sky-500">Easy</span></h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{isLogin ? "Welcome back!" : "Create your account"}</p>
        </div>
        
        {inviteCode && (
          <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-900/30 p-4 rounded-xl text-center mb-6">
            <p className="text-sky-700 dark:text-sky-300 text-sm font-bold">You've been invited to a group!</p>
            <p className="text-sky-600 dark:text-sky-400 text-xs">Sign up or log in to join.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 space-y-6">
          {!isLogin && (
            <>
              <div className="flex flex-col items-center gap-4">
                <img src={selectedAvatar} className="w-24 h-24 rounded-full border-4 border-sky-200 dark:border-sky-800 shadow-md" alt="Selected Avatar" />
                <div className="flex gap-2">
                  {randomAvatars.map(avatarUrl => (
                    <button type="button" key={avatarUrl} onClick={() => setSelectedAvatar(avatarUrl)}>
                      <img src={avatarUrl} className={`w-10 h-10 rounded-full transition-all duration-200 ${selectedAvatar === avatarUrl ? 'ring-2 ring-sky-500 scale-110' : 'opacity-50 hover:opacity-100'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Your Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-sky-500" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Password</label>
            <input type="password" name="password" value={formData.password} onChange={handleInputChange} required className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-sky-500" />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Confirm Password</label>
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} required className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
          )}

          {localError && <p className="text-red-500 text-sm text-center font-semibold">{localError}</p>}
          
          <button type="submit" disabled={loading} className="w-full py-4 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:bg-sky-400">
            {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Create Account')}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button onClick={() => { setIsLogin(!isLogin); setLocalError(null); }} className="font-bold text-sky-500 hover:underline ml-2">
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;