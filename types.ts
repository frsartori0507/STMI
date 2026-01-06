
export enum ProjectStatus {
  BACKLOG = 'BACKLOG',
  IN_PROGRESS = 'EM ANDAMENTO',
  REVIEW = 'REVISÃO',
  COMPLETED = 'CONCLUÍDO'
}

export enum TaskStage {
  SURVEY = 'LEVANTAMENTO',
  PLANNING = 'PLANEJAMENTO',
  EXECUTION = 'EXECUÇÃO',
  FINALIZATION = 'FINALIZAÇÃO'
}

export type UserStatus = 'ATIVO' | 'BLOQUEADO';

export interface User {
  id: string;
  name: string;
  avatar: string;
  role: string;
  username: string;
  password?: string;
  status: UserStatus;
  isAdmin?: boolean;
}

export interface AgendaItem {
  id: string;
  userId: string;
  title: string;
  description?: string;
  date: Date;
  type: 'REUNIAO' | 'VISITA' | 'ENTREGA' | 'OUTRO';
}

export interface Comment {
  id: string;
  projectId: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: Date;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  stage: TaskStage;
  responsibleId: string;
  observations?: string; // Novo campo para notas do RI
  completedAt?: Date;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  responsibleId: string;
  assignedUserIds: string[];
  status: ProjectStatus;
  tasks: Task[];
  comments: Comment[];
  createdAt: Date;
  updatedAt: Date;
  address?: string;
  neighborhood?: string;
}
