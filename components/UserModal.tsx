
import React, { useState, useEffect } from 'react';
import { User, UserStatus } from '../types';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: User) => void;
  editUser?: User | null;
  isAdminMode?: boolean;
}

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSave, editUser, isAdminMode = true }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [avatar, setAvatar] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<UserStatus>('ATIVO');

  useEffect(() => {
    if (editUser) {
      setName(editUser.name);
      setRole(editUser.role);
      setAvatar(editUser.avatar);
      setUsername(editUser.username);
      setPassword(editUser.password || '');
      setStatus(editUser.status);
    } else {
      setName('');
      setRole('');
      setAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`);
      setUsername('');
      setPassword('');
      setStatus('ATIVO');
    }
  }, [editUser, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: editUser?.id || Date.now().toString(),
      name,
      role,
      avatar,
      username,
      password,
      status,
      isAdmin: editUser?.isAdmin || false
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[92vh] flex flex-col">
        <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex justify-between items-center shrink-0">
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">{editUser ? 'Editar' : 'Novo'} Membro</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 overflow-y-auto">
          <div className="flex justify-center mb-2">
            <div className="relative">
              <img src={avatar} className="w-20 h-20 rounded-2xl border-4 border-slate-50 shadow-lg" alt="Avatar" />
              <button 
                type="button" 
                onClick={() => setAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`)}
                className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-xl shadow-lg hover:bg-blue-700 active:scale-90"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome Completo</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-700" placeholder="Ex: Roberto Almeida" />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Cargo / Função</label>
              <input required value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-700" placeholder="Ex: Engenheiro" />
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
             <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest text-center border-b border-blue-50 pb-2">Credenciais de Acesso</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Usuário</label>
                  <input required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-700 text-xs" />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Senha</label>
                  <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-700 text-xs" />
                </div>
             </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Status da Conta</label>
            <div className="flex gap-2">
               <button 
                 type="button"
                 onClick={() => setStatus('ATIVO')}
                 className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${status === 'ATIVO' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-100 text-slate-400'}`}
               >
                 Ativo
               </button>
               <button 
                 type="button"
                 onClick={() => setStatus('BLOQUEADO')}
                 className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${status === 'BLOQUEADO' ? 'bg-red-500 text-white shadow-lg shadow-red-100' : 'bg-slate-100 text-slate-400'}`}
               >
                 Bloqueado
               </button>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <button type="button" onClick={onClose} className="w-full sm:flex-1 px-6 py-3.5 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-2xl">
              Cancelar
            </button>
            <button type="submit" className="w-full sm:flex-1 px-6 py-3.5 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 active:scale-[0.98]">
              {editUser ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
