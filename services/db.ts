
import { Project, User, AgendaItem } from '../types';
import { INITIAL_USERS, INITIAL_PROJECTS } from './initialData';

const STORAGE_KEYS = {
  PROJECTS: 'stmi_projects_storage_v3',
  USERS: 'stmi_users_storage_v3',
  SESSION: 'stmi_session_storage_v3',
  AGENDA: 'stmi_agenda_storage_v3',
  CLOUD_URL: 'stmi_cloud_url_v1'
};

const parseDates = (data: any): any => {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(data)) {
    return new Date(data);
  }
  if (Array.isArray(data)) return data.map(parseDates);
  if (typeof data === 'object') {
    const obj: any = {};
    for (const key in data) obj[key] = parseDates(data[key]);
    return obj;
  }
  return data;
};

export const db = {
  // --- CONFIGURAÇÃO DE NUVEM ---
  getCloudUrl(): string | null {
    return localStorage.getItem(STORAGE_KEYS.CLOUD_URL);
  },

  setCloudUrl(url: string | null) {
    if (url) localStorage.setItem(STORAGE_KEYS.CLOUD_URL, url);
    else localStorage.removeItem(STORAGE_KEYS.CLOUD_URL);
  },

  async fetchFromCloud(): Promise<any> {
    const url = this.getCloudUrl();
    if (!url) return null;
    try {
      const response = await fetch(url + '?nocache=' + Date.now());
      if (!response.ok) throw new Error('Falha ao acessar GitHub');
      const data = await response.json();
      return parseDates(data);
    } catch (e) {
      console.error("Erro Cloud Fetch:", e);
      throw e;
    }
  },

  // --- PERSISTÊNCIA ---
  async getSession(): Promise<User | null> {
    const sessionData = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!sessionData) return null;
    try {
      const { user, expires, deviceSignature } = JSON.parse(sessionData);
      if (new Date().getTime() > expires) {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
        return null;
      }
      return parseDates(user);
    } catch (e) { return null; }
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

  async clearSession() { localStorage.removeItem(STORAGE_KEYS.SESSION); },

  async getUsers(): Promise<User[]> {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!saved) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return parseDates(JSON.parse(saved));
  },

  async saveUser(user: User): Promise<User> {
    const users = await this.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    let updatedUsers = index >= 0 ? [...users] : [...users, user];
    if (index >= 0) updatedUsers[index] = user;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    return user;
  },

  async deleteUser(id: string) {
    const users = await this.getUsers();
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users.filter(u => u.id !== id)));
  },

  async getAgenda(): Promise<AgendaItem[]> {
    const saved = localStorage.getItem(STORAGE_KEYS.AGENDA);
    return saved ? parseDates(JSON.parse(saved)) : [];
  },

  async saveAgendaItem(item: AgendaItem) {
    const agenda = await this.getAgenda();
    const index = agenda.findIndex(i => i.id === item.id);
    let updated = index >= 0 ? [...agenda] : [...agenda, item];
    if (index >= 0) updated[index] = item;
    localStorage.setItem(STORAGE_KEYS.AGENDA, JSON.stringify(updated));
    return item;
  },

  async deleteAgendaItem(id: string) {
    const agenda = await this.getAgenda();
    localStorage.setItem(STORAGE_KEYS.AGENDA, JSON.stringify(agenda.filter(i => i.id !== id)));
  },

  async getProjects(): Promise<Project[]> {
    const saved = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (!saved) {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(INITIAL_PROJECTS));
      return INITIAL_PROJECTS;
    }
    return parseDates(JSON.parse(saved));
  },

  async saveProject(project: Project): Promise<Project> {
    const projects = await this.getProjects();
    const index = projects.findIndex(p => p.id === project.id);
    const projectToSave = { ...project, updatedAt: new Date() };
    let updated = index >= 0 ? [...projects] : [projectToSave, ...projects];
    if (index >= 0) updated[index] = projectToSave;
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated));
    return projectToSave;
  },

  async exportData() {
    const data = {
      users: await this.getUsers(),
      projects: await this.getProjects(),
      agenda: await this.getAgenda(),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BD_PROJETOS_STMI.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async importData(jsonData: string | object) {
    try {
      const parsed: any = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      if (parsed.users) localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(parsed.users));
      if (parsed.projects) localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(parsed.projects));
      if (parsed.agenda) localStorage.setItem(STORAGE_KEYS.AGENDA, JSON.stringify(parsed.agenda));
      return true;
    } catch (e) { return false; }
  }
};
