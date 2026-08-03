'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRight,
  Globe,
  Trash2,
} from 'lucide-react';
import { cn, formatRelativeTime, truncateUrl } from '@/lib/utils';
import type { Scan, ScanStatus } from '@/types';

interface ScanHistoryProps {
  scans: Scan[];
  onDelete?: (id: string) => void;
  showAll?: boolean;
}

const statusConfig: Record<ScanStatus, { icon: React.ElementType; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-amber-400', label: 'Pending' },
  crawling: { icon: Loader2, color: 'text-cyan-400', label: 'Crawling' },
  capturing: { icon: Loader2, color: 'text-violet-400', label: 'Capturing' },
  completed: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-red-400', label: 'Failed' },
};

export default function ScanHistory({ scans, onDelete, showAll = false }: ScanHistoryProps) {
  const displayScans = showAll ? scans : scans.slice(0, 5);

  if (displayScans.length === 0) {
    return (
      <div className="mt-12 text-center py-12">
        <Globe className="w-10 h-10 text-white/10 mx-auto mb-3" />
        <p className="text-sm text-white/30">No scans yet. Enter a URL above to get started.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="mt-12"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white/80">Recent Scans</h2>
        {!showAll && scans.length > 5 && (
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition-colors"
          >
            View all
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      <div className="space-y-2">
        {displayScans.map((scan, index) => {
          const config = statusConfig[scan.status] || statusConfig.pending;
          const StatusIcon = config.icon;
          const isActive = scan.status === 'crawling' || scan.status === 'capturing';

          return (
            <motion.div
              key={scan.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Link
                href={`/scan/${scan.id}`}
                className="group flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all duration-200"
              >
                {/* Status Icon */}
                <div
                  className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                    scan.status === 'completed' && 'bg-emerald-500/10',
                    scan.status === 'failed' && 'bg-red-500/10',
                    isActive && 'bg-violet-500/10',
                    scan.status === 'pending' && 'bg-amber-500/10'
                  )}
                >
                  <StatusIcon
                    className={cn(
                      'w-4 h-4',
                      config.color,
                      isActive && 'animate-spin'
                    )}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white/80 truncate">
                      {truncateUrl(scan.url, 45)}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                        scan.status === 'completed' && 'bg-emerald-500/10 text-emerald-400',
                        scan.status === 'failed' && 'bg-red-500/10 text-red-400',
                        isActive && 'bg-violet-500/10 text-violet-400',
                        scan.status === 'pending' && 'bg-amber-500/10 text-amber-400'
                      )}
                    >
                      {config.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-white/30">
                    <span>{formatRelativeTime(scan.createdAt)}</span>
                    {scan.pageCount > 0 && <span>{scan.pageCount} pages</span>}
                    <span className="uppercase text-[10px]">{scan.deviceTypes.split(',')[0]}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDelete(scan.id);
                      }}
                      className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
