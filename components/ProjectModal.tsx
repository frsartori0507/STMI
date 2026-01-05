
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
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [status, setStatus] = useState<ProjectStatus>(ProjectStatus.BACKLOG);
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskStage, setNewTaskStage] = useState<TaskStage>(TaskStage.SURVEY);

  useEffect(() => {
    if (editProject) {
      setTitle(editProject.title);
      setDescription(editProject.description);
      setResponsibleId(editProject.responsibleId);
      setSelectedTeam(editProject.assignedUserIds || []);
      setAddress(editProject.address || '');
      setNeighborhood(editProject.neighborhood || '');
      setTasks(editProject.tasks || []);
      setStatus(editProject.status);
    } else {
      setTitle('');
      setDescription('');
      setResponsibleId(availableUsers[0]?.id || '');
      setSelectedTeam([]);
      setAddress('');
      setNeighborhood('');
      setTasks([]);
      setStatus(ProjectStatus.BACKLOG);
    }
  }, [editProject, isOpen, availableUsers]);

  if (!isOpen) return null;

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    const task: Task = {
      id: Math.random().toString(36).substr(2,9),
      title: newTaskTitle,
      completed: false,
      stage: newTaskStage
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
      assignedUserIds: selectedTeam,
      status,
      tasks,
      comments: editProject?.comments || [],
      address,
      neighborhood,
      updatedAt: new Date(),
      createdAt: editProject?.createdAt || new Date()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh] font-['Segoe_UI']">
        <header className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-lg font-bold text-[#1a1a1a] tracking-tight">{editProject ? 'Editar' : 'Cadastrar'} Projeto</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </header>
        
        <div className="flex-1 overflow-y-auto p-8 bg-white">
          <form id="projectForm" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <section>
                <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                   Informações Principais
                </h3>
                <div className="space-y-5">
                   <div>
                     <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Título do Projeto</label>
                     <input required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:border-[#0078d4] outline-none transition-all" />
                   </div>
                   <div>
                     <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Descrição Detalhada</label>
                     <textarea required value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 h-32 resize-none outline-none focus:bg-white" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Endereço / Local</label>
                        <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Bairro</label>
                        <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" />
                      </div>
                   </div>
                </div>
              </section>

              <section>
                <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                   Equipe Responsável
                </h3>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Líder (R1)</label>
                     <select value={responsibleId} onChange={(e) => setResponsibleId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none">
                       {availableUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Status Atual</label>
                     <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none">
                       {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                     </select>
                   </div>
                </div>
              </section>
            </div>

            <div className="bg-[#f9f9f9] p-8 rounded-2xl border border-slate-100 flex flex-col">
              <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                 Tarefas por Etapa
              </h3>
              
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-8 space-y-4">
                 <div className="flex gap-2">
                    <input 
                      value={newTaskTitle} 
                      onChange={(e) => setNewTaskTitle(e.target.value)} 
                      placeholder="Nome da tarefa..." 
                      className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:border-[#0078d4]" 
                    />
                    <select value={newTaskStage} onChange={(e) => setNewTaskStage(e.target.value as TaskStage)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase outline-none">
                       {Object.values(TaskStage).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
                 <button type="button" onClick={addTask} className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-md">
                    Adicionar Tarefa
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
                 {Object.values(TaskStage).map(stage => {
                    const stageTasks = tasks.filter(t => t.stage === stage);
                    return (
                       <div key={stage} className="space-y-3">
                          <div className="flex items-center justify-between">
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stage}</span>
                             <span className="text-[8px] font-bold text-slate-300">{stageTasks.length} TAREFAS</span>
                          </div>
                          <div className="space-y-2">
                             {stageTasks.map(t => (
                                <div key={t.id} className="group flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-red-100 transition-all">
                                   <span className="text-[11px] font-bold text-slate-700">{t.title}</span>
                                   <button type="button" onClick={() => removeTask(t.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                                   </button>
                                </div>
                             ))}
                             {stageTasks.length === 0 && <div className="p-4 border-2 border-dashed border-slate-100 rounded-2xl text-center text-[9px] font-bold text-slate-300 uppercase">Vazio</div>}
                          </div>
                       </div>
                    );
                 })}
              </div>
            </div>
          </form>
        </div>

        <footer className="px-8 py-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-2.5 text-slate-500 font-bold uppercase text-[10px] tracking-widest hover:bg-white rounded-xl transition-all">Cancelar</button>
          <button form="projectForm" type="submit" className="px-10 py-2.5 bg-[#0078d4] text-white font-bold uppercase text-[10px] tracking-widest rounded-xl shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-95 transition-all">
            Salvar Alterações
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ProjectModal;
