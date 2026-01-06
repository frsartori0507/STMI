
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
    const stages = [
      { stage: TaskStage.SURVEY, weight: STAGE_WEIGHTS[TaskStage.SURVEY] },
      { stage: TaskStage.PLANNING, weight: STAGE_WEIGHTS[TaskStage.PLANNING] },
      { stage: TaskStage.EXECUTION, weight: STAGE_WEIGHTS[TaskStage.EXECUTION] },
      { stage: TaskStage.FINALIZATION, weight: STAGE_WEIGHTS[TaskStage.FINALIZATION] }
    ];
    
    stages.forEach(s => {
      const stageTasks = project.tasks.filter(t => t.stage === s.stage);
      if (stageTasks.length > 0) {
        const completedInStage = stageTasks.filter(t => t.completed).length;
        totalProgress += (completedInStage / stageTasks.length) * s.weight;
      }
    });

    return Math.round(Math.min(totalProgress * 100, 100));
  };

  const progress = calculateWeightedProgress();

  return (
    <div 
      onClick={() => onClick(project)}
      className="bg-white rounded-[2rem] border border-slate-200 p-7 shadow-sm hover:shadow-2xl hover:border-blue-300 transition-all cursor-pointer group flex flex-col h-full active:scale-[0.98]"
    >
      <div className="flex justify-between items-center mb-5">
        <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest ${STATUS_COLORS[project.status]}`}>
          {project.status}
        </span>
        <div className="flex items-center gap-1.5">
           <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
           <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
             {new Date(project.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
           </span>
        </div>
      </div>
      
      <h3 className="text-xl font-black text-slate-800 mb-2 group-hover:text-blue-600 transition-colors tracking-tight line-clamp-1">
        {project.title}
      </h3>
      
      <p className="text-slate-500 text-[13px] font-medium line-clamp-2 mb-8 flex-grow leading-relaxed">
        {project.description}
      </p>
      
      <div className="flex items-center gap-4 mb-8 p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
        <div className="relative">
          <img src={responsible?.avatar} className="w-10 h-10 rounded-xl border-2 border-white shadow-sm" alt="" />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-black text-slate-800 truncate">{responsible?.name || 'Coordenação'}</span>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Gestor Responsável</span>
        </div>
      </div>
      
      <div className="mt-auto space-y-3">
        <div className="flex justify-between items-end text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
          <span>Conclusão Ponderada</span>
          <span className="text-blue-600 text-sm">{progress}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-blue-600 h-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(37,99,235,0.4)]" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between gap-1.5 opacity-40">
           {Object.keys(STAGE_WEIGHTS).map((_, i) => (
             <div key={i} className="h-1 flex-1 bg-slate-200 rounded-full"></div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
