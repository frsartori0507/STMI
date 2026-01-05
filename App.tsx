
import React, { useState, useEffect, useMemo } from 'react';
import { Project, ProjectStatus, Comment, Task, User, TaskStage, AgendaItem } from './types';
import { STATUS_COLORS } from './constants';
import ProjectCard from './components/ProjectCard';
import ProjectModal from './components/ProjectModal';
import UserModal from './components/UserModal';
import LoginScreen from './components/LoginScreen';
import AgendaCalendar from './components/AgendaCalendar';
import { db } from './services/db';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [view, setView] = useState<'PROJECTS' | 'CALENDAR' | 'USERS' | 'SQL'>('PROJECTS');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
  
  const [modalProject, setModalProject] = useState(false);
  const [modalUser, setModalUser] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [chatMsg, setChatMsg] = useState('');
  const [lastSync, setLastSync] = useState(db.getLastSync());
  const [syncCountdown, setSyncCountdown] = useState(300);
  const [isNetworkAuthorized, setIsNetworkAuthorized] = useState(db.isNetworkAuthorized());

  const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);

  const loadAll = async () => {
    const [u, p, a] = await Promise.all([db.getUsers(), db.getProjects(), db.getAgenda()]);
    setUsers(u);
    setProjects(p);
    setAgenda(a);
    setLastSync(db.getLastSync());
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

  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      setSyncCountdown((prev) => {
        if (prev <= 1) {
          handleSync(true);
          return 300;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSync = async (isAuto = false) => {
    await db.generateSQLScript();
    const now = new Date().toISOString();
    setLastSync(now);
    if (!isAuto) showToast(isNetworkAuthorized ? "Sincronizado diretamente na rede!" : "Script gerado na pasta de Downloads", "success");
  };

  const handleAuthorize = async () => {
    const success = await db.authorizeNetwork();
    if (success) {
      setIsNetworkAuthorized(true);
      showToast("Pasta de rede conectada com sucesso!", "success");
    } else {
      showToast("Acesso à rede negado.", "error");
    }
  };

  const handleLogout = async () => {
    await db.clearSession();
    window.location.reload();
  };

  const onSaveProject = async (data: Partial<Project>) => {
    const project = data.id 
      ? { ...projects.find(p => p.id === data.id)!, ...data as Project }
      : { ...data as Project, id: Math.random().toString(36).substr(2,9), createdAt: new Date(), updatedAt: new Date() };
    await db.saveProject(project);
    await loadAll();
    showToast("Alteração registrada.", "success");
  };

  const onSaveUser = async (user: User) => {
    await db.saveUser(user);
    await loadAll();
    showToast(`Membro ${user.name} atualizado`, "success");
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
      projectId: selectedProject.id, authorId: currentUser.id, authorName: currentUser.name, content: chatMsg, timestamp: new Date()
    };
    await onSaveProject({ ...selectedProject, comments: [...selectedProject.comments, comment] });
    setChatMsg('');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#f3f3f3]">
      <div className="w-12 h-12 border-4 border-[#0078d4] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!currentUser) return <LoginScreen onLoginSuccess={setCurrentUser} />;

  return (
    <div className="flex h-screen bg-[#f3f3f3] overflow-hidden font-['Segoe_UI']">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-8 h-8 bg-[#0078d4] rounded flex items-center justify-center text-white font-bold shadow-sm">S</div>
            <div className="flex flex-col">
              <span className="text-[#1a1a1a] font-bold text-sm leading-none tracking-tight">STMI DESKTOP</span>
              <span className="text-[9px] font-bold text-[#666666] uppercase tracking-wider">Unidade Técnica</span>
            </div>
          </div>

          <nav className="space-y-1">
            <button onClick={() => { setView('PROJECTS'); setSelectedProjectId(null); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded font-semibold text-xs transition-all ${view === 'PROJECTS' ? 'bg-slate-100 text-[#0078d4]' : 'text-slate-500 hover:bg-slate-50'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M3 7h18M3 12h18M3 17h18"/></svg>
              Projetos
            </button>
            <button onClick={() => { setView('CALENDAR'); setSelectedProjectId(null); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded font-semibold text-xs transition-all ${view === 'CALENDAR' ? 'bg-slate-100 text-[#0078d4]' : 'text-slate-500 hover:bg-slate-50'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              Agenda
            </button>
            <button onClick={() => { setView('USERS'); setSelectedProjectId(null); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded font-semibold text-xs transition-all ${view === 'USERS' ? 'bg-slate-100 text-[#0078d4]' : 'text-slate-500 hover:bg-slate-50'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
              Equipe
            </button>
            <button onClick={() => { setView('SQL'); setSelectedProjectId(null); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded font-semibold text-xs transition-all ${view === 'SQL' ? 'bg-slate-100 text-[#0078d4]' : 'text-slate-500 hover:bg-slate-50'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M4 7v10c0 1.1.9 2 2 2h12a2 2 0 002-2V7M4 7a2 2 0 012-2h12a2 2 0 012 2M4 7l8 4 8-4M12 11V5"/></svg>
              Servidor Rede
            </button>
          </nav>
        </div>

        <div className="mt-auto p-4 space-y-4">
           <div className={`rounded-xl p-3 shadow-sm border transition-all ${isNetworkAuthorized ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
              <div className="flex items-center justify-between mb-2">
                 <p className={`text-[9px] font-black uppercase tracking-widest ${isNetworkAuthorized ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {isNetworkAuthorized ? 'Rede Conectada' : 'Rede Desconectada'}
                 </p>
                 <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isNetworkAuthorized ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
              </div>
              <button onClick={() => isNetworkAuthorized ? handleSync(false) : handleAuthorize()} className={`group w-full py-2 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2 ${isNetworkAuthorized ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-amber-600 text-white hover:bg-amber-700'}`}>
                 {isNetworkAuthorized ? (
                   <>
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                     Sync Agora
                   </>
                 ) : (
                   <>
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 11v5m0 0l-4-4m4 4l4-4M8 5a4 4 0 000 8h8a4 4 0 000-8H8z"/></svg>
                     Conectar Pasta
                   </>
                 )}
              </button>
           </div>

           <div className="flex items-center gap-3 p-2 border-t border-slate-100">
             <img src={currentUser.avatar} className="w-8 h-8 rounded-full border border-slate-200" alt="" />
             <div className="flex-1 min-w-0">
               <div className="text-[11px] font-bold text-[#1a1a1a] truncate">{currentUser.name}</div>
               <button onClick={handleLogout} className="text-[9px] text-red-500 font-bold uppercase hover:underline">Sair do Sistema</button>
             </div>
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        {toast && (
          <div className="fixed top-4 right-4 z-[300] bg-slate-800 text-white px-4 py-2 rounded shadow-2xl text-[11px] font-bold uppercase tracking-wider animate-in slide-in-from-top-2">
            {toast.msg}
          </div>
        )}

        <header className="h-16 border-b border-slate-100 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-sm font-bold text-[#1a1a1a]">
             {selectedProject ? selectedProject.title : view === 'PROJECTS' ? 'Projetos da Unidade' : view === 'CALENDAR' ? 'Agenda Técnica' : view === 'USERS' ? 'Gestão de Equipe' : 'Configuração do Servidor de Rede'}
          </h2>
          <div className="flex items-center gap-2">
            {view === 'PROJECTS' && !selectedProject && (
              <button onClick={() => { setEditingProject(null); setModalProject(true); }} className="bg-[#0078d4] text-white px-4 py-1.5 rounded text-[11px] font-bold uppercase hover:bg-blue-700 transition-all">
                Novo Projeto
              </button>
            )}
            {view === 'USERS' && (
              <button onClick={() => { setEditingUser(null); setModalUser(true); }} className="bg-[#0078d4] text-white px-4 py-1.5 rounded text-[11px] font-bold uppercase hover:bg-blue-700 transition-all">
                Novo Membro
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-[#fdfdfd]">
           {selectedProject ? (
              <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
                 <div className="lg:col-span-3 space-y-6">
                    <button onClick={() => setSelectedProjectId(null)} className="text-[10px] font-bold text-[#0078d4] uppercase hover:underline flex items-center gap-1">
                       <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
                       Voltar
                    </button>
                    
                    <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-left">
                       <div className="flex justify-between items-start mb-6">
                          <h3 className="text-2xl font-bold text-[#1a1a1a] tracking-tight">{selectedProject.title}</h3>
                          <span className={`text-[9px] font-bold px-3 py-1 rounded uppercase tracking-wider ${STATUS_COLORS[selectedProject.status]}`}>
                            {selectedProject.status}
                          </span>
                       </div>
                       <div className="grid grid-cols-2 gap-4 mb-8 text-[11px] text-slate-500 font-medium">
                          <div className="flex items-center gap-2 bg-slate-50 p-3 rounded">
                             <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                             {selectedProject.address || 'Sem endereço'} - {selectedProject.neighborhood || 'Bairro N/I'}
                          </div>
                          <div className="flex items-center gap-2 bg-slate-50 p-3 rounded">
                             <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                             Iniciado em: {new Date(selectedProject.createdAt).toLocaleDateString()}
                          </div>
                       </div>
                       <p className="text-[#666666] text-sm mb-10 leading-relaxed bg-slate-50 p-4 rounded-lg border-l-4 border-slate-200">{selectedProject.description}</p>
                       <div className="space-y-10">
                          {Object.values(TaskStage).map(stage => {
                            const stageTasks = selectedProject.tasks.filter(t => t.stage === stage);
                            if (stageTasks.length === 0) return null;
                            return (
                               <div key={stage} className="space-y-4">
                                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-4">
                                     <span className="shrink-0">{stage}</span>
                                     <div className="flex-1 h-[1px] bg-slate-100"></div>
                                  </h4>
                                  <div className="grid grid-cols-1 gap-2">
                                     {stageTasks.map(task => (
                                        <div key={task.id} onClick={() => handleTaskToggle(task.id)} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${task.completed ? 'bg-slate-50 border-transparent grayscale' : 'bg-white border-slate-200 hover:border-[#0078d4] shadow-sm'}`}>
                                           <div className={`w-5 h-5 rounded flex items-center justify-center transition-all ${task.completed ? 'bg-emerald-500 text-white' : 'border-2 border-slate-200'}`}>
                                              {task.completed && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="4"/></svg>}
                                           </div>
                                           <span className={`text-[13px] font-bold ${task.completed ? 'line-through text-slate-400' : 'text-[#1a1a1a]'}`}>{task.title}</span>
                                        </div>
                                     ))}
                                  </div>
                               </div>
                            );
                          })}
                       </div>
                    </div>
                 </div>
                 <div className="lg:col-span-1">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-lg flex flex-col h-[500px] sticky top-4 overflow-hidden">
                       <div className="p-4 border-b border-slate-100 bg-slate-50">
                          <h4 className="font-bold text-[#1a1a1a] text-[10px] uppercase flex items-center gap-2">
                             <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                             Comunicação da Equipe
                          </h4>
                       </div>
                       <div className="flex-1 overflow-y-auto p-4 space-y-4">
                          {selectedProject.comments.map(c => (
                            <div key={c.id} className={`flex flex-col ${c.authorId === currentUser.id ? 'items-end' : 'items-start'}`}>
                               <div className={`max-w-[90%] p-3 rounded-2xl text-[12px] font-medium shadow-sm ${c.authorId === currentUser.id ? 'bg-[#0078d4] text-white rounded-tr-none' : 'bg-[#f3f3f3] text-[#1a1a1a] rounded-tl-none'}`}>
                                  {c.content}
                               </div>
                               <span className="text-[8px] font-black text-slate-300 mt-1 uppercase px-1">{c.authorName} • {new Date(c.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                          ))}
                       </div>
                       <div className="p-4 border-t border-slate-100 bg-[#f9f9f9] flex gap-2">
                          <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAddChat()} placeholder="Escreva para a equipe..." className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-full text-xs outline-none focus:border-[#0078d4] transition-all" />
                          <button onClick={handleAddChat} className="w-9 h-9 bg-[#0078d4] text-white rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-md">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M5 12h14m-7-7l7 7-7 7"/></svg>
                          </button>
                       </div>
                    </div>
                 </div>
              </div>
           ) : view === 'PROJECTS' ? (
              <div className="max-w-6xl mx-auto">
                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {projects.map(p => (
                       <div key={p.id} className="relative group">
                          <ProjectCard project={p} responsible={users.find(u => u.id === p.responsibleId)} onClick={p => setSelectedProjectId(p.id)} />
                          <button onClick={(e) => { e.stopPropagation(); setEditingProject(p); setModalProject(true); }} className="absolute top-6 right-6 p-2 bg-white shadow-xl rounded-lg opacity-0 group-hover:opacity-100 hover:text-[#0078d4] transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
                       </div>
                    ))}
                 </div>
              </div>
           ) : view === 'CALENDAR' ? (
              <div className="max-w-6xl mx-auto h-[70vh]">
                 <AgendaCalendar currentUser={currentUser} users={users} agenda={agenda} onSaveItem={async i => { await db.saveAgendaItem(i); await loadAll(); }} onDeleteItem={async id => { await db.deleteAgendaItem(id); await loadAll(); }} />
              </div>
           ) : view === 'USERS' ? (
              <div className="max-w-6xl mx-auto">
                 <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                       <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                             <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Membro</th>
                             <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {users.map(u => (
                             <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                   <div className="flex items-center gap-3">
                                      <img src={u.avatar} className="w-10 h-10 rounded-full border border-slate-200" alt="" />
                                      <span className="text-sm font-bold text-slate-800">{u.name}</span>
                                   </div>
                                </td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{u.role}</td>
                                <td className="px-6 py-4 text-right">
                                   <button onClick={() => { setEditingUser(u); setModalUser(true); }} className="p-2 text-slate-400 hover:text-[#0078d4] transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           ) : (
             <div className="max-w-4xl mx-auto space-y-8 text-left">
                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm overflow-hidden relative">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16"></div>
                   
                   <h3 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Console de Sincronização Automática</h3>
                   <div className="flex items-center gap-2 mb-10">
                      <div className={`w-2 h-2 rounded-full ${isNetworkAuthorized ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${isNetworkAuthorized ? 'text-emerald-600' : 'text-amber-600'}`}>
                         {isNetworkAuthorized ? 'Acesso Direto à Rede Ativado' : 'Aguardando Autorização de Pasta'}
                      </span>
                   </div>

                   <div className="grid grid-cols-1 gap-6 mb-10">
                      <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden group">
                         <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M4 7V5a2 2 0 012-2h12a2 2 0 012 2v2M4 7h16M4 7v10a2 2 0 002 2h12a2 2 0 002-2V7M9 11h6"/></svg>
                         </div>
                         <p className="text-[10px] font-black text-blue-400 uppercase mb-2 tracking-widest">Diretório do Servidor</p>
                         <p className="text-lg font-mono text-emerald-400 break-all">{db.getNetworkPath()}</p>
                         
                         <div className="mt-8 flex items-center gap-6">
                            <button onClick={handleAuthorize} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isNetworkAuthorized ? 'bg-slate-800 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-xl shadow-blue-900/40'}`}>
                               {isNetworkAuthorized ? 'Pasta Autorizada' : 'Autorizar Acesso Agora'}
                            </button>
                            <div className="w-[1px] h-8 bg-slate-800"></div>
                            <div>
                               <p className="text-[9px] font-bold text-slate-500 uppercase">Último Sync</p>
                               <p className="text-sm font-black">{new Date(lastSync).toLocaleTimeString()}</p>
                            </div>
                         </div>
                      </div>
                   </div>

                   {isNetworkAuthorized ? (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 animate-in slide-in-from-bottom-4">
                        <div className="flex-1">
                           <h4 className="text-lg font-black text-emerald-900 mb-2">Sincronização Direta Ativa</h4>
                           <p className="text-sm text-emerald-700 font-medium leading-relaxed">
                              O App agora tem permissão para gravar <b>STMI_SYNC_PRODUCAO.sql</b> diretamente na rede. Não haverá mais janelas de download ou pedidos para salvar arquivo.
                           </p>
                        </div>
                        <button onClick={() => handleSync(false)} className="shrink-0 bg-emerald-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-[12px] tracking-widest shadow-2xl shadow-emerald-900/30 hover:bg-emerald-700 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center gap-3">
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                           Sincronizar Rede
                        </button>
                      </div>
                   ) : (
                      <div className="bg-amber-50 border border-amber-100 rounded-3xl p-8">
                         <h4 className="text-lg font-black text-amber-900 mb-2">Por que autorizar?</h4>
                         <p className="text-sm text-amber-700 font-medium leading-relaxed mb-6">
                            Devido às regras de segurança do Windows e Navegadores, o App precisa da sua permissão temporária para "tocar" na pasta de rede. Sem isso, ele é obrigado a baixar o arquivo na sua pasta pessoal de Downloads.
                         </p>
                         <button onClick={handleAuthorize} className="bg-amber-600 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-amber-700 transition-all">
                            Selecionar Pasta de Rede e Liberar Acesso
                         </button>
                      </div>
                   )}
                </div>
             </div>
           )}
        </div>
      </main>

      <ProjectModal isOpen={modalProject} onClose={() => setModalProject(false)} onSave={onSaveProject} availableUsers={users} editProject={editingProject} />
      <UserModal isOpen={modalUser} onClose={() => { setModalUser(false); setEditingUser(null); }} onSave={onSaveUser} editUser={editingUser} />
    </div>
  );
};

export default App;
