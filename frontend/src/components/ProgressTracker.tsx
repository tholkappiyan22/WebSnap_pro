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
      <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-xl">
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
                      'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500',
                      isDone
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : isActive
                        ? 'bg-violet-500/20 text-violet-400'
                        : 'bg-white/5 text-white/20'
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isActive ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'mt-2 text-xs font-medium',
                      isDone
                        ? 'text-emerald-400'
                        : isActive
                        ? 'text-violet-400'
                        : 'text-white/20'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {index < statusSteps.length - 1 && (
                  <div
                    className={cn(
                      'h-px flex-1 mx-3',
                      index < currentStepIndex ? 'bg-emerald-500/30' : 'bg-white/5'
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
              <span className="text-sm text-white/50">Progress</span>
              <span className="text-sm font-mono text-violet-400">{percentage}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-xl bg-white/[0.02]">
            <div className="text-2xl font-bold text-white/90">{progress.pagesDiscovered}</div>
            <div className="text-xs text-white/40 mt-1">Pages Found</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/[0.02]">
            <div className="text-2xl font-bold text-violet-400">
              {progress.pagesCompleted}
              <span className="text-white/20 text-lg">/{progress.pagesTotal}</span>
            </div>
            <div className="text-xs text-white/40 mt-1">Captured</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/[0.02]">
            <div className="text-2xl font-bold text-white/90">
              {progress.estimatedTimeRemaining
                ? formatDuration(progress.estimatedTimeRemaining)
                : '—'}
            </div>
            <div className="text-xs text-white/40 mt-1">ETA</div>
          </div>
        </div>

        {/* Current Page */}
        {progress.currentPage && progress.status === 'capturing' && (
          <div className="mt-4 flex items-center gap-2 text-xs text-white/30">
            <Loader2 className="w-3 h-3 animate-spin text-violet-400" />
            <span className="truncate">Capturing: {progress.currentPage}</span>
          </div>
        )}

        {/* Failed State */}
        {isFailed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
          >
            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-sm text-red-400">
              {progress.error || 'Scan failed. Please try again.'}
            </span>
          </motion.div>
        )}

        {/* Completed State */}
        {isComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-sm text-emerald-400">
              Scan completed! {progress.pagesCompleted} screenshots captured.
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
