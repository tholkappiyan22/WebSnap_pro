'use client';

import { useState, useEffect, use } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  ExternalLink,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import ProgressTracker from '@/components/ProgressTracker';
import ScreenshotGallery from '@/components/ScreenshotGallery';
import { useScanProgress } from '@/hooks/useScanProgress';
import { getScreenshots, getDownloadUrl } from '@/lib/api';
import { formatRelativeTime, truncateUrl } from '@/lib/utils';
import type { ScanDetail } from '@/types';

export default function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [scanData, setScanData] = useState<ScanDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { progress } = useScanProgress(id);

  // Fetch scan data
  const fetchData = async () => {
    try {
      const data = await getScreenshots(id);
      setScanData(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load scan data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  // Refresh when scan completes
  useEffect(() => {
    if (progress?.status === 'completed' || progress?.status === 'failed') {
      // Wait a moment for the backend to finalize
      setTimeout(fetchData, 1500);
    }
  }, [progress?.status]);

  // Periodic refresh while capturing
  useEffect(() => {
    if (progress?.status === 'capturing') {
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, [progress?.status]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin mx-auto" />
        <p className="text-sm text-white/40 mt-4">Loading scan data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-sm text-red-400 mb-4">{error}</p>
        <Link
          href="/"
          className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
        >
          ← Back to Home
        </Link>
      </div>
    );
  }

  const currentStatus = progress?.status || scanData?.status || 'pending';
  const isComplete = currentStatus === 'completed';

  return (
    <div className="page-transition max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
      >
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/30 hover:text-white/50 transition-colors mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>
          <h1 className="text-2xl font-bold text-white/90">Scan Results</h1>
          {scanData && (
            <div className="flex items-center gap-3 mt-2 text-sm text-white/40">
              <a
                href={scanData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-violet-400 transition-colors"
              >
                {truncateUrl(scanData.url, 60)}
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-white/10">•</span>
              <span>{formatRelativeTime(scanData.createdAt)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-sm text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>

          {isComplete && scanData && (
            <a
              href={getDownloadUrl(scanData.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold hover:from-violet-400 hover:to-fuchsia-400 transition-all hover:shadow-lg hover:shadow-violet-500/25 active:scale-95"
            >
              <Download className="w-4 h-4" />
              Download ZIP
            </a>
          )}
        </div>
      </motion.div>

      {/* Progress Tracker */}
      {!isComplete && <ProgressTracker progress={progress} />}

      {/* Screenshot Gallery */}
      {scanData && (
        <ScreenshotGallery
          pages={scanData.pages}
          scanId={scanData.id}
          scanStatus={currentStatus}
        />
      )}
    </div>
  );
}
