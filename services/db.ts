
import { Project, User } from '../types';
import { INITIAL_USERS, INITIAL_PROJECTS } from './initialData';

const STORAGE_KEYS = {
  PROJECTS: 'prosync_projects_v2',
  USERS: 'prosync_users_v2',
  SESSION: 'prosync_session_v3'
};

export const db = {
  // --- GERENCIAMENTO DE SESSÃO ---
  async getSession(): Promise<User | null> {
    const sessionData = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!sessionData) return null;
    try {
      const { user, expires, deviceSignature } = JSON.parse(sessionData);
      if (new Date().getTime() > expires) {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
        return null;
      }
      const currentSignature = btoa(navigator.userAgent).substring(0, 24);
      if (deviceSignature !== currentSignature) return null;
      return user;
    } catch (e) {
      return null;
    }
  },

  async setSession(user: User, remember: boolean) {
    const duration = remember ? 30 * 24 * 60 * 60 * 1000 : 4 * 60 * 60 * 1000;
    const session = {
      user,
      expires: new Date().getTime() + duration,
      deviceSignature: btoa(navigator.userAgent).substring(0, 24)
    };
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
  },

  async clearSession() {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  },

  // --- USUÁRIOS ---
  async getUsers(): Promise<User[]> {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USERS);
      if (!saved) {
        // Inicializa com dados do arquivo initialData.ts
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
        return INITIAL_USERS;
      }
      return JSON.parse(saved);
    } catch (e) {
      return INITIAL_USERS;
    }
  },

  async saveUser(user: User): Promise<User> {
    const users = await this.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    let updatedUsers = index >= 0 ? [...users] : [...users, user];
    if (index >= 0) updatedUsers[index] = user;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    return user;
  },

  async deleteUser(id: string): Promise<void> {
    const users = await this.getUsers();
    const filtered = users.filter(u => u.id !== id);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(filtered));
  },

  // --- PROJETOS ---
  async getProjects(): Promise<Project[]> {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (!saved) {
        // Inicializa com dados do arquivo initialData.ts
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(INITIAL_PROJECTS));
        return INITIAL_PROJECTS;
      }
      
      const parsed = JSON.parse(saved);
      return parsed.map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
        tasks: (p.tasks || []).map((t: any) => ({
          ...t,
          completedAt: t.completedAt ? new Date(t.completedAt) : undefined
        })),
        comments: (p.comments || []).map((c: any) => ({
          ...c,
          timestamp: new Date(c.timestamp)
        }))
      }));
    } catch (e) {
      return INITIAL_PROJECTS;
    }
  },

  async saveProject(project: Project): Promise<Project> {
    const projects = await this.getProjects();
    const index = projects.findIndex(p => p.id === project.id);
    let updatedProjects = index >= 0 ? [...projects] : [project, ...projects];
    if (index >= 0) updatedProjects[index] = project;
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updatedProjects));
    return project;
  },

  // --- BACKUP ---
  async exportData() {
    const data = {
      users: await this.getUsers(),
      projects: await this.getProjects(),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_BD_Projetos_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async importData(jsonData: string) {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.users) localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(parsed.users));
      if (parsed.projects) localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(parsed.projects));
      window.location.reload();
    } catch (e) {
      alert("Arquivo de backup inválido.");
    }
  }
};
