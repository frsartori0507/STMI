import { supabase } from './supabase';
import { Project, User, Comment, Task, ProjectStatus } from '../types';

const isValidUUID = (id: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

export const db = {
  async getUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('name');
      if (error) throw new Error(error.message);
      return data.map(u => ({
        id: u.id,
        name: u.name,
        avatar: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`,
        role: u.role,
        username: u.username,
        password: u.password,
        status: u.status as any,
        isAdmin: u.is_admin
      }));
    } catch (e: any) {
      console.error("Erro ao buscar usuários:", e);
      return [];
    }
  },

  async saveUser(user: Partial<User>) {
    try {
      const userData = {
        name: user.name,
        username: user.username,
        password: user.password,
        role: user.role,
        avatar: user.avatar,
        status: user.status,
        is_admin: user.isAdmin
      };

      if (user.id && isValidUUID(user.id)) {
        const { error } = await supabase.from('profiles').update(userData).eq('id', user.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('profiles').insert(userData);
        if (error) throw new Error(error.message);
      }
    } catch (e: any) {
      throw new Error(e.message || "Erro ao salvar usuário");
    }
  },

  async getProjects(): Promise<Project[]> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`*, tasks (*), comments (*)`)
        .order('updated_at', { ascending: false });
      
      if (error) throw new Error(error.message);
      if (!data) return [];
      
      return data.map(p => ({
        id: p.id,
        title: p.title,
        description: p.description,
        responsibleId: p.responsible_id,
        assignedUserIds: p.assigned_user_ids || [],
        status: p.status as ProjectStatus,
        address: p.address,
        neighborhood: p.neighborhood,
        createdAt: new Date(p.created_at),
        updatedAt: new Date(p.updated_at),
        tasks: (p.tasks || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          completed: t.completed,
          stage: t.stage,
          responsibleId: t.responsible_id,
          observations: t.observations || '',
          completedAt: t.completed_at ? new Date(t.completed_at) : undefined
        })),
        comments: (p.comments || []).map((c: any) => ({
          id: c.id,
          projectId: c.project_id,
          authorId: c.author_id,
          authorName: c.author_name,
          content: c.content,
          timestamp: new Date(c.created_at)
        })).sort((a: any, b: any) => a.timestamp.getTime() - b.timestamp.getTime())
      }));
    } catch (e: any) {
      console.error("Erro ao buscar projetos:", e);
      return [];
    }
  },

  async saveProject(project: Partial<Project>) {
    try {
      const projectData: any = {
        title: project.title,
        description: project.description,
        responsible_id: project.responsibleId,
        assigned_user_ids: project.assignedUserIds || [],
        status: project.status,
        address: project.address,
        neighborhood: project.neighborhood,
        updated_at: new Date()
      };

      let projectId = project.id;

      if (projectId && isValidUUID(projectId)) {
        const { error: projectError } = await supabase.from('projects').update(projectData).eq('id', projectId);
        if (projectError) throw new Error(projectError.message);
      } else {
        const { data, error: projectError } = await supabase.from('projects').insert(projectData).select().single();
        if (projectError) throw new Error(projectError.message);
        projectId = data.id;
      }

      if (projectId && project.tasks) {
        // Remove tarefas antigas primeiro
        const { error: delError } = await supabase.from('tasks').delete().eq('project_id', projectId);
        if (delError) throw new Error(delError.message);

        if (project.tasks.length > 0) {
          const tasksToInsert = project.tasks.map(t => ({
            project_id: projectId,
            title: t.title,
            completed: !!t.completed,
            stage: t.stage,
            responsible_id: isValidUUID(t.responsibleId) ? t.responsibleId : project.responsibleId,
            observations: t.observations || '',
            completed_at: t.completedAt || null
          }));
          
          const { error: taskError } = await supabase.from('tasks').insert(tasksToInsert);
          if (taskError) {
             console.error("Erro técnico nas tarefas:", taskError);
             const errorMsg = taskError.message || "Erro desconhecido nas tarefas";
             if (errorMsg.includes("observations")) {
               throw new Error("⚠️ Erro de Banco de Dados: A coluna 'observations' não existe. Por favor, execute no seu SQL Editor do Supabase: ALTER TABLE tasks ADD COLUMN observations text DEFAULT '';");
             }
             throw new Error(errorMsg);
          }
        }
      }

      return projectId;
    } catch (e: any) {
      console.error("Database Save Error:", e);
      // Garante que o que é lançado é sempre uma mensagem string e não o objeto de erro bruto
      throw new Error(e.message || "Falha ao processar salvamento no banco de dados.");
    }
  },

  async deleteProject(projectId: string) {
    try {
      if (!isValidUUID(projectId)) return;
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw new Error(error.message);
    } catch (e: any) {
      throw new Error(e.message || "Erro ao excluir o projeto.");
    }
  },

  async addComment(comment: Partial<Comment>) {
    try {
      const { error } = await supabase.from('comments').insert({
        project_id: comment.projectId,
        author_id: comment.authorId,
        author_name: comment.authorName,
        content: comment.content
      });
      if (error) throw new Error(error.message);
    } catch (e: any) {
      throw new Error(e.message || "Erro ao enviar comentário.");
    }
  },

  async setSession(user: User, remember: boolean) {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('stmi_user_id', user.id);
  },

  async getSession(): Promise<User | null> {
    const userId = localStorage.getItem('stmi_user_id') || sessionStorage.getItem('stmi_user_id');
    if (!userId || !isValidUUID(userId)) return null;

    try {
      const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error || !profile) return null;
      return {
        id: profile.id,
        name: profile.name,
        avatar: profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`,
        role: profile.role,
        username: profile.username,
        password: profile.password,
        status: profile.status as any,
        isAdmin: profile.is_admin
      };
    } catch (e) {
      return null;
    }
  },

  async clearSession() {
    localStorage.removeItem('stmi_user_id');
    sessionStorage.removeItem('stmi_user_id');
  },

  subscribeToProject(projectId: string, callback: () => void) {
    if (!isValidUUID(projectId)) return { unsubscribe: () => {} };
    return supabase
      .channel(`project:${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `project_id=eq.${projectId}` }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` }, callback)
      .subscribe();
  }
};
