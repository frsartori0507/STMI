
import { Project, User, AgendaItem, ProjectStatus, TaskStage } from '../types';
import { INITIAL_USERS } from './initialData';

const STORAGE_KEYS = {
  PROJECTS: 'stmi_v5_projects',
  USERS: 'stmi_v5_users',
  SESSION: 'stmi_v5_session',
  AGENDA: 'stmi_v5_agenda',
  LAST_SYNC: 'stmi_v5_last_sync'
};

const NETWORK_PATH = "\\\\10.9.0.211\\unidade tecnica\\Sistema\\web\\banco";

// Handle para a pasta de rede (armazenado em memória durante a sessão)
let networkDirectoryHandle: FileSystemDirectoryHandle | null = null;

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
  getNetworkPath() { return NETWORK_PATH; },
  
  isNetworkAuthorized() { return !!networkDirectoryHandle; },

  async authorizeNetwork(): Promise<boolean> {
    try {
      // Abre o seletor de pastas nativo do Windows/Navegador
      networkDirectoryHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite'
      });
      return true;
    } catch (err) {
      console.error("Usuário cancelou ou erro ao acessar diretório:", err);
      return false;
    }
  },

  async getUsers(): Promise<User[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return hydrate(JSON.parse(raw));
  },

  async getProjects(): Promise<Project[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    return raw ? hydrate(JSON.parse(raw)) : [];
  },

  async saveProject(project: Project) {
    const projects = await this.getProjects();
    const toSave = { ...project, updatedAt: new Date() };
    const updated = projects.some(p => p.id === project.id) 
      ? projects.map(p => p.id === project.id ? toSave : p) 
      : [toSave, ...projects];
    
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(updated));
    return toSave;
  },

  async saveUser(user: User) {
    const users = await this.getUsers();
    const updated = users.some(u => u.id === user.id) ? users.map(u => u.id === user.id ? user : u) : [...users, user];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
  },

  async generateSQLScript() {
    const projects = await this.getProjects();
    const users = await this.getUsers();
    
    let sql = `-- STMI SYNC SCRIPT\n-- DESTINO: ${NETWORK_PATH}\n-- DATA: ${new Date().toLocaleString()}\n\n`;
    sql += `SET XACT_ABORT ON;\nBEGIN TRANSACTION;\n\n`;

    users.forEach((u: any) => {
      const escapedName = u.name.replace(/'/g, "''");
      sql += `IF NOT EXISTS (SELECT 1 FROM STMI_Usuarios WHERE ID = '${u.id}')\n`;
      sql += `  INSERT INTO STMI_Usuarios (ID, Nome, Cargo, Login, Status) VALUES ('${u.id}', '${escapedName}', '${u.role}', '${u.username}', '${u.status}');\n`;
      sql += `ELSE\n`;
      sql += `  UPDATE STMI_Usuarios SET Nome='${escapedName}', Cargo='${u.role}', Status='${u.status}' WHERE ID='${u.id}';\n`;
    });

    projects.forEach((p: any) => {
      const escapedTitle = p.title.replace(/'/g, "''");
      const escapedDesc = (p.description || '').replace(/'/g, "''");
      const escapedAddr = (p.address || '').replace(/'/g, "''");
      const escapedBairro = (p.neighborhood || '').replace(/'/g, "''");
      
      sql += `IF NOT EXISTS (SELECT 1 FROM STMI_Projetos WHERE ID = '${p.id}')\n`;
      sql += `  INSERT INTO STMI_Projetos (ID, Titulo, Descricao, Status, Endereco, Bairro, ResponsavelID, CriadoEm) \n`;
      sql += `  VALUES ('${p.id}', '${escapedTitle}', '${escapedDesc}', '${p.status}', '${escapedAddr}', '${escapedBairro}', '${p.responsibleId}', '${p.createdAt}');\n`;
      sql += `ELSE\n`;
      sql += `  UPDATE STMI_Projetos SET Titulo='${escapedTitle}', Descricao='${escapedDesc}', Status='${p.status}', Endereco='${escapedAddr}', Bairro='${escapedBairro}' WHERE ID='${p.id}';\n`;

      sql += `  DELETE FROM STMI_Tarefas WHERE ProjetoID = '${p.id}';\n`;
      p.tasks?.forEach((t: any) => {
        const escapedTaskTitle = t.title.replace(/'/g, "''");
        sql += `  INSERT INTO STMI_Tarefas (ID, ProjetoID, Titulo, Etapa, Concluida) VALUES ('${t.id}', '${p.id}', '${escapedTaskTitle}', '${t.stage}', ${t.completed ? 1 : 0});\n`;
      });

      sql += `  DELETE FROM STMI_Comentarios WHERE ProjetoID = '${p.id}';\n`;
      p.comments?.forEach((c: any) => {
        const escapedComm = c.content.replace(/'/g, "''");
        sql += `  INSERT INTO STMI_Comentarios (ID, ProjetoID, AutorID, Conteudo, DataHora) VALUES ('${c.id}', '${p.id}', '${c.authorId}', '${escapedComm}', '${c.timestamp}');\n`;
      });
    });

    sql += `\nCOMMIT;\nPRINT 'Sincronização concluída com sucesso!';`;

    // LÓGICA DE GRAVAÇÃO
    if (networkDirectoryHandle) {
      try {
        const fileHandle = await networkDirectoryHandle.getFileHandle('STMI_SYNC_PRODUCAO.sql', { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(sql);
        await writable.close();
        console.log("Arquivo gravado diretamente na rede com sucesso.");
      } catch (err) {
        console.error("Erro ao gravar direto, recorrendo ao download:", err);
        this.fallbackDownload(sql);
      }
    } else {
      this.fallbackDownload(sql);
    }

    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  },

  fallbackDownload(content: string) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `STMI_SYNC_PRODUCAO.sql`;
    a.click();
    URL.revokeObjectURL(url);
  },

  getLastSync(): string {
    return localStorage.getItem(STORAGE_KEYS.LAST_SYNC) || 'Nunca';
  },

  async getSession(): Promise<User | null> {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!raw) return null;
    const { user, expires } = JSON.parse(raw);
    return Date.now() > expires ? null : hydrate(user);
  },

  async setSession(user: User, remember: boolean) {
    const expires = Date.now() + (remember ? 30 : 1) * 24 * 60 * 60 * 1000;
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({ user, expires }));
  },

  async clearSession() { localStorage.removeItem(STORAGE_KEYS.SESSION); },

  async getAgenda(): Promise<AgendaItem[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.AGENDA);
    return raw ? hydrate(JSON.parse(raw)) : [];
  },

  async saveAgendaItem(item: AgendaItem) {
    const agenda = await this.getAgenda();
    localStorage.setItem(STORAGE_KEYS.AGENDA, JSON.stringify([...agenda.filter(i => i.id !== item.id), item]));
  },

  async deleteAgendaItem(id: string) {
    const agenda = await this.getAgenda();
    localStorage.setItem(STORAGE_KEYS.AGENDA, JSON.stringify(agenda.filter(i => i.id !== id)));
  }
};
