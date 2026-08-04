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
import { getScreenshots, getDownloadUrl, getScreenshotFullUrl } from '@/lib/api';
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
        <Loader2 className="w-8 h-8 text-violet-600 dark:text-violet-400 animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-4">Loading scan data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-4">{error}</p>
        <Link
          href="/"
          className="text-sm font-bold text-violet-700 hover:text-violet-900 dark:text-violet-400 dark:hover:text-violet-300 transition-colors"
        >
          ← Back to Home
        </Link>
      </div>
    );
  }

  const currentStatus = progress?.status || scanData?.status || 'pending';
  const isComplete = currentStatus === 'completed';
  const completedPages = scanData?.pages.filter((p) => p.status === 'completed') || [];

  const handleDownloadAll = (e: React.MouseEvent) => {
    if (completedPages.length <= 5) {
      e.preventDefault();
      completedPages.forEach((page, index) => {
        const screenshotUrl = page.screenshotUrl;
        if (screenshotUrl) {
          const title = page.title;
          const pagePath = page.path;
          const deviceType = page.deviceType;
          setTimeout(() => {
            const a = document.createElement('a');
            a.href = getScreenshotFullUrl(screenshotUrl);
            const ext = screenshotUrl.split('.').pop() || 'png';
            const cleanTitle = (title || pagePath || 'screenshot').replace(/[^a-zA-Z0-9-_]/g, '_');
            a.download = `${cleanTitle}-${deviceType}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }, index * 300);
        }
      });
    }
  };

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
            className="inline-flex items-center gap-1.5 text-sm font-extrabold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            Back
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Scan Results</h1>
          {scanData && (
            <div className="flex items-center gap-3 mt-2 text-sm font-bold text-slate-600 dark:text-slate-400">
              <a
                href={scanData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-violet-700 dark:hover:text-violet-400 transition-colors"
              >
                {truncateUrl(scanData.url, 60)}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span>{formatRelativeTime(scanData.createdAt)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-extrabold text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:text-white dark:hover:bg-slate-800 shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            Refresh
          </button>

          {isComplete && scanData && completedPages.length > 0 && (
            <a
              href={completedPages.length <= 5 ? '#' : getDownloadUrl(scanData.id)}
              onClick={handleDownloadAll}
              className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-violet-700 hover:bg-violet-800 dark:bg-gradient-to-r dark:from-violet-600 dark:to-fuchsia-600 text-white text-sm font-extrabold shadow-md shadow-violet-700/20 dark:shadow-violet-600/30 hover:shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              {completedPages.length <= 5 ? (completedPages.length === 1 ? 'Download Image' : 'Download Images') : 'Download ZIP'}
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
