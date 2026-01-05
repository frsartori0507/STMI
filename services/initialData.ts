
import { User, Project, ProjectStatus, TaskStage } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'admin',
    name: 'Administrador STMI',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    role: 'Administrador do Sistema',
    username: 'admin',
    password: '123',
    status: 'ATIVO',
    isAdmin: true
  }
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'welcome-project',
    title: 'Projeto de Boas-Vindas STMI',
    description: 'Este é um projeto de demonstração para ilustrar o funcionamento das etapas ponderadas e do chat da equipe.',
    responsibleId: 'admin',
    assignedUserIds: ['admin'],
    status: ProjectStatus.IN_PROGRESS,
    tasks: [
      {
        id: 't1',
        title: 'Explorar a nova interface de etapas',
        completed: true,
        stage: TaskStage.SURVEY,
        responsibleId: 'admin',
        completedAt: new Date()
      },
      {
        id: 't2',
        title: 'Testar o cálculo de 50% da etapa de Finalização',
        completed: false,
        stage: TaskStage.FINALIZATION,
        responsibleId: 'admin'
      }
    ],
    comments: [
      {
        id: 'c1',
        projectId: 'welcome-project',
        authorId: 'admin',
        authorName: 'Sistema',
        content: 'Bem-vindo ao novo sistema de gestão de projetos STMI!',
        timestamp: new Date()
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    address: 'Sede Administrativa',
    neighborhood: 'Centro'
  }
];
