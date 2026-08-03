'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  ExternalLink,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  X,
  ZoomIn,
  AlertCircle,
  FileImage,
} from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils';
import { getScreenshotFullUrl, getDownloadUrl } from '@/lib/api';
import type { PageResult } from '@/types';

interface ScreenshotGalleryProps {
  pages: PageResult[];
  scanId: string;
  scanStatus: string;
}

const deviceIcons: Record<string, React.ElementType> = {
  desktop: Monitor,
  laptop: Laptop,
  tablet: Tablet,
  mobile: Smartphone,
};

export default function ScreenshotGallery({ pages, scanId, scanStatus }: ScreenshotGalleryProps) {
  const [selectedPage, setSelectedPage] = useState<PageResult | null>(null);
  const [filterDevice, setFilterDevice] = useState<string>('all');

  const completedPages = pages.filter((p) => p.status === 'completed');
  const failedPages = pages.filter((p) => p.status === 'failed');

  const filteredPages = filterDevice === 'all'
    ? completedPages
    : completedPages.filter((p) => p.deviceType === filterDevice);

  const deviceTypes = [...new Set(pages.map((p) => p.deviceType))];

  if (scanStatus !== 'completed' && completedPages.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mt-10"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white/90">Screenshots</h2>
          <p className="text-sm text-white/40 mt-1">
            {completedPages.length} captured
            {failedPages.length > 0 && `, ${failedPages.length} failed`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Device Filter */}
          <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5">
            <button
              onClick={() => setFilterDevice('all')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                filterDevice === 'all'
                  ? 'bg-violet-500/20 text-violet-300'
                  : 'text-white/40 hover:text-white/60'
              )}
            >
              All
            </button>
            {deviceTypes.map((device) => {
              const Icon = deviceIcons[device] || Monitor;
              return (
                <button
                  key={device}
                  onClick={() => setFilterDevice(device)}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    filterDevice === device
                      ? 'bg-violet-500/20 text-violet-300'
                      : 'text-white/40 hover:text-white/60'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline capitalize">{device}</span>
                </button>
              );
            })}
          </div>

          {/* Download All */}
          {scanStatus === 'completed' && (
            <a
              href={getDownloadUrl(scanId)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold hover:from-violet-400 hover:to-fuchsia-400 transition-all hover:shadow-lg hover:shadow-violet-500/25 active:scale-95"
              id="download-zip-button"
            >
              <Download className="w-4 h-4" />
              Download ZIP
            </a>
          )}
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredPages.map((page, index) => {
            const DeviceIcon = deviceIcons[page.deviceType] || Monitor;

            return (
              <motion.div
                key={page.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="group relative rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300"
              >
                {/* Thumbnail */}
                <div className="relative aspect-[16/10] bg-white/[0.02] overflow-hidden">
                  {page.thumbnailUrl ? (
                    <img
                      src={getScreenshotFullUrl(page.thumbnailUrl)}
                      alt={page.title || page.path}
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <FileImage className="w-8 h-8 text-white/10" />
                    </div>
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
                      <button
                        onClick={() => setSelectedPage(page)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white text-xs font-medium hover:bg-white/30 transition-colors"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                        Preview
                      </button>
                      {page.screenshotUrl && (
                        <a
                          href={getScreenshotFullUrl(page.screenshotUrl)}
                          download
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white text-xs font-medium hover:bg-white/30 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Device Badge */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-sm text-white/70 text-xs">
                    <DeviceIcon className="w-3 h-3" />
                    <span className="capitalize">{page.deviceType}</span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-white/80 truncate">
                    {page.title || page.path}
                  </h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-white/30 truncate max-w-[60%]">{page.path}</span>
                    {page.fileSize && (
                      <span className="text-xs text-white/30 font-mono">
                        {formatBytes(page.fileSize)}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Failed Pages */}
      {failedPages.length > 0 && (
        <div className="mt-6 p-4 rounded-2xl bg-red-500/5 border border-red-500/10">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-red-400 mb-2">
            <AlertCircle className="w-4 h-4" />
            Failed Screenshots ({failedPages.length})
          </h3>
          <div className="space-y-1">
            {failedPages.map((page) => (
              <div key={page.id} className="flex items-center justify-between text-xs text-red-300/60">
                <span className="truncate">{page.url}</span>
                <span className="ml-2 flex-shrink-0">{page.errorMessage}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedPage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setSelectedPage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl max-h-[90vh] overflow-auto rounded-2xl bg-zinc-900 border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedPage(null)}
                className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Image */}
              {selectedPage.screenshotUrl && (
                <img
                  src={getScreenshotFullUrl(selectedPage.screenshotUrl)}
                  alt={selectedPage.title || selectedPage.path}
                  className="w-full"
                />
              )}

              {/* Info bar */}
              <div className="p-4 border-t border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white/80">
                    {selectedPage.title || selectedPage.path}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                    <span>{selectedPage.viewportWidth}×{selectedPage.viewportHeight}</span>
                    {selectedPage.fileSize && <span>{formatBytes(selectedPage.fileSize)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={selectedPage.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  {selectedPage.screenshotUrl && (
                    <a
                      href={getScreenshotFullUrl(selectedPage.screenshotUrl)}
                      download
                      className="p-2 rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
