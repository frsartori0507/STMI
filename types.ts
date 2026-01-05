
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
  // Fix: Added optional description field to resolve error in AgendaCalendar.tsx
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
  targetUserId?: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  stage: TaskStage;
  // Fix: Added missing responsibleId and completedAt fields to resolve errors in initialData.ts
  responsibleId?: string;
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
  // Fix: Added missing number and neighborhood fields to resolve errors in ProjectModal.tsx
  number?: string;
  neighborhood?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}
