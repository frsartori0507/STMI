
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

  // Cores oficiais Microsoft Windows 11
  const winColors = {
    blue: '#0078d4',
    blueHover: '#0067b8',
    bg: '#f3f3f3',
    card: '#ffffff',
    text: '#1a1a1a',
    textSec: '#666666',
    border: '#d1d1d1'
  };

  useEffect(() => {
    const checkSession = async () => {
      const savedUser = await db.getSession();
      if (savedUser) {
        // Simula o carregamento suave do Windows
        setTimeout(() => {
          onLoginSuccess(savedUser);
        }, 1000);
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
      // BUSCA NO BANCO:
      // 1. Obtém a lista de usuários do armazenamento (simulado Access/LocalStorage)
      const users = await db.getUsers();
      
      // 2. Procura um usuário que coincida com o login e senha digitados
      const user = users.find(u => 
        u.username.toLowerCase() === username.toLowerCase() && 
        u.password === password
      );

      if (!user) {
        setError('A conta ou a senha está incorreta. Verifique os dados e tente novamente.');
      } else if (user.status === 'BLOQUEADO') {
        setError('Esta conta foi desativada pelo administrador do sistema.');
      } else {
        // 3. Se achou, salva a sessão e libera o acesso
        await db.setSession(user, remember);
        onLoginSuccess(user);
      }
    } catch (err) {
      setError('Erro crítico: Não foi possível conectar ao banco de dados STMI.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isAutoLogging) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f3f3f3]">
        <div className="flex flex-col items-center animate-pulse">
          <div className="w-16 h-16 bg-[#0078d4] rounded-xl flex items-center justify-center text-white font-bold text-3xl shadow-lg mb-8">S</div>
          <div className="flex items-center gap-3 bg-white/50 px-6 py-3 rounded-full border border-slate-200">
            <div className="w-4 h-4 border-2 border-[#0078d4] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[#666666] text-xs font-bold tracking-widest uppercase">Autenticando STMI...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f3f3f3] p-4 font-['Segoe_UI',_sans-serif]">
      {/* Background Decorativo Estilo Windows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-blue-600/5 blur-[100px] rounded-full"></div>
      </div>
      
      <div className="w-full max-w-[440px] relative z-10">
        <div className="bg-white border border-[#d1d1d1] rounded-lg shadow-[0_12px_24px_rgba(0,0,0,0.08)] p-10 sm:p-14 overflow-hidden">
          <div className="flex flex-col mb-10">
            <div className="w-12 h-12 bg-[#0078d4] rounded-lg flex items-center justify-center text-white font-bold text-2xl shadow-sm mb-8">S</div>
            <h1 className="text-[#1a1a1a] text-2xl font-semibold tracking-tight mb-2">Entrar</h1>
            <p className="text-[#666666] text-sm font-medium">Use sua conta de rede STMI para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative group">
              <input 
                required
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-0 py-2.5 bg-transparent border-b border-[#d1d1d1] focus:border-[#0078d4] outline-none font-normal text-[#1a1a1a] transition-all placeholder:text-[#999999] text-base"
                placeholder="Nome de usuário"
              />
              <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#0078d4] transition-all duration-300 group-focus-within:w-full"></div>
            </div>

            <div className="relative group">
              <input 
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-0 py-2.5 bg-transparent border-b border-[#d1d1d1] focus:border-[#0078d4] outline-none font-normal text-[#1a1a1a] transition-all placeholder:text-[#999999] text-base"
                placeholder="Senha"
              />
              <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-[#0078d4] transition-all duration-300 group-focus-within:w-full"></div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 border-[#666666] rounded-sm focus:ring-[#0078d4] accent-[#0078d4]"
                />
                <span className="text-xs text-[#1a1a1a] font-medium">Mantenha-me conectado</span>
              </label>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-[13px] font-medium p-3 rounded-md border border-red-100 animate-in slide-in-from-top-1">
                {error}
              </div>
            )}

            <div className="pt-4 flex flex-col gap-3">
              <button 
                disabled={isLoading}
                type="submit" 
                style={{ backgroundColor: winColors.blue }}
                className="w-full py-2.5 text-white font-semibold text-sm rounded-sm hover:opacity-95 shadow-sm transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : 'Acessar Sistema'}
              </button>
              
              <button 
                type="button"
                className="w-full py-2.5 bg-[#e5e5e5] text-[#1a1a1a] font-semibold text-sm rounded-sm hover:bg-[#cccccc] transition-all"
                onClick={() => { setUsername('admin'); setPassword('123'); }}
              >
                Usar Credenciais Padrão (Teste)
              </button>
            </div>
          </form>

          <div className="mt-12 pt-6 border-t border-[#f1f1f1]">
            <a href="#" className="text-xs text-[#0067b8] hover:underline font-medium">Não consegue acessar sua conta?</a>
          </div>
        </div>

        <div className="mt-10 flex justify-center gap-8 text-[11px] text-[#666666] font-medium">
          <span className="hover:text-black cursor-pointer">Segurança STMI</span>
          <span className="hover:text-black cursor-pointer">Termos de Uso</span>
          <span className="hover:text-black cursor-pointer">Privacidade</span>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
