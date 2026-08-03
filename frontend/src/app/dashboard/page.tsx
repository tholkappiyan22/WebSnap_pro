'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Search,
  Filter,
  Camera,
  Globe,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  BarChart3,
} from 'lucide-react';
import ScanHistory from '@/components/ScanHistory';
import { useScans } from '@/hooks/useScans';
import { deleteScan } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ScanStatus } from '@/types';

const statusFilters: { value: string; label: string; icon: React.ElementType }[] = [
  { value: '', label: 'All', icon: Filter },
  { value: 'completed', label: 'Completed', icon: CheckCircle2 },
  { value: 'capturing', label: 'In Progress', icon: Loader2 },
  { value: 'failed', label: 'Failed', icon: XCircle },
];

export default function DashboardPage() {
  const { scans, pagination, isLoading, fetchScans, refresh } = useScans(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Re-fetch when filters change
  useEffect(() => {
    fetchScans({ search: searchQuery || undefined, status: statusFilter || undefined });
  }, [searchQuery, statusFilter, fetchScans]);

  const handleDelete = async (id: string) => {
    try {
      await deleteScan(id);
      refresh();
    } catch {
      // ignore
    }
  };

  // Stats
  const totalScans = pagination.total;
  const completedScans = scans.filter((s) => s.status === 'completed').length;
  const totalPages = scans.reduce((sum, s) => sum + (s.pageCount || 0), 0);

  return (
    <div className="page-transition max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white/90">Dashboard</h1>
            <p className="text-sm text-white/40">Manage and review your scan history</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
      >
        <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Camera className="w-4 h-4 text-violet-400" />
            </div>
            <span className="text-sm text-white/40">Total Scans</span>
          </div>
          <div className="text-3xl font-bold text-white/90">{totalScans}</div>
        </div>

        <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-sm text-white/40">Completed</span>
          </div>
          <div className="text-3xl font-bold text-emerald-400">{completedScans}</div>
        </div>

        <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="text-sm text-white/40">Pages Captured</span>
          </div>
          <div className="text-3xl font-bold text-white/90">{totalPages}</div>
        </div>
      </motion.div>

      {/* Search and Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6"
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by URL..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/30 transition-colors"
            id="dashboard-search"
          />
        </div>

        {/* Status Filters */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5">
          {statusFilters.map((filter) => {
            const Icon = filter.icon;
            const isActive = statusFilter === filter.value;

            return (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  isActive
                    ? 'bg-violet-500/20 text-violet-300'
                    : 'text-white/40 hover:text-white/60'
                )}
              >
                <Icon className={cn('w-3.5 h-3.5', isActive && filter.value === 'capturing' && 'animate-spin')} />
                {filter.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Scan List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-[72px] rounded-xl" />
          ))}
        </div>
      ) : (
        <ScanHistory scans={scans} onDelete={handleDelete} showAll />
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          {Array.from({ length: pagination.totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => fetchScans({ page: i + 1, search: searchQuery || undefined, status: statusFilter || undefined })}
              className={cn(
                'w-8 h-8 rounded-lg text-sm font-medium transition-all',
                pagination.page === i + 1
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/[0.05]'
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
