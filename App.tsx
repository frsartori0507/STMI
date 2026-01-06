
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Project, User, ProjectStatus, AgendaItem } from './types';
import { STATUS_COLORS } from './constants';
import ProjectCard from './components/ProjectCard';
import ProjectModal from './components/ProjectModal';
import LoginScreen from './components/LoginScreen';
import UserModal from './components/UserModal';
import AgendaCalendar from './components/AgendaCalendar';
import { db } from './services/db';

type ViewType = 'projects' | 'calendar' | 'members';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<ViewType>('projects');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  // Modais
  const [modalProject, setModalProject] = useState(false);
  const [modalUser, setModalUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [chatMsg, setChatMsg] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);

  const loadData = async () => {
    const [u, p] = await Promise.all([db.getUsers(), db.getProjects()]);
    setUsers(u);
    setProjects(p);
  };

  useEffect(() => {
    const init = async () => {
      const sessionUser = await db.getSession();
      if (sessionUser) setCurrentUser(sessionUser);
      await loadData();
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      const sub = db.subscribeToProject(selectedProjectId, loadData);
      scrollToBottom();
      return () => { sub.unsubscribe(); };
    }
  }, [selectedProjectId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleLogout = async () => {
    await db.clearSession();
    window.location.reload();
  };

  const handleSendMessage = async () => {
    if (!selectedProject || !chatMsg.trim() || !currentUser) return;
    try {
      await db.addComment({
        projectId: selectedProject.id,
        authorId: currentUser.id,
        authorName: currentUser.name,
        content: chatMsg
      });
      setChatMsg('');
      await loadData();
      scrollToBottom();
    } catch (e) {
      alert("Erro ao enviar mensagem");
    }
  };

  const handleTaskToggle = async (taskId: string) => {
    if (!selectedProject) return;
    const task = selectedProject.tasks.find(t => t.id === taskId);
    if (!task) return;
    const updatedTasks = selectedProject.tasks.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date() : undefined } : t
    );
    await db.saveProject({ ...selectedProject, tasks: updatedTasks });
    await loadData();
  };

  const handleSaveUser = async (userData: User) => {
    try {
      await db.saveUser(userData);
      await loadData();
      setModalUser(false);
      setEditingUser(null);
    } catch (e) {
      alert("Erro ao salvar membro. Verifique se o nome de usuário já existe.");
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Sincronizando STMI...</p>
    </div>
  );

  if (!currentUser) return <LoginScreen onLoginSuccess={setCurrentUser} />;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-['Segoe_UI'] text-left">
      {/* SIDEBAR */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-xl shadow-blue-100">S</div>
            <div>
              <h1 className="text-slate-900 font-black text-lg leading-none tracking-tight">STMI</h1>
            </div>
          </div>

          <nav className="space-y-2">
            <button 
              onClick={() => { setSelectedProjectId(null); setActiveView('projects'); }}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeView === 'projects' && !selectedProjectId ? 'bg-blue-600 text-white shadow-xl shadow-blue-50' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M3 12h18M3 6h18M3 18h18"/></svg>
              PROJETOS
            </button>
            
            <button 
              onClick={() => { setSelectedProjectId(null); setActiveView('calendar'); }}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeView === 'calendar' ? 'bg-blue-600 text-white shadow-xl shadow-blue-50' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              AGENDA
            </button>

            <button 
              onClick={() => { setSelectedProjectId(null); setActiveView('members'); }}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeView === 'members' ? 'bg-blue-600 text-white shadow-xl shadow-blue-50' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              EQUIPE
            </button>
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-100">
           <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3 border border-slate-100">
             <img src={currentUser.avatar} className="w-9 h-9 rounded-xl border-2 border-white shadow-sm" alt="" />
             <div className="flex-1 min-w-0">
               <div className="text-[10px] font-black text-slate-900 truncate">{currentUser.name}</div>
               <button onClick={handleLogout} className="text-[8px] text-red-500 font-black uppercase hover:underline">Sair do Sistema</button>
             </div>
           </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-10 shrink-0">
          <div className="flex items-center gap-6">
            {selectedProject && (
              <button onClick={() => setSelectedProjectId(null)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
              </button>
            )}
            <div className="flex flex-col">
               <h2 className="text-xl font-black text-slate-900 tracking-tight">
                 {selectedProject ? selectedProject.title : 
                  activeView === 'projects' ? 'PROJETOS' : 
                  activeView === 'calendar' ? 'AGENDA' : 'MEMBROS'}
               </h2>
               {selectedProject && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedProject.neighborhood || 'Bairro não informado'}</p>}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {selectedProject ? (
              <button onClick={() => setModalProject(true)} className="bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm">
                Editar Projeto
              </button>
            ) : (
              <>
                {activeView === 'projects' && (
                  <button onClick={() => setModalProject(true)} className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-50 active:scale-95">
                    Novo Projeto
                  </button>
                )}
                {activeView === 'members' && currentUser.isAdmin && (
                  <button onClick={() => { setEditingUser(null); setModalUser(true); }} className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100">
                    Adicionar Membro
                  </button>
                )}
              </>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
          {/* VISUALIZAÇÃO DE PROJETO SELECIONADO */}
          {selectedProject ? (
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
              <div className="lg:col-span-8 flex flex-col gap-6 h-full overflow-y-auto pr-2 custom-scrollbar">
                <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm">
                  {/* INFORMAÇÕES TÉCNICAS ADICIONAIS */}
                  <div className="grid grid-cols-2 gap-8 mb-12 pb-12 border-b border-slate-100">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Logradouro / Endereço</h4>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-sm font-bold text-slate-700">{selectedProject.address || 'Não informado'}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Coordenação Geral</h4>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                        <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                        </div>
                        <p className="text-sm font-bold text-slate-700">{users.find(u => u.id === selectedProject.responsibleId)?.name || 'Não definido'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-12">
                    <h3 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.2em] mb-4 ml-1">Escopo do Projeto</h3>
                    <div className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100">
                      <p className="text-slate-600 text-sm leading-relaxed font-medium">{selectedProject.description}</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] pt-6 flex items-center gap-3 ml-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                      Checklist e Responsáveis (RI)
                    </h4>
                    
                    <div className="grid gap-3">
                      {selectedProject.tasks.length > 0 ? selectedProject.tasks.map(task => {
                        const ri = users.find(u => u.id === task.responsibleId);
                        return (
                          <div key={task.id} className="group flex items-center gap-5 p-5 bg-white rounded-3xl border border-slate-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-50 transition-all">
                            <input 
                              type="checkbox" 
                              checked={task.completed} 
                              onChange={() => handleTaskToggle(task.id)}
                              className="w-6 h-6 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <div className="flex-1">
                              <p className={`text-sm font-bold ${task.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>{task.title}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                 <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                 <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Responsável (RI): <span className="text-blue-600">{ri?.name || 'Coordenação'}</span></p>
                              </div>
                            </div>
                            <span className="text-[9px] font-black text-slate-300 bg-slate-50 px-3 py-1.5 rounded-xl uppercase tracking-widest">{task.stage}</span>
                          </div>
                        );
                      }) : (
                        <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                          <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Nenhuma tarefa vinculada a esta obra</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 flex flex-col bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
                <div className="p-6 bg-[#0f172a] text-white flex items-center justify-between">
                  <h4 className="font-black text-[10px] uppercase tracking-[0.2em]">Canal RI / Mensagens</h4>
                  <span className="text-[8px] font-black bg-slate-800 px-2 py-1 rounded-md">{selectedProject.comments.length} MSG</span>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/30 custom-scrollbar">
                  {selectedProject.comments.map((c, idx) => {
                    const isMe = c.authorId === currentUser.id;
                    return (
                      <div key={c.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[90%] p-4 rounded-3xl text-xs font-medium ${isMe ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-100' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'}`}>
                          {c.content}
                        </div>
                        <span className="text-[8px] font-black text-slate-400 uppercase mt-2 px-1 tracking-widest">{c.authorName}</span>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-5 border-t border-slate-100 bg-white flex gap-2">
                  <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage()} placeholder="Encaminhar para o RI..." className="flex-1 bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold outline-none border border-slate-100 focus:border-blue-200 focus:bg-white transition-all" />
                  <button onClick={handleSendMessage} className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-all shadow-lg shadow-blue-50"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M14 5l7 7-7 7M5 12h16"/></svg></button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* VISUALIZAÇÃO PAINEL DE OBRAS */}
              {activeView === 'projects' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 max-w-7xl mx-auto">
                  {projects.map(p => (
                    <ProjectCard 
                      key={p.id} 
                      project={p} 
                      responsible={users.find(u => u.id === p.responsibleId)}
                      onClick={(proj) => setSelectedProjectId(proj.id)}
                    />
                  ))}
                  {projects.length === 0 && <div className="col-span-full py-40 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">Sem projetos.</div>}
                </div>
              )}

              {/* VISUALIZAÇÃO AGENDA TÉCNICA */}
              {activeView === 'calendar' && (
                <div className="h-full max-w-7xl mx-auto">
                  <AgendaCalendar 
                    currentUser={currentUser}
                    users={users}
                    agenda={agenda}
                    onSaveItem={(item) => setAgenda([...agenda, item])}
                    onDeleteItem={(id) => setAgenda(agenda.filter(i => i.id !== id))}
                  />
                </div>
              )}

              {/* VISUALIZAÇÃO GESTÃO DE EQUIPE */}
              {activeView === 'members' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
                  {users.map(user => (
                    <div key={user.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group">
                      <div className="flex flex-col items-center text-center">
                        <img src={user.avatar} className="w-20 h-20 rounded-2xl mb-4 border-4 border-slate-50" alt="" />
                        <h3 className="font-black text-slate-800 text-sm mb-1">{user.name}</h3>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4">{user.role}</p>
                        <div className="flex gap-2 w-full">
                          <span className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${user.status === 'ATIVO' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            {user.status}
                          </span>
                          {currentUser.isAdmin && (
                            <button 
                              onClick={() => { setEditingUser(user); setModalUser(true); }}
                              className="px-3 py-1.5 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* MODAIS */}
      <ProjectModal 
        isOpen={modalProject} 
        onClose={() => setModalProject(false)} 
        onSave={async (data) => { await db.saveProject(data); await loadData(); }} 
        availableUsers={users} 
        editProject={selectedProject}
      />
      
      <UserModal 
        isOpen={modalUser}
        onClose={() => { setModalUser(false); setEditingUser(null); }}
        onSave={handleSaveUser}
        editUser={editingUser}
        isAdminMode={currentUser.isAdmin}
      />
    </div>
  );
};

export default App;
