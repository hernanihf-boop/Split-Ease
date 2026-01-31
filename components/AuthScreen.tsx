
import React, { useState, useMemo } from 'react';
import { Logo } from './icons.tsx';
import { User } from '../types.ts';

interface AuthScreenProps {
  onAuthSuccess: (token: string, user: User) => void;
  apiBaseUrl: string; 
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess, apiBaseUrl, showToast }) => {
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
    const seeds = ['Felix', 'Aneka', 'James', 'Aria', 'Jack'];
    return seeds.map(s => `https://api.dicebear.com/7.x/avataaars/svg?seed=${s}&mouth=smile&eyes=happy&backgroundColor=b6e3f4`);
  }, []);

  const [selectedAvatar, setSelectedAvatar] = useState(randomAvatars[0]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const passwordRequirements = useMemo(() => {
    const p = formData.password;
    return [
      { label: 'Min 8 characters', met: p.length >= 8 },
      { label: 'One uppercase', met: /[A-Z]/.test(p) },
      { label: 'One lowercase', met: /[a-z]/.test(p) },
      { label: 'One number', met: /[0-9]/.test(p) },
    ];
  }, [formData.password]);

  const isPasswordRobust = useMemo(() => {
    return passwordRequirements.every(req => req.met);
  }, [passwordRequirements]);

  const isEmailValid = useMemo(() => emailRegex.test(formData.email.trim()), [formData.email]);

  const canSubmit = useMemo(() => {
    if (loading) return false;
    if (isLogin) return isEmailValid && formData.password.length > 0;
    return (
      isEmailValid && 
      formData.name.trim().length > 0 && 
      isPasswordRobust && 
      formData.password === formData.confirmPassword
    );
  }, [isLogin, formData, loading, isPasswordRobust, isEmailValid]);

  const handleInputChange = (field: string, value: string) => {
    if (localError) setLocalError(null);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleMode = (login: boolean) => {
    setIsLogin(login);
    setLocalError(null);
    setFormData({ email: '', password: '', confirmPassword: '', name: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final check although button should be disabled
    if (!isEmailValid) {
      setLocalError("Please enter a valid email address.");
      return;
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }

    if (!isLogin && !isPasswordRobust) {
      setLocalError("Password does not meet the security requirements.");
      return;
    }

    setLoading(true);
    setLocalError(null);
    
    const base = apiBaseUrl.replace('/api', '').replace(/\/$/, '');
    const endpoint = isLogin ? '/auth/login' : '/auth/signup';
    const url = `${base}${endpoint}`;
    
    const body = isLogin 
      ? { email: formData.email.trim().toLowerCase(), password: formData.password }
      : { 
          email: formData.email.trim().toLowerCase(), 
          password: formData.password, 
          name: formData.name.trim(), 
          picture: selectedAvatar,
          avatar_url: selectedAvatar
        };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        const msg = data.error || data.message || `Server error (${res.status})`;
        if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("unauthorized")) {
            throw new Error("Incorrect email or password. Please try again.");
        }
        throw new Error(msg);
      }

      if (isLogin) {
        if (!data.token || !data.user) {
          throw new Error('Incomplete response from server.');
        }
        onAuthSuccess(data.token, data.user);
      } else {
        setIsLogin(true);
        setFormData({ email: formData.email, password: '', confirmPassword: '', name: '' });
        showToast("Account created successfully! You can now log in.");
      }
    } catch (err: any) {
      console.error(`❌ Auth Error:`, err.message);
      setLocalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
        <Logo className="w-24 h-24 mx-auto relative shadow-2xl rounded-3xl" />
        <h1 className="text-4xl font-black text-white tracking-tight">Split<span className="text-sky-400">Easy</span></h1>
        
        <div className="bg-slate-800/50 p-8 rounded-3xl border border-slate-700 backdrop-blur-sm shadow-xl space-y-6">
          <div className="flex p-1 bg-slate-900 rounded-xl">
            <button 
              type="button"
              onClick={() => toggleMode(true)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Login
            </button>
            <button 
              type="button"
              onClick={() => toggleMode(false)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className={`space-y-4 text-left ${localError ? 'animate-shake' : ''}`}>
            {!isLogin && (
              <>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-sky-400 uppercase tracking-widest ml-1">Choose your Avatar</label>
                  <div className="flex justify-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    {randomAvatars.map((av, idx) => (
                      <button 
                        key={idx} type="button" onClick={() => { setSelectedAvatar(av); if(localError) setLocalError(null); }}
                        className={`w-10 h-10 rounded-full border-2 transition-all flex-shrink-0 ${selectedAvatar === av ? 'border-sky-500 scale-110 shadow-lg shadow-sky-500/20' : 'border-transparent opacity-50'}`}
                      >
                        <img src={av} alt="Avatar" className="rounded-full bg-slate-700" />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                  <input 
                    type="text" placeholder="Your name" required
                    value={formData.name} onChange={e => handleInputChange('name', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-4 rounded-xl font-medium focus:ring-2 focus:ring-sky-500 outline-none transition-all placeholder:text-slate-600 mt-1"
                  />
                </div>
              </>
            )}
            
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
              <input 
                type="email" placeholder="email@example.com" required
                value={formData.email} onChange={e => handleInputChange('email', e.target.value)}
                className={`w-full bg-slate-900 border p-4 rounded-xl font-medium focus:ring-2 outline-none transition-all placeholder:text-slate-600 mt-1 ${localError && (localError.includes("email") || localError.includes("Incorrect")) ? 'border-red-500/50 ring-red-500/20 ring-2' : 'border-slate-700 focus:ring-sky-500'} text-white`}
              />
            </div>
            
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
              <input 
                type="password" placeholder="••••••••" required
                value={formData.password} onChange={e => handleInputChange('password', e.target.value)}
                className={`w-full bg-slate-900 border p-4 rounded-xl font-medium focus:ring-2 outline-none transition-all placeholder:text-slate-600 mt-1 ${localError && (localError.includes("Password") || localError.includes("Incorrect")) ? 'border-red-500/50 ring-red-500/20 ring-2' : 'border-slate-700 focus:ring-sky-500'} text-white`}
              />
              
              {!isLogin && formData.password.length > 0 && (
                <div className="mt-3 p-3 bg-slate-900/50 rounded-xl border border-slate-700 grid grid-cols-2 gap-2 animate-in slide-in-from-top-2">
                  {passwordRequirements.map((req, i) => (
                    <div key={i} className={`flex items-center gap-2 text-[10px] font-bold transition-colors ${req.met ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {req.met ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <div className="w-1 h-1 rounded-full bg-slate-600" />
                      )}
                      {req.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!isLogin && (
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Repeat Password</label>
                <input 
                  type="password" placeholder="••••••••" required
                  value={formData.confirmPassword} onChange={e => handleInputChange('confirmPassword', e.target.value)}
                  className={`w-full bg-slate-900 border p-4 rounded-xl font-medium focus:ring-2 outline-none transition-all placeholder:text-slate-600 mt-1 ${
                    formData.confirmPassword 
                    ? (formData.password === formData.confirmPassword ? 'border-emerald-500/50 focus:ring-emerald-500' : 'border-red-500/50 focus:ring-red-500 ring-2 ring-red-500/20') 
                    : 'border-slate-700 focus:ring-sky-500'
                  } text-white`}
                />
              </div>
            )}

            {localError && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Authentication Error</p>
                  <p className="text-sm text-red-200/80 leading-tight">{localError}</p>
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={!canSubmit}
              className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-black p-4 rounded-xl shadow-lg transition-all active:scale-95 flex justify-center items-center gap-3 mt-6"
            >
              {loading && (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>{isLogin ? (loading ? 'Connecting...' : 'Login') : (loading ? 'Creating...' : 'Create Account')}</span>
            </button>
          </form>
        </div>
        
        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest italic text-center">
          Free server: may take 15-30s to boot.
        </p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}} />
    </div>
  );
};

export default AuthScreen;