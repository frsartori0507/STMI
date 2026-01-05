
import { Project, User, AgendaItem, ProjectStatus, TaskStage } from '../types';

const STORAGE_KEYS = {
  PROJECTS: 'stmi_v5_projects',
  USERS: 'stmi_v5_users',
  SESSION: 'stmi_v5_session',
  AGENDA: 'stmi_v5_agenda',
  DB_PATH: 'stmi_v5_db_path'
};

const DEFAULT_PATH = '\\\\10.9.0.211\\unidade tecnica\\Sistema\\BD_STMI.accdb';

const INITIAL_USERS: User[] = [
  {
    id: 'admin',
    name: 'Administrador STMI',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    role: 'Coordenador',
    username: 'admin',
    password: '123',
    status: 'ATIVO',
    isAdmin: true
  }
];

const hydrate = (data: any): any => {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(data)) return new Date(data);
  if (Array.isArray(data)) return data.map(hydrate);
  if (typeof data === 'object') {
    const obj: any = {};
    for (const key in data) obj[key] = hydrate(data[key]);
    return obj;
  }
  return data;
};

export const db = {
  getDbPath(): string {
    return localStorage.getItem(STORAGE_KEYS.DB_PATH) || DEFAULT_PATH;
  },

  setDbPath(path: string) {
    localStorage.setItem(STORAGE_KEYS.DB_PATH, path);
  },

  async getSession(): Promise<User | null> {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!raw) return null;
    const { user, expires } = JSON.parse(raw);
    if (Date.now() > expires) {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
      return null;
    }
    return hydrate(user);
  },

  async setSession(user: User, remember: boolean) {
    const expires = Date.now() + (remember ? 30 : 1) * 24 * 60 * 60 * 1000;
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({ user, expires }));
  },

  async clearSession() { localStorage.removeItem(STORAGE_KEYS.SESSION); },

  async getUsers(): Promise<User[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return hydrate(JSON.parse(raw));
  },

  async saveUser(user: User) {
    const users = await this.getUsers();
    const updated = users.some(u => u.id === user.id) ? users.map(u => u.id === user.id ? user : u) : [...users, user];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
  },

  async getProjects(): Promise<Project[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    return raw ? hydrate(JSON.parse(raw)) : [];
  },

  async saveProject(project: Project) {
    const projects = await this.getProjects();
    const toSave = { ...project, updatedAt: new Date() };
    const updated = projects.some(p => p.id === project.id) ? projects.map(p => p.id === project.id ? toSave : p) : [toSave, ...projects];
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated));
    return toSave;
  },

  async deleteProject(id: string) {
    const projects = await this.getProjects();
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects.filter(p => p.id !== id)));
  },

  async getAgenda(): Promise<AgendaItem[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.AGENDA);
    return raw ? hydrate(JSON.parse(raw)) : [];
  },

  async saveAgendaItem(item: AgendaItem) {
    const agenda = await this.getAgenda();
    const updated = [...agenda.filter(i => i.id !== item.id), item];
    localStorage.setItem(STORAGE_KEYS.AGENDA, JSON.stringify(updated));
  },

  async deleteAgendaItem(id: string) {
    const agenda = await this.getAgenda();
    localStorage.setItem(STORAGE_KEYS.AGENDA, JSON.stringify(agenda.filter(i => i.id !== id)));
  },

  exportDatabase() {
    const data = {
      projects: JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || '[]'),
      users: JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]'),
      agenda: JSON.parse(localStorage.getItem(STORAGE_KEYS.AGENDA) || '[]'),
      exportedAt: new Date().toISOString(),
      networkPath: this.getDbPath()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `STMI_DATA_SYNC.stmi`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async importDatabase(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (data.projects) localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(data.projects));
          if (data.users) localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(data.users));
          if (data.agenda) localStorage.setItem(STORAGE_KEYS.AGENDA, JSON.stringify(data.agenda));
          resolve(true);
        } catch (err) {
          resolve(false);
        }
      };
      reader.readAsText(file);
    });
  }
};
