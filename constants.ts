
import { ProjectStatus, TaskStage } from './types';

export const STATUS_COLORS: Record<ProjectStatus, string> = {
  [ProjectStatus.BACKLOG]: 'bg-slate-100 text-slate-700',
  [ProjectStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-700',
  [ProjectStatus.REVIEW]: 'bg-amber-100 text-amber-700',
  [ProjectStatus.COMPLETED]: 'bg-emerald-100 text-emerald-700',
};

export const STAGE_WEIGHTS: Record<TaskStage, number> = {
  [TaskStage.SURVEY]: 0.10,      // 10%
  [TaskStage.PLANNING]: 0.15,    // 15%
  [TaskStage.EXECUTION]: 0.25,   // 25%
  [TaskStage.FINALIZATION]: 0.50 // 50%
};

export const STAGE_COLORS: Record<TaskStage, string> = {
  [TaskStage.SURVEY]: 'border-slate-200 text-slate-600',
  [TaskStage.PLANNING]: 'border-blue-200 text-blue-600',
  [TaskStage.EXECUTION]: 'border-indigo-200 text-indigo-600',
  [TaskStage.FINALIZATION]: 'border-emerald-200 text-emerald-600',
};
