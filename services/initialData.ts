
import { User, Project, ProjectStatus, TaskStage } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'admin',
    name: 'Eng. Roberto Almeida',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin&backgroundColor=b6e3f4',
    role: 'Coordenador Geral de Infra',
    username: 'admin',
    password: '123',
    status: 'ATIVO',
    isAdmin: true
  },
  {
    id: 'user1',
    name: 'Dra. Mariana Souza',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mariana&backgroundColor=ffdfbf',
    role: 'Técnica de Planejamento',
    username: 'mariana',
    password: '123',
    status: 'ATIVO'
  }
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'p1',
    title: 'Recuperação Viária Setor Norte',
    description: 'Projeto de recapeamento e sinalização horizontal do Setor Norte da cidade, focando em durabilidade e acessibilidade.',
    responsibleId: 'admin',
    assignedUserIds: ['admin', 'user1'],
    status: ProjectStatus.IN_PROGRESS,
    tasks: [
      {
        id: 't1',
        title: 'Topografia do Trecho A',
        completed: true,
        stage: TaskStage.SURVEY,
        responsibleId: 'admin'
      },
      {
        id: 't2',
        title: 'Definição do Material Asfáltico',
        completed: false,
        stage: TaskStage.PLANNING,
        responsibleId: 'user1'
      }
    ],
    comments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    address: 'Av. das Indústrias',
    neighborhood: 'Distrito Industrial'
  }
];
