'use client';

import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, Search, Camera, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDuration } from '@/lib/utils';
import type { ProgressUpdate } from '@/types';

interface ProgressTrackerProps {
  progress: ProgressUpdate | null;
}

const statusSteps = [
  { key: 'crawling', label: 'Discovering Pages', icon: Search },
  { key: 'capturing', label: 'Capturing Screenshots', icon: Camera },
  { key: 'completed', label: 'Packaging', icon: Package },
];

export default function ProgressTracker({ progress }: ProgressTrackerProps) {
  if (!progress) return null;

  const percentage = progress.pagesTotal > 0
    ? Math.round((progress.pagesCompleted / progress.pagesTotal) * 100)
    : 0;

  const currentStepIndex = statusSteps.findIndex((s) => s.key === progress.status);
  const isFailed = progress.status === 'failed';
  const isComplete = progress.status === 'completed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto mt-10"
    >
      <div className="p-6 rounded-2xl bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-800 shadow-lg">
        {/* Status Steps */}
        <div className="flex items-center justify-between mb-8">
          {statusSteps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.key === progress.status;
            const isDone = index < currentStepIndex || isComplete;

            return (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 font-bold',
                      isDone
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40'
                        : isActive
                        ? 'bg-violet-100 text-violet-800 border border-violet-300 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/40 shadow-md'
                        : 'bg-slate-100 text-slate-500 border border-slate-300 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isActive ? (
                      <Loader2 className="w-5 h-5 animate-spin text-violet-600 dark:text-violet-400" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'mt-2 text-xs font-bold',
                      isDone
                        ? 'text-emerald-800 dark:text-emerald-300'
                        : isActive
                        ? 'text-violet-800 dark:text-violet-300'
                        : 'text-slate-500 dark:text-slate-400'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {index < statusSteps.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5 flex-1 mx-3',
                      index < currentStepIndex ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-800'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        {progress.status === 'capturing' && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Progress</span>
              <span className="text-sm font-mono font-extrabold text-violet-700 dark:text-violet-400">{percentage}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden border border-slate-300 dark:border-slate-700">
              <motion.div
                className="h-full rounded-full bg-violet-700 dark:bg-gradient-to-r dark:from-violet-500 dark:via-fuchsia-500 dark:to-cyan-400"
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3.5 rounded-xl bg-slate-50 border border-slate-300 dark:bg-slate-800/80 dark:border-slate-700">
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{progress.pagesDiscovered}</div>
            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1">Pages Found</div>
          </div>
          <div className="text-center p-3.5 rounded-xl bg-slate-50 border border-slate-300 dark:bg-slate-800/80 dark:border-slate-700">
            <div className="text-2xl font-extrabold text-violet-700 dark:text-violet-400">
              {progress.pagesCompleted}
              <span className="text-slate-500 dark:text-slate-500 text-lg">/{progress.pagesTotal}</span>
            </div>
            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1">Captured</div>
          </div>
          <div className="text-center p-3.5 rounded-xl bg-slate-50 border border-slate-300 dark:bg-slate-800/80 dark:border-slate-700">
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {progress.estimatedTimeRemaining
                ? formatDuration(progress.estimatedTimeRemaining)
                : '—'}
            </div>
            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1">ETA</div>
          </div>
        </div>

        {/* Current Page */}
        {progress.currentPage && progress.status === 'capturing' && (
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-700 dark:text-violet-400" />
            <span className="truncate">Capturing: {progress.currentPage}</span>
          </div>
        )}

        {/* Failed State */}
        {isFailed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 flex items-center gap-2 p-3.5 rounded-xl bg-red-100 border border-red-300 dark:bg-red-500/20 dark:border-red-500/40"
          >
            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
            <span className="text-sm font-bold text-red-800 dark:text-red-300">
              {progress.error || 'Scan failed. Please try again.'}
            </span>
          </motion.div>
        )}

        {/* Completed State */}
        {isComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 flex items-center gap-2 p-3.5 rounded-xl bg-emerald-100 border border-emerald-300 dark:bg-emerald-500/20 dark:border-emerald-500/40"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
              Scan completed! {progress.pagesCompleted} screenshots captured.
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
