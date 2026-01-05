
import React, { useState, useEffect, useMemo } from 'react';
import { Project, ProjectStatus, Comment, Task, User, TaskStage, AgendaItem } from './types';
import { STATUS_COLORS } from './constants';
import ProjectCard from './components/ProjectCard';
import ProjectModal from './components/ProjectModal';
import UserModal from './components/UserModal';
import LoginScreen from './components/LoginScreen';
import AgendaCalendar from './components/AgendaCalendar';
import { getProjectInsights } from './services/geminiService';
import { db } from './services/db';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [view, setView] = useState<'PROJECTS' | 'CALENDAR' | 'USERS'>('PROJECTS');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
  
  const [modalProject, setModalProject] = useState(false);
  const [modalUser, setModalUser] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [chatMsg, setChatMsg] = useState('');

  const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);

  const loadAll = async () => {
    const [u, p, a] = await Promise.all([db.getUsers(), db.getProjects(), db.getAgenda()]);
    setUsers(u);
    setProjects(p);
    setAgenda(a);
  };

  useEffect(() => {
    const init = async () => {
      const session = await db.getSession();
      if (session) setCurrentUser(session);
      await loadAll();
      setLoading(false);
    };
    init();
  }, []);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const success = await db.importDatabase(file);
      if (success) {
        await loadAll();
        showToast("Dados da rede carregados!", "success");
      } else {
        showToast("Erro no arquivo .stmi", "error");
      }
    }
  };

  const copyPath = () => {
    navigator.clipboard.writeText(db.getDbPath());
    showToast("Caminho copiado para a área de transferência", "success");
  };

  const onSaveProject = async (data: Partial<Project>) => {
    const project = data.id 
      ? { ...projects.find(p => p.id === data.id)!, ...data as Project }
      : { ...data as Project, id: Math.random().toString(36).substr(2,9), tasks: [], comments: [], createdAt: new Date(), updatedAt: new Date() };
    
    await db.saveProject(project);
    await loadAll();
  };

  const handleTaskToggle = async (taskId: string) => {
    if (!selectedProject) return;
    const updated = {
      ...selectedProject,
      tasks: selectedProject.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
    };
    await onSaveProject(updated);
  };

  const handleAddChat = async () => {
    if (!selectedProject || !chatMsg.trim() || !currentUser) return;
    const comment: Comment = {
      id: Math.random().toString(36).substr(2,9),
      projectId: selectedProject.id,
      authorId: currentUser.id,
      authorName: currentUser.name,
      content: chatMsg,
      timestamp: new Date()
    };
    await onSaveProject({ ...selectedProject, comments: [...selectedProject.comments, comment] });
    setChatMsg('');
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0f172a] text-white">
      <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-3xl font-black mb-4 animate-bounce shadow-2xl shadow-blue-500/20">S</div>
      <div className="text-[10px] font-black tracking-[0.3em] uppercase opacity-50">STMI Engine v5.2</div>
    </div>
  );

  if (!currentUser) return <LoginScreen onLoginSuccess={setCurrentUser} />;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <aside className="w-72 bg-slate-900 flex flex-col shrink-0 text-slate-400">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">S</div>
            <div className="flex flex-col">
              <span className="text-white font-black text-lg leading-none">STMI</span>
              <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">Infraestrutura</span>
            </div>
          </div>

          <nav className="space-y-1">
            <button onClick={() => { setView('PROJECTS'); setSelectedProjectId(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${view === 'PROJECTS' && !selectedProjectId ? 'bg-blue-600 text-white shadow-lg shadow-blue-900' : 'hover:bg-slate-800 hover:text-white'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
              Projetos
            </button>
            <button onClick={() => { setView('CALENDAR'); setSelectedProjectId(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${view === 'CALENDAR' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900' : 'hover:bg-slate-800 hover:text-white'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              Agenda
            </button>
            <button onClick={() => { setView('USERS'); setSelectedProjectId(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${view === 'USERS' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900' : 'hover:bg-slate-800 hover:text-white'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              Equipe
            </button>
          </nav>
        </div>

        <div className="mt-auto p-6 space-y-4">
          <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-50 block mb-3">Banco Access (Rede)</span>
            <div className="text-[9px] font-bold text-slate-500 break-all bg-black/20 p-2 rounded-lg mb-3 cursor-pointer hover:text-white transition-colors" onClick={copyPath}>
              {db.getDbPath()}
            </div>
            <div className="space-y-2">
              <button onClick={() => db.exportDatabase()} className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border border-blue-600/30">Exportar (.stmi)</button>
              <label className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all block text-center cursor-pointer">
                Importar Dados
                <input type="file" accept=".stmi" className="hidden" onChange={handleImport} />
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-2xl border border-slate-700/50">
            <img src={currentUser.avatar} className="w-9 h-9 rounded-xl border border-slate-600" alt="" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black text-white truncate">{currentUser.name}</div>
              <div className="text-[10px] font-bold opacity-40 truncate uppercase">{currentUser.role}</div>
            </div>
            <button onClick={() => db.clearSession().then(() => setCurrentUser(null))} className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7"/></svg>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {toast && (
          <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl animate-in slide-in-from-top ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
            {toast.msg}
          </div>
        )}

        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
             {selectedProject ? selectedProject.title : view === 'PROJECTS' ? 'Dashboard' : view === 'CALENDAR' ? 'Agenda' : 'Equipe'}
          </h2>
          {view === 'PROJECTS' && !selectedProject && (
            <button onClick={() => { setEditingProject(null); setModalProject(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 transition-all active:scale-95">
              Novo Projeto
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
           {selectedProject ? (
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-10">
                 <div className="lg:col-span-3 space-y-8">
                    <button onClick={() => setSelectedProjectId(null)} className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase hover:text-blue-600 transition-all">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
                       Voltar ao Dashboard
                    </button>
                    
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm">
                       <h3 className="text-3xl font-black text-slate-900 mb-4">{selectedProject.title}</h3>
                       <p className="text-slate-500 font-medium leading-relaxed mb-10">{selectedProject.description}</p>
                       
                       <div className="space-y-10">
                          {Object.values(TaskStage).map(stage => (
                             <div key={stage} className="space-y-4">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{stage}</h4>
                                <div className="space-y-2">
                                   {selectedProject.tasks.filter(t => t.stage === stage).map(task => (
                                      <div key={task.id} onClick={() => handleTaskToggle(task.id)} className={`flex items-center gap-4 p-5 rounded-2xl border cursor-pointer transition-all ${task.completed ? 'bg-emerald-50/40 border-emerald-100 opacity-60' : 'bg-white border-slate-100 hover:border-blue-200'}`}>
                                         <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                                            {task.completed && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="4"/></svg>}
                                         </div>
                                         <span className={`font-bold ${task.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</span>
                                      </div>
                                   ))}
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>

                 <div className="lg:col-span-1">
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl flex flex-col h-[600px] lg:sticky lg:top-10 overflow-hidden">
                       <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                          <h4 className="font-black text-slate-900 uppercase text-[10px] tracking-widest">Chat da Equipe</h4>
                       </div>
                       <div className="flex-1 overflow-y-auto p-6 space-y-4">
                          {selectedProject.comments.map(c => (
                            <div key={c.id} className={`flex flex-col ${c.authorId === currentUser.id ? 'items-end' : 'items-start'}`}>
                               <div className={`max-w-[90%] p-4 rounded-2xl text-xs font-bold ${c.authorId === currentUser.id ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-700 rounded-tl-none'}`}>
                                  {c.content}
                               </div>
                               <span className="text-[8px] font-bold text-slate-300 mt-1 uppercase">{c.authorName}</span>
                            </div>
                          ))}
                       </div>
                       <div className="p-6 border-t border-slate-100 flex gap-2">
                          <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAddChat()} placeholder="Mensagem..." className="flex-1 px-4 py-3 bg-slate-100 rounded-xl text-xs font-bold outline-none focus:bg-white transition-all" />
                          <button onClick={handleAddChat} className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                          </button>
                       </div>
                    </div>
                 </div>
              </div>
           ) : view === 'PROJECTS' ? (
              <div className="max-w-7xl mx-auto space-y-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-20">
                    {projects.map(p => <ProjectCard key={p.id} project={p} responsible={users.find(u => u.id === p.responsibleId)} onClick={p => setSelectedProjectId(p.id)} />)}
                 </div>
              </div>
           ) : view === 'CALENDAR' ? (
              <div className="max-w-7xl mx-auto h-[800px]">
                 <AgendaCalendar currentUser={currentUser} users={users} agenda={agenda} onSaveItem={async i => { await db.saveAgendaItem(i); await loadAll(); }} onDeleteItem={async id => { await db.deleteAgendaItem(id); await loadAll(); }} />
              </div>
           ) : (
              <div className="max-w-7xl mx-auto bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
                 <h3 className="text-xl font-black text-slate-800 mb-8">Equipe STMI</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {users.map(u => (
                       <div key={u.id} className="p-6 bg-slate-50 rounded-3xl flex items-center gap-4 border border-transparent hover:border-slate-200 transition-all cursor-default">
                          <img src={u.avatar} className="w-14 h-14 rounded-2xl border-2 border-white shadow-sm" alt="" />
                          <div>
                             <div className="text-sm font-black text-slate-800">{u.name}</div>
                             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{u.role}</div>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           )}
        </div>
      </main>

      <ProjectModal isOpen={modalProject} onClose={() => setModalProject(false)} onSave={onSaveProject} availableUsers={users} editProject={editingProject} />
      <UserModal isOpen={modalUser} onClose={() => setModalUser(false)} onSave={async u => { await db.saveUser(u); await loadAll(); }} />
    </div>
  );
};

export default App;
