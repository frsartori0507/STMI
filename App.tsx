
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Project, ProjectStatus, Notification, Comment, Task, User, TaskStage, AgendaItem } from './types';
import { STATUS_COLORS, STAGE_WEIGHTS, STAGE_COLORS } from './constants';
import ProjectCard from './components/ProjectCard';
import ProjectModal from './components/ProjectModal';
import UserModal from './components/UserModal';
import LoginScreen from './components/LoginScreen';
import AgendaCalendar from './components/AgendaCalendar';
import { getProjectInsights } from './services/geminiService';
import { db } from './services/db';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [dbStatus, setDbStatus] = useState<'CONNECTED' | 'SYNCING' | 'SAVED' | 'CLOUD_ERROR'>('CONNECTED');
  const [activeView, setActiveView] = useState<'PROJECTS' | 'CALENDAR'>('PROJECTS');
  
  const [cloudUrl, setCloudUrl] = useState<string>(db.getCloudUrl() || '');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [newComment, setNewComment] = useState('');
  const [targetUserId, setTargetUserId] = useState<string | 'ALL'>('ALL');
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskStage, setNewTaskStage] = useState<TaskStage>(TaskStage.SURVEY);
  
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

  const stats = useMemo(() => ({
    total: projects.length,
    members: users.length,
    [ProjectStatus.BACKLOG]: projects.filter(p => p.status === ProjectStatus.BACKLOG).length,
    [ProjectStatus.IN_PROGRESS]: projects.filter(p => p.status === ProjectStatus.IN_PROGRESS).length,
    [ProjectStatus.REVIEW]: projects.filter(p => p.status === ProjectStatus.REVIEW).length,
    [ProjectStatus.COMPLETED]: projects.filter(p => p.status === ProjectStatus.COMPLETED).length,
  }), [projects, users]);

  const loadAllData = async (fromCloud = false) => {
    setDbStatus('SYNCING');
    try {
      if (fromCloud) {
        const cloudData = await db.fetchFromCloud();
        if (cloudData) await db.importData(cloudData);
      }
      const [allUsers, allProjects, allAgenda] = await Promise.all([
        db.getUsers(),
        db.getProjects(),
        db.getAgenda()
      ]);
      setUsers(allUsers);
      setProjects(allProjects);
      setAgenda(allAgenda);
      setDbStatus('SAVED');
      setTimeout(() => setDbStatus('CONNECTED'), 1500);
    } catch (e) {
      setDbStatus('CLOUD_ERROR');
      notify('Erro de Sincronização', 'Não foi possível carregar os dados do GitHub.');
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    loadAllData(!!db.getCloudUrl());
    const handleResize = () => { if (window.innerWidth < 1024) setIsSidebarOpen(false); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSaveCloudConfig = async () => {
    db.setCloudUrl(cloudUrl.trim() || null);
    setIsSyncModalOpen(false);
    await loadAllData(!!cloudUrl.trim());
  };

  const handleLogout = async () => {
    await db.clearSession();
    setCurrentUser(null);
    setSelectedProject(null);
  };

  const notify = useCallback((title: string, message: string) => {
    const newNotification: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      title, message, timestamp: new Date(), read: false
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const updateProjectInDB = async (updated: Project) => {
    setDbStatus('SYNCING');
    try {
      const saved = await db.saveProject(updated);
      setProjects(prev => prev.map(p => p.id === saved.id ? saved : p));
      if (selectedProject?.id === saved.id) setSelectedProject(saved);
      setDbStatus('SAVED');
      setTimeout(() => setDbStatus('CONNECTED'), 1500);
    } catch (e) {
      setDbStatus('CONNECTED');
    }
  };

  const handleStatusChange = (newStatus: ProjectStatus) => {
    if (!selectedProject) return;
    updateProjectInDB({ ...selectedProject, status: newStatus });
    notify('Status Alterado', `Projeto movido para ${newStatus}.`);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newTaskTitle.trim()) return;
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTaskTitle, completed: false, stage: newTaskStage,
      responsibleId: selectedProject.responsibleId
    };
    updateProjectInDB({ ...selectedProject, tasks: [...selectedProject.tasks, newTask] });
    setNewTaskTitle('');
  };

  const handleAddComment = () => {
    if (!selectedProject || !newComment.trim() || !currentUser) return;
    const comment: Comment = {
      id: Math.random().toString(36).substr(2, 9),
      projectId: selectedProject.id, authorId: currentUser.id,
      authorName: currentUser.name, content: newComment, timestamp: new Date(),
      targetUserId: targetUserId === 'ALL' ? undefined : targetUserId
    };
    updateProjectInDB({ ...selectedProject, comments: [...selectedProject.comments, comment] });
    setNewComment('');
  };

  const toggleTask = (taskId: string) => {
    if (!selectedProject) return;
    const updatedTasks = selectedProject.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date() : undefined } : t);
    updateProjectInDB({ ...selectedProject, tasks: updatedTasks });
  };

  const handleSaveProject = async (data: Partial<Project>) => {
    setDbStatus('SYNCING');
    const projectToSave = data.id 
      ? { ...projects.find(p => p.id === data.id)!, ...data as Project }
      : { ...data as Project, id: Math.random().toString(36).substr(2, 9), tasks: [], comments: [], createdAt: new Date(), updatedAt: new Date() };
    const saved = await db.saveProject(projectToSave);
    setProjects(await db.getProjects());
    if (selectedProject?.id === saved.id) setSelectedProject(saved);
    setDbStatus('SAVED');
    setTimeout(() => setDbStatus('CONNECTED'), 1500);
  };

  const handleSaveUser = async (user: User) => {
    setDbStatus('SYNCING');
    await db.saveUser(user);
    setUsers(await db.getUsers());
    setDbStatus('SAVED');
    setTimeout(() => setDbStatus('CONNECTED'), 1500);
  };

  const handleSaveAgendaItem = async (item: AgendaItem) => {
    setDbStatus('SYNCING');
    await db.saveAgendaItem(item);
    setAgenda(await db.getAgenda());
    setDbStatus('SAVED');
    setTimeout(() => setDbStatus('CONNECTED'), 1500);
  };

  if (isInitializing) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0f172a] p-4 text-center">
      <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-xl animate-bounce">S</div>
      <h2 className="mt-6 text-lg font-bold text-slate-400 animate-pulse uppercase tracking-widest">Iniciando Sistema...</h2>
    </div>
  );

  if (!currentUser) return <LoginScreen onLoginSuccess={setCurrentUser} />;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans relative">
      {isSidebarOpen && window.innerWidth < 1024 && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 lg:relative z-50 ${isSidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col overflow-hidden`}>
        <div className="p-6 border-b border-slate-100 min-w-[20rem]">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg ring-4 ring-blue-50">S</div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight">Projetos STMI</h1>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
            </div>
            <div className={`px-3 py-2 rounded-lg flex items-center justify-between border transition-all duration-500 ${dbStatus === 'SAVED' ? 'bg-emerald-50 border-emerald-200 shadow-sm' : dbStatus === 'CLOUD_ERROR' ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2 truncate">
                <div className={`w-2 h-2 rounded-full ${dbStatus === 'CONNECTED' ? 'bg-blue-500' : dbStatus === 'SYNCING' ? 'bg-amber-500 animate-pulse' : dbStatus === 'CLOUD_ERROR' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                <span className={`text-[9px] font-black uppercase tracking-widest truncate ${dbStatus === 'SAVED' ? 'text-emerald-700' : dbStatus === 'CLOUD_ERROR' ? 'text-red-700' : 'text-slate-500'}`}>
                  {dbStatus === 'SAVED' ? 'GRAVADO' : dbStatus === 'SYNCING' ? 'SINCRONIZANDO...' : dbStatus === 'CLOUD_ERROR' ? 'ERRO NUVEM' : db.getCloudUrl() ? 'GITHUB SYNC' : 'DATABASE LOCAL'}
                </span>
              </div>
              <button onClick={() => setIsSyncModalOpen(true)} className="p-1 text-blue-600 hover:bg-blue-100 rounded-md transition-all">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/></svg>
              </button>
            </div>
          </div>
          
          <nav className="space-y-1.5">
            <button onClick={() => { setSelectedProject(null); setActiveView('PROJECTS'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${!selectedProject && activeView === 'PROJECTS' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
              Dashboard
            </button>
            <button onClick={() => { setSelectedProject(null); setActiveView('CALENDAR'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${activeView === 'CALENDAR' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              Agenda Equipe
            </button>
            <button onClick={() => { setEditingProject(null); setIsProjectModalOpen(true); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-blue-600 rounded-xl font-bold text-sm transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
              Novo Projeto
            </button>
          </nav>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 min-w-[20rem]">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5">Manutenção</h2>
          <div className="space-y-2 mb-8">
             <button onClick={() => db.exportData()} className="w-full flex items-center gap-3 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-[10px] font-black uppercase text-slate-600 tracking-wider border border-slate-200">
               <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
               Exportar JSON
             </button>
             {db.getCloudUrl() && (
                <button onClick={() => loadAllData(true)} className="w-full flex items-center gap-3 px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-xl text-[10px] font-black uppercase text-blue-700 tracking-wider border border-blue-200">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  Puxar do GitHub
                </button>
             )}
          </div>

          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5">Equipe Ativa</h2>
          <div className="space-y-4">
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img src={user.avatar} className="w-9 h-9 rounded-full border border-slate-200" alt={user.name} />
                    <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${user.status === 'ATIVO' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-700 leading-tight truncate">{user.name}</div>
                    <div className="text-[10px] text-slate-400 font-medium truncate">{user.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <img src={currentUser.avatar} className="w-8 h-8 rounded-lg" alt="" />
              <div className="truncate"><div className="text-[10px] font-black truncate">{currentUser.name}</div></div>
            </div>
            <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg></button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden h-full">
        <header className="h-16 lg:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 z-20 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl lg:hidden">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">{selectedProject ? selectedProject.title : activeView === 'PROJECTS' ? 'Dashboard Geral' : 'Agenda'}</h2>
          </div>
          <div className="flex gap-2">
            {activeView === 'PROJECTS' && (
               <button onClick={() => { setEditingProject(null); setIsProjectModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-lg shadow-blue-100 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                Novo Projeto
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50/50">
          {selectedProject ? (
             <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
                <div className="lg:col-span-2 space-y-8">
                   <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                           <div className="flex items-center gap-2 mb-3">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase ${STATUS_COLORS[selectedProject.status]}`}>{selectedProject.status}</span>
                              <h1 className="text-3xl font-black text-slate-800">{selectedProject.title}</h1>
                           </div>
                           <p className="text-slate-500">{selectedProject.description}</p>
                        </div>
                        <button onClick={() => setSelectedProject(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg></button>
                      </div>
                      
                      <div className="space-y-8">
                         <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <h3 className="text-xl font-black text-slate-800">Células de Trabalho</h3>
                            <select value={selectedProject.status} onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)} className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 outline-none">
                               {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                         </div>
                         <form onSubmit={handleAddTask} className="flex gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-100">
                            <input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Nova tarefa..." className="flex-1 px-4 py-2 bg-white rounded-xl text-sm border-none outline-none focus:ring-2 focus:ring-blue-100" />
                            <select value={newTaskStage} onChange={(e) => setNewTaskStage(e.target.value as TaskStage)} className="px-4 py-2 bg-white rounded-xl text-xs font-bold text-slate-600 border-none outline-none">
                               {Object.values(TaskStage).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button type="submit" className="px-6 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">OK</button>
                         </form>
                         <div className="space-y-6">
                            {Object.values(TaskStage).map(stage => (
                               <div key={stage} className="space-y-3">
                                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{stage}</h4>
                                  <div className="space-y-2">
                                     {selectedProject.tasks.filter(t => t.stage === stage).map(task => (
                                        <div key={task.id} className={`flex items-center gap-4 p-4 rounded-2xl border ${task.completed ? 'bg-emerald-50/20 border-emerald-100' : 'bg-white border-slate-100'}`}>
                                           <div onClick={() => toggleTask(task.id)} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                                              {task.completed && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3"/></svg>}
                                           </div>
                                           <span className={`text-sm font-bold ${task.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</span>
                                        </div>
                                     ))}
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
                <div className="lg:sticky lg:top-8 h-fit">
                   <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[600px]">
                      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                         <h3 className="text-base font-black text-slate-800">Mensagens Equipe</h3>
                         <select value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="text-[9px] bg-white border border-slate-200 rounded-lg px-2 py-1 font-black">
                            <option value="ALL">Geral</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name.split(' ')[0]}</option>)}
                         </select>
                      </div>
                      <div className="flex-1 overflow-y-auto p-5 space-y-4">
                         {selectedProject.comments.map(c => (
                            <div key={c.id} className={`flex ${c.authorId === currentUser?.id ? 'justify-end' : 'justify-start'}`}>
                               <div className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium ${c.authorId === currentUser?.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                                  <div className="text-[8px] font-black uppercase mb-1 opacity-70">{c.authorName}</div>
                                  {c.content}
                               </div>
                            </div>
                         ))}
                      </div>
                      <div className="p-4 border-t border-slate-100 flex gap-2">
                         <input value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddComment()} placeholder="Enviar para equipe..." className="flex-1 px-4 py-2 bg-slate-50 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" />
                         <button onClick={handleAddComment} className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg></button>
                      </div>
                   </div>
                </div>
             </div>
          ) : activeView === 'CALENDAR' ? (
             <div className="max-w-7xl mx-auto h-[calc(100vh-14rem)]">
                <AgendaCalendar currentUser={currentUser} users={users} agenda={agenda} onSaveItem={handleSaveAgendaItem} onDeleteItem={() => {}} />
             </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-8">
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-6">
                {[
                  { label: 'Projetos', val: stats.total },
                  { label: 'Membros', val: stats.members },
                  { label: 'Backlog', val: stats[ProjectStatus.BACKLOG] },
                  { label: 'Andamento', val: stats[ProjectStatus.IN_PROGRESS] },
                  { label: 'Revisão', val: stats[ProjectStatus.REVIEW] },
                  { label: 'Concluídos', val: stats[ProjectStatus.COMPLETED] }
                ].map((item, i) => (
                  <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</span>
                    <span className="text-3xl font-black text-slate-800">{item.val}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {projects.map(p => <ProjectCard key={p.id} project={p} responsible={users.find(u => u.id === p.responsibleId)} onClick={setSelectedProject} />)}
              </div>
            </div>
          )}
        </div>

        {isSyncModalOpen && (
           <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl animate-in zoom-in-95">
                 <h3 className="text-2xl font-black text-slate-800 mb-2">Sincronização com GitHub</h3>
                 <p className="text-slate-500 text-sm mb-8 leading-relaxed">Insira o link <b>Raw JSON</b> do seu banco de dados hospedado no GitHub para ler os dados da equipe centralizadamente.</p>
                 <div className="space-y-4">
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">GitHub Raw URL (JSON)</label>
                       <input 
                         value={cloudUrl} 
                         onChange={(e) => setCloudUrl(e.target.value)}
                         className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 font-medium text-xs text-slate-600"
                         placeholder="https://raw.githubusercontent.com/.../bd.json"
                       />
                    </div>
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                       <p className="text-[10px] text-blue-700 font-bold leading-relaxed">Nota: Para gravar dados no GitHub automaticamente, use a opção "Exportar JSON" na barra lateral e faça o upload manual no repositório.</p>
                    </div>
                 </div>
                 <div className="mt-10 flex gap-4">
                    <button onClick={() => setIsSyncModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                    <button onClick={handleSaveCloudConfig} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-100">Conectar e Sincronizar</button>
                 </div>
              </div>
           </div>
        )}
      </main>

      <ProjectModal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} onSave={handleSaveProject} availableUsers={users} />
      <UserModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} onSave={handleSaveUser} />
    </div>
  );
};

export default App;
