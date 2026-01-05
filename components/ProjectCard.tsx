
import React from 'react';
import { Project, User, TaskStage } from '../types';
import { STATUS_COLORS, STAGE_WEIGHTS } from '../constants';

interface ProjectCardProps {
  project: Project;
  responsible: User | undefined;
  onClick: (project: Project) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, responsible, onClick }) => {
  
  const calculateWeightedProgress = () => {
    if (!project.tasks || project.tasks.length === 0) return 0;
    
    let totalProgress = 0;
    const stages = Object.values(TaskStage);
    
    stages.forEach(stage => {
      const stageTasks = project.tasks.filter(t => t.stage === stage);
      if (stageTasks.length > 0) {
        const completedInStage = stageTasks.filter(t => t.completed).length;
        const stageProgress = (completedInStage / stageTasks.length) * STAGE_WEIGHTS[stage];
        totalProgress += stageProgress;
      } else {
        // Se não houver tarefas em uma etapa, ela não "pesa" negativamente no progresso atual
        // Mas para manter a lógica do usuário de que a última etapa vale 50%, 
        // consideramos etapas vazias como 0% de contribuição, ou podemos redistribuir.
        // Aqui, para ser intuitivo: só ganha os 50% se fizer as tarefas da finalização.
      }
    });

    return totalProgress * 100;
  };

  const progress = calculateWeightedProgress();

  return (
    <div 
      onClick={() => onClick(project)}
      className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer group flex flex-col h-full"
    >
      <div className="flex justify-between items-center mb-4">
        <span className={`text-[9px] sm:text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${STATUS_COLORS[project.status]}`}>
          {project.status}
        </span>
        <span className="text-slate-400 text-[10px] font-bold">
          {new Date(project.updatedAt).toLocaleDateString('pt-BR')}
        </span>
      </div>
      
      <h3 className="text-lg sm:text-xl font-black text-slate-800 mb-2 group-hover:text-blue-600 transition-colors tracking-tight line-clamp-1">
        {project.title}
      </h3>
      
      <p className="text-slate-500 text-xs sm:text-sm font-medium line-clamp-2 mb-6 flex-grow leading-relaxed">
        {project.description}
      </p>
      
      <div className="flex items-center gap-3 mb-6 p-2 bg-slate-50 rounded-2xl border border-slate-100">
        <img 
          src={responsible?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${project.responsibleId}`} 
          alt={responsible?.name} 
          className="w-8 h-8 rounded-full border border-white shadow-sm"
        />
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] sm:text-xs font-black text-slate-700 truncate tracking-tight">{responsible?.name || 'Responsável Removido'}</span>
          <span className="text-[8px] sm:text-[10px] text-slate-400 font-bold truncate uppercase">{responsible?.role || '---'}</span>
        </div>
      </div>
      
      <div className="mt-auto">
        <div className="flex justify-between items-end mb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <span>Progresso Ponderado</span>
          <span className="text-blue-600">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden ring-4 ring-slate-50/50">
          <div 
            className="bg-blue-600 h-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(37,99,235,0.4)]" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
