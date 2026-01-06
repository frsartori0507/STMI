
import { supabase } from './supabase';
import { Project, User, Comment, Task, ProjectStatus } from '../types';

export const db = {
  async getUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('name');
      if (error) throw error;
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
    } catch (e) {
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

      if (user.id && user.id.length > 20) {
        const { error } = await supabase
          .from('profiles')
          .update(userData)
          .eq('id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('profiles')
          .insert(userData);
        if (error) throw error;
      }
    } catch (e) {
      console.error("Erro ao salvar usuário:", e);
      throw e;
    }
  },

  async getProjects(): Promise<Project[]> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          tasks (*),
          comments (*)
        `)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
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
    } catch (e) {
      console.error("Erro ao buscar projetos:", e);
      return [];
    }
  },

  async saveProject(project: Partial<Project>) {
    try {
      const projectData = {
        title: project.title,
        description: project.description,
        responsible_id: project.responsibleId,
        assigned_user_ids: project.assignedUserIds,
        status: project.status,
        address: project.address,
        neighborhood: project.neighborhood,
        updated_at: new Date()
      };

      let projectId = project.id;

      if (projectId && projectId.length > 20) {
        const { error } = await supabase.from('projects').update(projectData).eq('id', projectId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('projects').insert(projectData).select().single();
        if (error) throw error;
        projectId = data.id;
      }

      if (projectId) {
        const { error: deleteError } = await supabase
          .from('tasks')
          .delete()
          .eq('project_id', projectId);
        
        if (deleteError) throw deleteError;

        if (project.tasks && project.tasks.length > 0) {
          const tasksData = project.tasks.map(t => ({
            project_id: projectId,
            title: t.title,
            completed: t.completed || false,
            stage: t.stage,
            responsible_id: t.responsibleId,
            observations: t.observations || '',
            completed_at: t.completedAt
          }));
          
          const { error: taskError } = await supabase.from('tasks').insert(tasksData);
          if (taskError) throw taskError;
        }
      }

      return projectId;
    } catch (e) {
      console.error("Erro ao salvar projeto:", e);
      throw e;
    }
  },

  async addComment(comment: Partial<Comment>) {
    const { error } = await supabase.from('comments').insert({
      project_id: comment.projectId,
      author_id: comment.authorId,
      author_name: comment.authorName,
      content: comment.content
    });
    if (error) throw error;
  },

  async setSession(user: User, remember: boolean) {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('stmi_user_id', user.id);
  },

  async getSession(): Promise<User | null> {
    const userId = localStorage.getItem('stmi_user_id') || sessionStorage.getItem('stmi_user_id');
    if (!userId) return null;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
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
    return supabase
      .channel(`project:${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `project_id=eq.${projectId}` }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` }, callback)
      .subscribe();
  }
};
