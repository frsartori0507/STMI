
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { db } from '../services/db';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoLogging, setIsAutoLogging] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const savedUser = await db.getSession();
      if (savedUser) {
        // Simula um carregamento de segurança rápido
        setTimeout(() => {
          onLoginSuccess(savedUser);
        }, 1500);
      } else {
        setIsAutoLogging(false);
      }
    };
    checkSession();
  }, [onLoginSuccess]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const users = await db.getUsers();
      const user = users.find(u => u.username === username && u.password === password);

      if (!user) {
        setError('Usuário ou senha incorretos.');
      } else if (user.status === 'BLOQUEADO') {
        setError('Acesso negado. Esta conta foi suspensa.');
      } else {
        await db.setSession(user, remember);
        onLoginSuccess(user);
      }
    } catch (err) {
      setError('Falha crítica na conexão com o banco.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isAutoLogging) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0f172a] relative overflow-hidden">
        {/* Background animação suave */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white font-bold text-4xl shadow-2xl shadow-blue-500/40 mb-8 animate-bounce">S</div>
          <h2 className="text-white text-xl font-black uppercase tracking-[0.3em] mb-2">STMI Projetos</h2>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Reconhecendo Dispositivo...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0f172a] p-6 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]"></div>
      
      <div className="w-full max-w-[480px] relative z-10">
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] p-10 sm:p-14">
          <div className="flex flex-col items-center mb-12">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-xl shadow-blue-500/20 mb-6">S</div>
            <h1 className="text-white text-3xl font-black tracking-tight mb-2">Bem-vindo</h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.25em]">Central de Inteligência STMI</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Identificação</label>
              <input 
                required
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-white transition-all placeholder:text-slate-600"
                placeholder="Nome de usuário"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Senha de Acesso</label>
              <input 
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-white transition-all placeholder:text-slate-600"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input 
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="peer hidden"
                  />
                  <div className="w-5 h-5 border-2 border-white/20 rounded-md peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all flex items-center justify-center">
                    <svg className={`w-3 h-3 text-white transition-opacity ${remember ? 'opacity-100' : 'opacity-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="4" d="M5 13l4 4L19 7"/></svg>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-slate-300 transition-colors">Permanecer Conectado</span>
              </label>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold p-4 rounded-2xl animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  {error}
                </div>
              </div>
            )}

            <button 
              disabled={isLoading}
              type="submit" 
              className="w-full py-5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-2xl shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Processando...
                </>
              ) : 'Entrar no Sistema'}
            </button>
          </form>

          <div className="mt-12 text-center space-y-2">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">© 2024 Secretaria de Transporte</p>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
               <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
               <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Database: BD_Projetos.db</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
