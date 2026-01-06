
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Project, User, ProjectStatus } from './types';
import { STATUS_COLORS } from './constants';
import ProjectCard from './components/ProjectCard';
import ProjectModal from './components/ProjectModal';
import LoginScreen from './components/LoginScreen';
import { db } from './services/db';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [modalProject, setModalProject] = useState(false);
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
              <h1 className="text-slate-900 font-black text-base leading-none tracking-tight">STMI COMMS</h1>
              <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-1">Gestão de Projetos</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => setSelectedProjectId(null)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${!selectedProjectId ? 'bg-blue-600 text-white shadow-xl shadow-blue-50' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M3 12h18M3 6h18M3 18h18"/></svg>
              Painel de Obras
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
          <div className="flex flex-col">
             <h2 className="text-xl font-black text-slate-900 tracking-tight">
               {selectedProject ? selectedProject.title : 'Central de Obras'}
             </h2>
             {selectedProject && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedProject.neighborhood || 'Local não definido'}</p>}
          </div>
          {!selectedProject && (
            <button onClick={() => setModalProject(true)} className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-50 active:scale-95">
              Novo Projeto
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
          {selectedProject ? (
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
              {/* DETALHES E TAREFAS (8 COLUNAS) */}
              <div className="lg:col-span-8 flex flex-col gap-6 h-full overflow-y-auto pr-2 custom-scrollbar">
                <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm">
                  <div className="mb-10">
                    <h3 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.2em] mb-3">Escopo do Projeto</h3>
                    <p className="text-slate-600 text-sm leading-relaxed font-medium">{selectedProject.description}</p>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] pt-6 border-t border-slate-100 flex items-center gap-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                      Checklist e Responsáveis (RI)
                    </h4>
                    
                    <div className="grid gap-3">
                      {selectedProject.tasks.map(task => {
                        const ri = users.find(u => u.id === task.responsibleId);
                        return (
                          <div key={task.id} className="group flex items-center gap-5 p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:border-blue-200 hover:bg-white transition-all">
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
                                 <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Responsável: <span className="text-blue-600">{ri?.name || 'Coordenação'}</span></p>
                              </div>
                            </div>
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{task.stage}</span>
                          </div>
                        );
                      })}
                      {selectedProject.tasks.length === 0 && (
                        <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem]">
                           <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhuma atividade vinculada</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* CHAT/COMUNICAÇÃO COM RIs (4 COLUNAS) */}
              <div className="lg:col-span-4 flex flex-col bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                  <h4 className="font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_#34d399]"></div>
                    Canal RI / Mensagens
                  </h4>
                  <span className="text-[8px] font-black bg-slate-800 px-2 py-1 rounded-md">{selectedProject.comments.length} MSG</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/30 custom-scrollbar">
                  {selectedProject.comments.map((c, idx) => {
                    const isMe = c.authorId === currentUser.id;
                    return (
                      <div key={c.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[90%] p-4 rounded-3xl text-xs font-medium leading-relaxed ${isMe ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-100' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'}`}>
                          {c.content}
                        </div>
                        <span className="text-[8px] font-black text-slate-400 uppercase mt-2 px-1 tracking-widest">
                          {c.authorName} • {new Date(c.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-5 border-t border-slate-100 bg-white">
                  <div className="flex gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 focus-within:border-blue-500 transition-all">
                    <input 
                      value={chatMsg}
                      onChange={e => setChatMsg(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Encaminhar para o RI..."
                      className="flex-1 bg-transparent px-4 py-2 text-xs font-bold outline-none text-slate-800"
                    />
                    <button 
                      onClick={handleSendMessage} 
                      className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-90"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M14 5l7 7-7 7M5 12h16"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {projects.map(p => (
                <ProjectCard 
                  key={p.id} 
                  project={p} 
                  responsible={users.find(u => u.id === p.responsibleId)}
                  onClick={(proj) => setSelectedProjectId(proj.id)}
                />
              ))}
              {projects.length === 0 && (
                <div className="col-span-full py-40 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Nenhum projeto cadastrado</h3>
                  <button onClick={() => setModalProject(true)} className="mt-6 text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] hover:underline">Iniciar primeira obra</button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <ProjectModal 
        isOpen={modalProject} 
        onClose={() => setModalProject(false)} 
        onSave={async (data) => { await db.saveProject(data); await loadData(); }} 
        availableUsers={users} 
      />
    </div>
  );
};

export default App;
