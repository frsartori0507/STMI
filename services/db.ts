
import { Project, User, AgendaItem } from '../types';
import { INITIAL_USERS, INITIAL_PROJECTS } from './initialData';

const STORAGE_KEYS = {
  PROJECTS: 'stmi_projects_storage_v3',
  USERS: 'stmi_users_storage_v3',
  SESSION: 'stmi_session_storage_v3',
  AGENDA: 'stmi_agenda_storage_v3'
};

// Auxiliar para garantir que datas sejam convertidas corretamente ao sair do JSON
const parseDates = (data: any): any => {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(data)) {
    return new Date(data);
  }
  if (Array.isArray(data)) {
    return data.map(parseDates);
  }
  if (typeof data === 'object') {
    const obj: any = {};
    for (const key in data) {
      obj[key] = parseDates(data[key]);
    }
    return obj;
  }
  return data;
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
      return parseDates(user);
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
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
        return INITIAL_USERS;
      }
      return parseDates(JSON.parse(saved));
    } catch (e) {
      console.error("Erro ao ler usuários:", e);
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

  // --- AGENDA ---
  async getAgenda(): Promise<AgendaItem[]> {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AGENDA);
      if (!saved) return [];
      return parseDates(JSON.parse(saved));
    } catch (e) {
      console.error("Erro ao ler agenda:", e);
      return [];
    }
  },

  async saveAgendaItem(item: AgendaItem): Promise<AgendaItem> {
    const agenda = await this.getAgenda();
    const index = agenda.findIndex(i => i.id === item.id);
    let updatedAgenda = index >= 0 ? [...agenda] : [...agenda, item];
    if (index >= 0) updatedAgenda[index] = item;
    localStorage.setItem(STORAGE_KEYS.AGENDA, JSON.stringify(updatedAgenda));
    return item;
  },

  async deleteAgendaItem(id: string): Promise<void> {
    const agenda = await this.getAgenda();
    const filtered = agenda.filter(i => i.id !== id);
    localStorage.setItem(STORAGE_KEYS.AGENDA, JSON.stringify(filtered));
  },

  // --- PROJETOS ---
  async getProjects(): Promise<Project[]> {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (!saved) {
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(INITIAL_PROJECTS));
        return INITIAL_PROJECTS;
      }
      return parseDates(JSON.parse(saved));
    } catch (e) {
      console.error("Erro ao ler projetos:", e);
      return INITIAL_PROJECTS;
    }
  },

  async saveProject(project: Project): Promise<Project> {
    const projects = await this.getProjects();
    const index = projects.findIndex(p => p.id === project.id);
    
    // Garantir que estamos salvando objetos limpos e com datas tratadas internamente pelo stringify
    const projectToSave = {
      ...project,
      updatedAt: new Date()
    };

    let updatedProjects;
    if (index >= 0) {
      updatedProjects = [...projects];
      updatedProjects[index] = projectToSave;
    } else {
      updatedProjects = [projectToSave, ...projects];
    }
    
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updatedProjects));
    return projectToSave;
  },

  // --- BACKUP ---
  async exportData() {
    const data = {
      users: await this.getUsers(),
      projects: await this.getProjects(),
      agenda: await this.getAgenda(),
      exportedAt: new Date().toISOString(),
      source: "STMI Projetos v3"
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `STMI_BKP_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async importData(jsonData: string) {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.users) localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(parsed.users));
      if (parsed.projects) localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(parsed.projects));
      if (parsed.agenda) localStorage.setItem(STORAGE_KEYS.AGENDA, JSON.stringify(parsed.agenda));
      alert("Dados importados com sucesso! O sistema será reiniciado.");
      window.location.reload();
    } catch (e) {
      alert("Erro ao importar: Arquivo de backup corrompido ou inválido.");
    }
  }
};
