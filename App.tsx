
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
  const [dbStatus, setDbStatus] = useState<'CONNECTED' | 'SYNCING' | 'SAVED'>('CONNECTED');
  const [activeView, setActiveView] = useState<'PROJECTS' | 'CALENDAR'>('PROJECTS');
  
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

  const calculateWeightedProgress = (project: Project) => {
    if (!project.tasks || project.tasks.length === 0) return 0;
    let totalProgress = 0;
    Object.values(TaskStage).forEach(stage => {
      const stageTasks = project.tasks.filter(t => t.stage === stage);
      if (stageTasks.length > 0) {
        const completedInStage = stageTasks.filter(t => t.completed).length;
        totalProgress += (completedInStage / stageTasks.length) * STAGE_WEIGHTS[stage];
      }
    });
    return Math.round(totalProgress * 100);
  };

  const stats = useMemo(() => {
    return {
      total: projects.length,
      members: users.length,
      [ProjectStatus.BACKLOG]: projects.filter(p => p.status === ProjectStatus.BACKLOG).length,
      [ProjectStatus.IN_PROGRESS]: projects.filter(p => p.status === ProjectStatus.IN_PROGRESS).length,
      [ProjectStatus.REVIEW]: projects.filter(p => p.status === ProjectStatus.REVIEW).length,
      [ProjectStatus.COMPLETED]: projects.filter(p => p.status === ProjectStatus.COMPLETED).length,
    };
  }, [projects, users]);

  useEffect(() => {
    const loadData = async () => {
      setDbStatus('SYNCING');
      try {
        const [allUsers, allProjects, allAgenda] = await Promise.all([
          db.getUsers(),
          db.getProjects(),
          db.getAgenda()
        ]);
        setUsers(allUsers);
        setProjects(allProjects);
        setAgenda(allAgenda);
      } finally {
        setIsInitializing(false);
        setDbStatus('CONNECTED');
      }
    };
    loadData();
    
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    await db.clearSession();
    setCurrentUser(null);
    setSelectedProject(null);
  };

  const notify = useCallback((title: string, message: string) => {
    const newNotification: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      message,
      timestamp: new Date(),
      read: false
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const updateProjectInDB = async (updated: Project) => {
    setDbStatus('SYNCING');
    try {
      const saved = await db.saveProject(updated);
      setProjects(prev => prev.map(p => p.id === saved.id ? saved : p));
      if (selectedProject?.id === saved.id) {
        setSelectedProject(saved);
      }
      setDbStatus('SAVED');
      setTimeout(() => setDbStatus('CONNECTED'), 1500);
    } catch (e) {
      console.error("Erro ao salvar projeto:", e);
      setDbStatus('CONNECTED');
      alert("Erro ao sincronizar dados. Tente novamente.");
    }
  };

  const handleStatusChange = (newStatus: ProjectStatus) => {
    if (!selectedProject) return;
    const updated = { 
      ...selectedProject, 
      status: newStatus
    };
    updateProjectInDB(updated);
    notify('Status Alterado', `O projeto "${updated.title}" foi movido para ${newStatus}.`);
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newTaskTitle.trim()) return;
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTaskTitle,
      completed: false,
      stage: newTaskStage,
      responsibleId: selectedProject.responsibleId
    };
    const updated = {
      ...selectedProject,
      tasks: [...selectedProject.tasks, newTask]
    };
    updateProjectInDB(updated);
    setNewTaskTitle('');
    notify('Nova Atividade', `Tarefa adicionada na etapa ${newTaskStage}.`);
  };

  const handleAddComment = () => {
    if (!selectedProject || !newComment.trim() || !currentUser) return;
    const comment: Comment = {
      id: Math.random().toString(36).substr(2, 9),
      projectId: selectedProject.id,
      authorId: currentUser.id,
      authorName: currentUser.name,
      content: newComment,
      timestamp: new Date(),
      targetUserId: targetUserId === 'ALL' ? undefined : targetUserId
    };
    const updated = { 
      ...selectedProject, 
      comments: [...selectedProject.comments, comment]
    };
    updateProjectInDB(updated);
    setNewComment('');
  };

  const toggleTask = (taskId: string) => {
    if (!selectedProject) return;
    const updatedTasks = selectedProject.tasks.map(t => {
      if (t.id === taskId) {
        const isCompleted = !t.completed;
        return { 
          ...t, 
          completed: isCompleted,
          completedAt: isCompleted ? new Date() : undefined 
        };
      }
      return t;
    });
    const updated = { ...selectedProject, tasks: updatedTasks };
    updateProjectInDB(updated);
  };

  const handleSaveProject = async (data: Partial<Project>) => {
    setDbStatus('SYNCING');
    try {
      let projectToSave: Project;
      if (data.id) {
        const existing = projects.find(p => p.id === data.id)!;
        projectToSave = { ...existing, ...data as Project };
      } else {
        projectToSave = {
          ...data as Project,
          id: Math.random().toString(36).substr(2, 9),
          tasks: [],
          comments: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      const saved = await db.saveProject(projectToSave);
      const allProjects = await db.getProjects();
      setProjects(allProjects);
      if (selectedProject?.id === saved.id) setSelectedProject(saved);
      setDbStatus('SAVED');
      setTimeout(() => setDbStatus('CONNECTED'), 1500);
    } catch (e) {
      setDbStatus('CONNECTED');
    }
  };

  const handleSaveUser = async (user: User) => {
    setDbStatus('SYNCING');
    await db.saveUser(user);
    const allUsers = await db.getUsers();
    setUsers(allUsers);
    setDbStatus('SAVED');
    setTimeout(() => setDbStatus('CONNECTED'), 1500);
    notify('Equipe Atualizada', `Membro ${user.name} salvo.`);
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (window.confirm(`Remover ${userName} da equipe?`)) {
      setDbStatus('SYNCING');
      await db.deleteUser(userId);
      const allUsers = await db.getUsers();
      setUsers(allUsers);
      setDbStatus('SAVED');
      setTimeout(() => setDbStatus('CONNECTED'), 1500);
      notify('Membro Removido', `${userName} não faz mais parte da equipe.`);
    }
  };

  const handleSaveAgendaItem = async (item: AgendaItem) => {
    setDbStatus('SYNCING');
    await db.saveAgendaItem(item);
    const allAgenda = await db.getAgenda();
    setAgenda(allAgenda);
    setDbStatus('SAVED');
    setTimeout(() => setDbStatus('CONNECTED'), 1500);
    notify('Agenda Atualizada', `Compromisso "${item.title}" agendado.`);
  };

  const handleDeleteAgendaItem = async (id: string) => {
    setDbStatus('SYNCING');
    await db.deleteAgendaItem(id);
    const allAgenda = await db.getAgenda();
    setAgenda(allAgenda);
    setDbStatus('SAVED');
    setTimeout(() => setDbStatus('CONNECTED'), 1500);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      db.importData(content);
    };
    reader.readAsText(file);
  };

  const fetchAiInsight = async () => {
    if (!selectedProject) return;
    setIsLoadingInsight(true);
    try {
      const insight = await getProjectInsights(selectedProject);
      setAiInsight(insight);
    } catch (err) {
      setAiInsight("Erro ao analisar dados.");
    } finally {
      setIsLoadingInsight(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0f172a] font-sans p-4 text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-xl animate-bounce">S</div>
        <h2 className="mt-6 text-lg font-bold text-slate-400 animate-pulse uppercase tracking-widest">Acessando Banco de Dados...</h2>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={setCurrentUser} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans relative">
      {isSidebarOpen && window.innerWidth < 1024 && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 lg:relative z-50 ${isSidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col overflow-hidden`}>
        <div className="p-6 border-b border-slate-100 min-w-[20rem]">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg ring-4 ring-blue-50">S</div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight">Projetos STMI</h1>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            <div className={`px-3 py-2 rounded-lg flex items-center gap-2 border transition-all duration-500 ${dbStatus === 'SAVED' ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
              <div className={`w-2 h-2 rounded-full ${dbStatus === 'CONNECTED' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : dbStatus === 'SYNCING' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'}`}></div>
              <span className={`text-[9px] font-black uppercase tracking-widest truncate ${dbStatus === 'SAVED' ? 'text-emerald-700' : 'text-slate-500'}`}>
                {dbStatus === 'SAVED' ? 'DADOS GRAVADOS' : dbStatus === 'SYNCING' ? 'SINCRONIZANDO...' : 'BANCO DE DADOS LOCAL'}
              </span>
            </div>
          </div>
          
          <nav className="space-y-1.5">
            <button 
              onClick={() => { setSelectedProject(null); setActiveView('PROJECTS'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${!selectedProject && activeView === 'PROJECTS' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
              Dashboard
            </button>
            <button 
              onClick={() => { setSelectedProject(null); setActiveView('CALENDAR'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} 
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${activeView === 'CALENDAR' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              Calendário / Agenda
            </button>
            {currentUser.isAdmin && (
              <button onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-blue-600 rounded-xl font-bold text-sm transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
                Novo Membro
              </button>
            )}
            <button onClick={() => { setEditingProject(null); setIsProjectModalOpen(true); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-blue-600 rounded-xl font-bold text-sm transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
              Novo Projeto
            </button>
          </nav>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 min-w-[20rem]">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5">Segurança dos Dados</h2>
          <div className="space-y-2 mb-8">
             <button onClick={() => db.exportData()} className="w-full flex items-center gap-3 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-[10px] font-black uppercase text-slate-600 tracking-wider transition-all border border-slate-200">
               <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
               Gerar Backup (JSON)
             </button>
             <label className="w-full flex items-center gap-3 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-[10px] font-black uppercase text-slate-600 tracking-wider transition-all border border-slate-200 cursor-pointer">
               <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4-4m4-4v12"/></svg>
               Restaurar Backup
               <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
             </label>
          </div>

          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5">Equipe Ativa</h2>
          <div className="space-y-4">
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img src={user.avatar} className="w-9 h-9 rounded-full border border-slate-200 shadow-sm" alt={user.name} />
                    <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${user.status === 'ATIVO' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-700 leading-tight truncate">{user.name}</div>
                    <div className="text-[10px] text-slate-400 font-medium truncate">{user.role}</div>
                  </div>
                </div>
                {currentUser.isAdmin && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => { setEditingUser(user); setIsUserModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
                    <button onClick={() => handleDeleteUser(user.id, user.name)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <img src={currentUser.avatar} className="w-8 h-8 rounded-lg" alt={currentUser.name} />
              <div className="min-w-0">
                <div className="text-[10px] font-black text-slate-800 truncate">{currentUser.name}</div>
                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter truncate">{currentUser.role}</div>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase text-red-500 tracking-widest hover:bg-red-50 hover:border-red-100 transition-all active:scale-95">Sair do Sistema</button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden h-full">
        <header className="h-16 lg:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 z-20 shadow-sm">
          <div className="flex items-center gap-2 lg:gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            <h2 className="text-sm lg:text-lg font-black text-slate-800 tracking-tight truncate max-w-[150px] sm:max-w-none">
              {selectedProject ? selectedProject.title : activeView === 'PROJECTS' ? 'Dashboard Geral' : 'Agenda de Equipe'}
            </h2>
          </div>
          
          <div className="flex gap-2">
            {activeView === 'PROJECTS' && (
               <button onClick={() => { setEditingProject(null); setIsProjectModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-5 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-blue-100 transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                <span className="hidden sm:inline">Novo Projeto</span>
                <span className="sm:hidden">Novo</span>
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50/50">
          {selectedProject ? (
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 pb-10">
              <div className="lg:col-span-2 space-y-6 lg:space-y-8">
                <div className="bg-white rounded-[2rem] border border-slate-200 p-6 lg:p-8 shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider ${STATUS_COLORS[selectedProject.status]}`}>{selectedProject.status}</span>
                        <h1 className="text-xl lg:text-3xl font-black text-slate-800 tracking-tight">{selectedProject.title}</h1>
                      </div>
                      <p className="text-slate-500 text-sm lg:text-base leading-relaxed">{selectedProject.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setSelectedProject(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                      <div>
                        <h3 className="text-lg lg:text-xl font-black text-slate-800 tracking-tight">Células de Trabalho</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Progresso Ponderado: {calculateWeightedProgress(selectedProject)}%</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <select value={selectedProject.status} onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)} className={`text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 outline-none shadow-sm ${STATUS_COLORS[selectedProject.status]}`}>
                          {Object.values(ProjectStatus).map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </div>
                    </div>

                    <form onSubmit={handleAddTask} className="flex flex-col sm:flex-row gap-2 p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                      <input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Nova tarefa..." className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100" />
                      <select value={newTaskStage} onChange={(e) => setNewTaskStage(e.target.value as TaskStage)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none">
                        {Object.values(TaskStage).map(stage => (
                          <option key={stage} value={stage}>{stage} ({Math.round(STAGE_WEIGHTS[stage]*100)}%)</option>
                        ))}
                      </select>
                      <button type="submit" className="px-6 py-2 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 shadow-md transition-all active:scale-95">Adicionar</button>
                    </form>

                    <div className="space-y-8">
                      {Object.values(TaskStage).map(stage => {
                        const stageTasks = selectedProject.tasks.filter(t => t.stage === stage);
                        const completedCount = stageTasks.filter(t => t.completed).length;
                        return (
                          <div key={stage} className="space-y-3">
                            <div className="flex items-center justify-between px-2">
                              <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${stageTasks.length > 0 && completedCount === stageTasks.length ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-blue-400'}`}></span>
                                {stage} 
                                <span className="text-slate-300 ml-1">({Math.round(STAGE_WEIGHTS[stage]*100)}% do Projeto)</span>
                              </h4>
                              {stageTasks.length > 0 && (
                                <span className="text-[10px] font-black text-slate-400">{completedCount}/{stageTasks.length}</span>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              {stageTasks.map(task => (
                                <div key={task.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${task.completed ? 'bg-emerald-50/30 border-emerald-100' : 'bg-white border-slate-100 shadow-sm'}`}>
                                  <div onClick={() => toggleTask(task.id)} className={`shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${task.completed ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-100/50' : 'bg-white border-slate-300 hover:border-blue-400'}`}>
                                    {task.completed && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className={`text-sm font-bold tracking-tight block truncate ${task.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</span>
                                    {task.completedAt && <span className="text-[9px] font-bold text-emerald-600 uppercase mt-0.5">Finalizado {new Date(task.completedAt).toLocaleDateString()}</span>}
                                  </div>
                                </div>
                              ))}
                              {stageTasks.length === 0 && (
                                <div className="p-4 border border-dashed border-slate-200 rounded-2xl text-center">
                                  <span className="text-[10px] font-bold text-slate-300 uppercase italic">Nenhuma tarefa nesta etapa</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-[2rem] p-6 lg:p-8 text-white shadow-2xl relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <h3 className="text-lg font-black flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg"><svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/></svg></div>
                        Gemini Insight
                      </h3>
                      <button onClick={fetchAiInsight} disabled={isLoadingInsight} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                        {isLoadingInsight ? 'Analisando...' : 'Analisar Projeto'}
                      </button>
                    </div>
                    {aiInsight ? (
                      <div className="text-slate-300 text-sm font-medium leading-relaxed bg-white/5 p-5 rounded-2xl border border-white/10 animate-in fade-in duration-500">
                        {aiInsight}
                      </div>
                    ) : (
                      <div className="text-slate-500 text-xs font-bold italic">Gere um insight estratégico baseado no progresso atual.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:h-[calc(100vh-12rem)] lg:sticky lg:top-8">
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl flex flex-col h-[500px] lg:h-full overflow-hidden">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/30 flex shrink-0 items-center justify-between">
                    <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
                      Mensagens
                    </h3>
                    <select value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="text-[9px] bg-white border border-slate-200 rounded-lg px-2 py-1 font-black text-slate-700 outline-none">
                      <option value="ALL">Equipe</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name.split(' ')[0]}</option>)}
                    </select>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {selectedProject.comments.map(comment => (
                      <div key={comment.id} className={`flex ${comment.authorId === currentUser?.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] flex flex-col ${comment.authorId === currentUser?.id ? 'items-end' : 'items-start'}`}>
                          <span className="text-[9px] font-black text-slate-400 mb-1 px-1 uppercase tracking-tighter">
                            {comment.authorName.split(' ')[0]} 
                            {comment.targetUserId && <span className="text-blue-600 ml-1">@ {users.find(u => u.id === comment.targetUserId)?.name.split(' ')[0]}</span>}
                          </span>
                          <div className={`px-4 py-2.5 rounded-2xl text-xs font-medium shadow-sm leading-relaxed ${comment.authorId === currentUser?.id ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-700 rounded-tl-none'}`}>
                            {comment.content}
                          </div>
                          <span className="text-[8px] text-slate-300 font-bold mt-1">{new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-4 border-t border-slate-100 shrink-0">
                    <div className="flex gap-2">
                      <input value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddComment()} placeholder="Mensagem..." className="flex-1 px-4 py-2.5 bg-slate-100 rounded-xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" />
                      <button onClick={handleAddComment} disabled={!newComment.trim()} className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 disabled:opacity-50 transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeView === 'CALENDAR' ? (
             <div className="max-w-7xl mx-auto h-[calc(100vh-14rem)]">
                <AgendaCalendar 
                  currentUser={currentUser} 
                  users={users} 
                  agenda={agenda}
                  onSaveItem={handleSaveAgendaItem}
                  onDeleteItem={handleDeleteAgendaItem}
                />
             </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-8 pb-10">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 lg:gap-6">
                {[
                  { label: 'Projetos', val: stats.total },
                  { label: 'Membros', val: stats.members },
                  { label: 'Backlog', val: stats[ProjectStatus.BACKLOG] },
                  { label: 'Andamento', val: stats[ProjectStatus.IN_PROGRESS] },
                  { label: 'Revisão', val: stats[ProjectStatus.REVIEW] },
                  { label: 'Concluintes', val: stats[ProjectStatus.COMPLETED] }
                ].map((item, i) => (
                  <div key={i} className="bg-white p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 shadow-sm flex flex-col hover:shadow-lg transition-all">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</span>
                    <span className="text-2xl sm:text-4xl font-black text-slate-800">{item.val}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
                {projects.map(project => (
                  <ProjectCard 
                    key={project.id} 
                    project={project} 
                    responsible={users.find(u => u.id === project.responsibleId)}
                    onClick={setSelectedProject} 
                  />
                ))}
                {projects.length === 0 && (
                  <div className="col-span-full py-20 lg:py-32 text-center bg-white rounded-[2rem] border-4 border-dashed border-slate-100 flex flex-col items-center p-6">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6"><svg className="w-8 h-8 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg></div>
                    <p className="text-slate-400 font-black text-sm uppercase tracking-widest mb-6">Nenhum projeto no banco local</p>
                    <button onClick={() => setIsProjectModalOpen(true)} className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Criar Projeto</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="fixed bottom-4 sm:bottom-8 right-4 sm:right-8 z-50 flex flex-col gap-3 pointer-events-none max-w-[calc(100vw-2rem)]">
          {notifications.filter(n => !n.read).slice(0, 3).map(n => (
            <div key={n.id} className="bg-slate-900 border-l-4 border-blue-500 rounded-2xl shadow-2xl p-4 sm:p-6 w-72 sm:w-80 pointer-events-auto animate-in slide-in-from-right-full">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-black text-white text-[10px] sm:text-xs uppercase tracking-wider truncate">{n.title}</h4>
                <button onClick={() => setNotifications(prev => prev.map(item => item.id === n.id ? {...item, read: true} : item))} className="text-slate-500 hover:text-white shrink-0">
                  <svg className="w-4 h-4 sm:w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium leading-relaxed">{n.message}</p>
            </div>
          ))}
        </div>
      </main>

      <ProjectModal 
        isOpen={isProjectModalOpen} 
        onClose={() => { setIsProjectModalOpen(false); setEditingProject(null); }} 
        onSave={handleSaveProject} 
        availableUsers={users}
        editProject={editingProject}
      />

      <UserModal 
        isOpen={isUserModalOpen}
        onClose={() => { setIsUserModalOpen(false); setEditingUser(null); }}
        onSave={handleSaveUser}
        editUser={editingUser}
        isAdminMode={currentUser?.isAdmin}
      />
    </div>
  );
};

export default App;
