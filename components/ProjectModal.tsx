
import React, { useState, useEffect } from 'react';
import { Project, ProjectStatus, User } from '../types';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Partial<Project>) => void;
  availableUsers: User[];
  editProject?: Project | null;
}

const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, onSave, availableUsers, editProject }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [responsibleId, setResponsibleId] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);
  const [address, setAddress] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');

  useEffect(() => {
    if (editProject) {
      setTitle(editProject.title);
      setDescription(editProject.description);
      setResponsibleId(editProject.responsibleId);
      setSelectedTeam(editProject.assignedUserIds || []);
      setAddress(editProject.address || '');
      setNumber(editProject.number || '');
      setNeighborhood(editProject.neighborhood || '');
    } else {
      setTitle('');
      setDescription('');
      setResponsibleId(availableUsers[0]?.id || '');
      setSelectedTeam([]);
      setAddress('');
      setNumber('');
      setNeighborhood('');
    }
  }, [editProject, isOpen, availableUsers]);

  if (!isOpen) return null;

  const toggleTeamMember = (userId: string) => {
    setSelectedTeam(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: editProject?.id,
      title,
      description,
      responsibleId,
      assignedUserIds: selectedTeam,
      status: editProject?.status || ProjectStatus.BACKLOG,
      tasks: editProject?.tasks || [],
      comments: editProject?.comments || [],
      address,
      number,
      neighborhood,
      updatedAt: new Date(),
      createdAt: editProject?.createdAt || new Date()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-300">
        <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex justify-between items-center shrink-0">
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">{editProject ? 'Editar' : 'Novo'} Projeto</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5 overflow-y-auto">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Título</label>
            <input 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-700 transition-all"
              placeholder="Ex: Projeto Elétrico Galpão 04"
            />
          </div>
          
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Objetivos</label>
            <textarea 
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none h-24 resize-none font-medium text-slate-600 transition-all"
              placeholder="Descreva o que deve ser feito..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Rua / Logradouro</label>
              <input 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none font-medium text-slate-700"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nº</label>
              <input 
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none font-medium text-slate-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Bairro</label>
            <input 
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none font-medium text-slate-700"
            />
          </div>
          
          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Líder Responsável</label>
              <select 
                value={responsibleId}
                onChange={(e) => setResponsibleId(e.target.value)}
                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-700 appearance-none transition-all"
              >
                {availableUsers.map(user => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Equipe Vinculada</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 border border-slate-100 rounded-2xl bg-slate-50/50">
                {availableUsers.map(user => (
                  <label key={user.id} className="flex items-center gap-3 p-2.5 hover:bg-white rounded-xl cursor-pointer transition-all border border-transparent hover:border-slate-200 group">
                    <input 
                      type="checkbox"
                      checked={selectedTeam.includes(user.id)}
                      onChange={() => toggleTeamMember(user.id)}
                      className="w-5 h-5 text-blue-600 rounded-lg border-slate-300 focus:ring-blue-500 transition-all"
                    />
                    <div className="flex items-center gap-2 overflow-hidden">
                      <img src={user.avatar} className="w-6 h-6 rounded-full border border-slate-200" alt="" />
                      <span className="text-xs font-bold text-slate-600 truncate group-hover:text-slate-900 transition-colors">{user.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          
          <div className="pt-6 flex flex-col sm:flex-row gap-3 shrink-0">
            <button type="button" onClick={onClose} className="w-full sm:flex-1 px-6 py-3.5 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-2xl transition-all">
              Cancelar
            </button>
            <button type="submit" className="w-full sm:flex-1 px-6 py-3.5 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-[0.98]">
              {editProject ? 'Salvar Projeto' : 'Confirmar Criação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectModal;
