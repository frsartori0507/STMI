
import React, { useState, useEffect } from 'react';
import { Project, ProjectStatus, User, Task, TaskStage } from '../types';

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
    if (!newTaskTitle.trim() || !newTaskResponsibleId) return;
    const task: Task = {
      id: Math.random().toString(36).substr(2,9),
      title: newTaskTitle,
      completed: false,
      stage: newTaskStage,
      responsibleId: newTaskResponsibleId
    };
    setTasks([...tasks, task]);
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
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col max-h-[92vh] font-['Segoe_UI'] border border-slate-200">
        <header className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{editProject ? 'Editar Estrutura do' : 'Cadastrar Novo'} Projeto</h2>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">Configuração de Etapas Ponderadas</p>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:text-red-500 rounded-2xl hover:bg-red-50 transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </header>
        
        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
          <form id="projectForm" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-16 text-left">
            <div className="space-y-10">
              <section className="space-y-6">
                <div className="flex items-center gap-4">
                   <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-black">1</div>
                   <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Informações Essenciais</h3>
                </div>
                
                <div className="space-y-5">
                   <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Nome da Obra / Projeto</label>
                     <input required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-all shadow-sm" placeholder="Ex: Revitalização do Centro Comercial" />
                   </div>
                   <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Escopo e Detalhes</label>
                     <textarea required value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-slate-700 h-40 resize-none outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm" placeholder="Descreva os objetivos principais..." />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Logradouro</label>
                        <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Bairro Técnica</label>
                        <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold" />
                      </div>
                   </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-4">
                   <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-black">2</div>
                   <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Governança</h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                   <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Coordenação Geral</label>
                     <select value={responsibleId} onChange={(e) => setResponsibleId(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none cursor-pointer">
                       {availableUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Classificação</label>
                     <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none cursor-pointer">
                       {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                     </select>
                   </div>
                </div>
              </section>
            </div>

            <div className="bg-[#f8fafc] p-10 rounded-[3rem] border border-slate-100 flex flex-col shadow-inner">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black shadow-lg shadow-blue-100">3</div>
                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Cronograma de Tarefas (Proporcional)</h3>
              </div>
              
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/50 mb-10 space-y-5">
                 <input 
                    value={newTaskTitle} 
                    onChange={(e) => setNewTaskTitle(e.target.value)} 
                    placeholder="O que precisa ser feito?" 
                    className="w-full px-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:bg-white focus:border-blue-500 transition-all" 
                 />
                 <div className="grid grid-cols-2 gap-3">
                    <select value={newTaskStage} onChange={(e) => setNewTaskStage(e.target.value as TaskStage)} className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase outline-none">
                       {Object.values(TaskStage).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={newTaskResponsibleId} onChange={(e) => setNewTaskResponsibleId(e.target.value)} className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-bold outline-none">
                       {availableUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                 </div>
                 <button type="button" onClick={addTask} className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-50">
                    Vincular Atividade à Obra
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-10 pr-2 custom-scrollbar">
                 {Object.values(TaskStage).map(stage => {
                    const stageTasks = tasks.filter(t => t.stage === stage);
                    return (
                       <div key={stage} className="space-y-4">
                          <div className="flex items-center justify-between px-2">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stage}</span>
                             <span className="text-[9px] font-bold text-blue-400 bg-blue-50 px-3 py-1 rounded-lg">{stageTasks.length} ATIVOS</span>
                          </div>
                          <div className="space-y-3">
                             {stageTasks.map(t => {
                                const resp = availableUsers.find(u => u.id === t.responsibleId);
                                return (
                                  <div key={t.id} className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 transition-all shadow-sm">
                                     <div className="flex items-center gap-4">
                                       <img src={resp?.avatar} className="w-8 h-8 rounded-lg" />
                                       <div className="flex flex-col">
                                          <span className="text-xs font-bold text-slate-800">{t.title}</span>
                                          <span className="text-[9px] text-blue-500 font-black uppercase tracking-widest">{resp?.name}</span>
                                       </div>
                                     </div>
                                     <button type="button" onClick={() => removeTask(t.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                                     </button>
                                  </div>
                                );
                             })}
                             {stageTasks.length === 0 && <div className="p-6 border-2 border-dashed border-slate-200 rounded-[2rem] text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">Aguardando definição</div>}
                          </div>
                       </div>
                    );
                 })}
              </div>
            </div>
          </form>
        </div>

        <footer className="px-10 py-8 border-t border-slate-100 bg-white flex justify-end gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
          <button type="button" onClick={onClose} className="px-8 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
          <button form="projectForm" type="submit" className="px-12 py-4 bg-blue-600 text-white font-black uppercase text-[11px] tracking-[0.2em] rounded-2xl shadow-2xl shadow-blue-100 hover:scale-[1.02] active:scale-95 transition-all">
            Salvar e Publicar Obra
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ProjectModal;
