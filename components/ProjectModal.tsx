
import React, { useState, useEffect } from 'react';
import { Project, ProjectStatus, User, Task, TaskStage } from '../types';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Partial<Project>) => void;
  onDelete?: (id: string) => void;
  availableUsers: User[];
  editProject?: Project | null;
  currentUser?: User | null;
}

const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, onSave, onDelete, availableUsers, editProject, currentUser }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [responsibleId, setResponsibleId] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [status, setStatus] = useState<ProjectStatus>(ProjectStatus.BACKLOG);
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskStage, setNewTaskStage] = useState<TaskStage>(TaskStage.SURVEY);
  const [newTaskResponsibleId, setNewTaskResponsibleId] = useState('');

  useEffect(() => {
    const firstUserId = availableUsers[0]?.id || '';
    if (editProject) {
      setTitle(editProject.title);
      setDescription(editProject.description);
      setResponsibleId(editProject.responsibleId);
      setAddress(editProject.address || '');
      setNeighborhood(editProject.neighborhood || '');
      setTasks(editProject.tasks || []);
      setStatus(editProject.status);
      setNewTaskResponsibleId(firstUserId);
    } else {
      setTitle('');
      setDescription('');
      setResponsibleId(firstUserId);
      setNewTaskResponsibleId(firstUserId);
      setAddress('');
      setNeighborhood('');
      setTasks([]);
      setStatus(ProjectStatus.BACKLOG);
    }
  }, [editProject, isOpen, availableUsers]);

  if (!isOpen) return null;

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    
    const respId = newTaskResponsibleId || availableUsers[0]?.id;
    if (!respId) return;

    const task: Task = {
      id: Math.random().toString(36).substr(2,9),
      title: newTaskTitle,
      completed: false,
      stage: newTaskStage,
      responsibleId: respId,
      observations: ''
    };
    setTasks([task, ...tasks]);
    setNewTaskTitle('');
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: editProject?.id,
      title,
      description,
      responsibleId,
      assignedUserIds: Array.from(new Set([responsibleId, ...tasks.map(t => t.responsibleId)])),
      status,
      tasks,
      address,
      neighborhood,
      updatedAt: new Date(),
      createdAt: editProject?.createdAt || new Date()
    });
  };

  const handleDelete = () => {
    if (editProject && onDelete) {
      if (window.confirm("Deseja realmente excluir este projeto permanentemente?")) {
        onDelete(editProject.id);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col max-h-[92vh] font-['Segoe_UI'] border border-slate-200">
        <header className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{editProject ? 'Editar Estrutura do Projeto' : 'Nova Estrutura de Projeto'}</h2>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">CONFIGURAÇÃO DE ETAPAS PONDERADAS</p>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:text-red-500 rounded-2xl hover:bg-red-50 transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </header>
        
        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* COLUNA ESQUERDA - INFORMAÇÕES E GOVERNANÇA */}
            <div className="space-y-12 text-left">
              <section className="space-y-8">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center font-black">1</div>
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">INFORMAÇÕES ESSENCIAIS</h3>
                </div>
                
                <div className="space-y-6">
                   <div>
                     <label className="block text-[11px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">NOME DA OBRA / PROJETOS</label>
                     <input required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm" />
                   </div>
                   <div>
                     <label className="block text-[11px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">ESCOPO E DETALHES</label>
                     <textarea required value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] font-medium text-slate-700 h-44 resize-none outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm" />
                   </div>
                   <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">LOGRADOURO</label>
                        <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold shadow-sm" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">BAIRRO</label>
                        <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold shadow-sm" />
                      </div>
                   </div>
                </div>
              </section>

              <section className="space-y-8">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center font-black">2</div>
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">GOVERNANÇA</h3>
                </div>
                <div className="grid grid-cols-2 gap-8">
                   <div>
                     <label className="block text-[11px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">COORDENAÇÃO GERAL</label>
                     <select value={responsibleId} onChange={(e) => setResponsibleId(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold outline-none cursor-pointer">
                       {availableUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="block text-[11px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">CLASSIFICAÇÃO</label>
                     <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold outline-none cursor-pointer">
                       {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                     </select>
                   </div>
                </div>
              </section>
            </div>

            {/* COLUNA DIREITA - CRONOGRAMA DE TAREFAS */}
            <div className="bg-[#f1f5f9] p-10 rounded-[3rem] border border-slate-200 flex flex-col shadow-inner max-h-[70vh]">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black shadow-lg shadow-blue-100">3</div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">CRONOGRAMA DE TAREFAS (PROPORCIONAL)</h3>
              </div>
              
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 mb-10 space-y-6">
                 <input 
                    value={newTaskTitle} 
                    onChange={(e) => setNewTaskTitle(e.target.value)} 
                    placeholder="O que precisa ser feito?" 
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.2rem] text-sm font-bold outline-none focus:bg-white focus:border-blue-500 transition-all" 
                 />
                 
                 <div className="grid grid-cols-2 gap-4">
                    <select value={newTaskStage} onChange={(e) => setNewTaskStage(e.target.value as TaskStage)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.2rem] text-[11px] font-black uppercase outline-none">
                       {Object.values(TaskStage).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={newTaskResponsibleId} onChange={(e) => setNewTaskResponsibleId(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.2rem] text-[11px] font-bold outline-none">
                       {availableUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                 </div>

                 <button 
                    type="button" 
                    onClick={addTask} 
                    className="w-full py-5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-[1.2rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-[0_8px_20px_rgba(37,99,235,0.3)] hover:from-blue-700 transition-all active:scale-[0.98]"
                 >
                    VINCULAR ATIVIDADE À OBRA
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar text-left">
                 {Object.values(TaskStage).map(stage => {
                    const stageTasks = tasks.filter(t => t.stage === stage);
                    return (
                       <div key={stage} className="space-y-4">
                          <div className="flex items-center justify-between px-2">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stage}</span>
                             <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-3 py-1 rounded-lg uppercase">{stageTasks.length} ATIVOS</span>
                          </div>
                          
                          <div className="space-y-3">
                             {stageTasks.map(t => (
                                <div key={t.id} className="group flex flex-col p-5 bg-white border border-slate-200 rounded-[1.8rem] hover:border-blue-400 transition-all shadow-sm">
                                   <div className="flex items-center justify-between">
                                      <div className="flex flex-col">
                                         <span className="text-xs font-bold text-slate-800">{t.title}</span>
                                         <span className="text-[9px] text-blue-500 font-black uppercase tracking-widest">{availableUsers.find(u => u.id === t.responsibleId)?.name}</span>
                                      </div>
                                      <button type="button" onClick={() => removeTask(t.id)} className="p-2 text-slate-300 hover:text-red-500 transition-all">
                                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                                      </button>
                                   </div>
                                </div>
                             ))}
                             {stageTasks.length === 0 && (
                                <div className="p-10 border-2 border-dashed border-slate-200 rounded-[2rem] text-center text-[10px] font-black text-slate-300 uppercase tracking-widest bg-white/50">
                                   AGUARDANDO DEFINIÇÃO
                                </div>
                             )}
                          </div>
                       </div>
                    );
                 })}
              </div>
            </div>
          </div>
        </div>

        <footer className="px-10 py-8 border-t border-slate-100 bg-white flex justify-between items-center shrink-0">
          <div>
            {editProject && currentUser?.isAdmin && (
              <button 
                type="button" 
                onClick={handleDelete}
                className="px-8 py-4 text-red-500 font-black uppercase text-[10px] tracking-widest hover:bg-red-50 rounded-2xl transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                EXCLUIR OBRA
              </button>
            )}
          </div>
          <div className="flex gap-4">
            <button type="button" onClick={onClose} className="px-8 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-2xl transition-all">CANCELAR</button>
            <button 
              onClick={handleSubmit} 
              className="px-16 py-5 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-black uppercase text-[11px] tracking-[0.2em] rounded-[1.2rem] shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-95 transition-all"
            >
              SALVAR E PUBLICAR OBRA
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ProjectModal;
