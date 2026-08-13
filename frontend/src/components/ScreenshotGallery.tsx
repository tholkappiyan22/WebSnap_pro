'use client';

import { useState, useEffect } from 'react';
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
  Loader2,
} from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils';
import { getScreenshotFullUrl, fetchImageBlob } from '@/lib/api';
import { getScreenshotObjectUrl, saveScreenshotBlob } from '@/lib/indexeddb';
import { downloadZipFromBrowserMemory } from '@/lib/zip';
import type { PageResult } from '@/types';

interface ScreenshotGalleryProps {
  pages: PageResult[];
  scanId: string;
  scanStatus: string;
  scanUrl?: string;
}

const deviceIcons: Record<string, React.ElementType> = {
  desktop: Monitor,
  laptop: Laptop,
  tablet: Tablet,
  mobile: Smartphone,
};

export default function ScreenshotGallery({ pages, scanId, scanStatus, scanUrl = '' }: ScreenshotGalleryProps) {
  const [selectedPage, setSelectedPage] = useState<PageResult | null>(null);
  const [filterDevice, setFilterDevice] = useState<string>('all');
  const [blobUrls, setBlobUrls] = useState<Record<string, { full?: string; thumb?: string }>>({});
  const [isZipping, setIsZipping] = useState(false);

  const completedPages = pages.filter((p) => p.status === 'completed');
  const failedPages = pages.filter((p) => p.status === 'failed');

  const filteredPages = filterDevice === 'all'
    ? completedPages
    : completedPages.filter((p) => p.deviceType === filterDevice);

  const deviceTypes = [...new Set(pages.map((p) => p.deviceType))];

  // Load / cache images in browser memory (IndexedDB)
  useEffect(() => {
    let isMounted = true;

    async function loadAndCacheImages() {
      const updates: Record<string, { full?: string; thumb?: string }> = {};

      for (const page of completedPages) {
        let fullUrl: string | null = await getScreenshotObjectUrl(scanId, page.id, 'full');
        let thumbUrl: string | null = await getScreenshotObjectUrl(scanId, page.id, 'thumb');

        // Cache full image to browser IndexedDB if missing
        if (!fullUrl && page.screenshotUrl) {
          try {
            const blob = await fetchImageBlob(page.screenshotUrl);
            const ext = page.screenshotUrl.split('.').pop() || 'png';
            const cleanTitle = (page.title || page.path || 'screenshot').replace(/[^a-zA-Z0-9-_]/g, '_');
            const filename = `${cleanTitle}-${page.deviceType}.${ext}`;
            await saveScreenshotBlob(scanId, page.id, 'full', blob, filename);
            fullUrl = URL.createObjectURL(blob);
          } catch (e) {
            fullUrl = getScreenshotFullUrl(page.screenshotUrl);
          }
        }

        // Cache thumbnail to browser IndexedDB if missing
        if (!thumbUrl && page.thumbnailUrl) {
          try {
            const blob = await fetchImageBlob(page.thumbnailUrl);
            const ext = page.thumbnailUrl.split('.').pop() || 'png';
            const cleanTitle = (page.title || page.path || 'screenshot').replace(/[^a-zA-Z0-9-_]/g, '_');
            const filename = `${cleanTitle}-${page.deviceType}-thumb.${ext}`;
            await saveScreenshotBlob(scanId, page.id, 'thumb', blob, filename);
            thumbUrl = URL.createObjectURL(blob);
          } catch (e) {
            thumbUrl = getScreenshotFullUrl(page.thumbnailUrl);
          }
        }

        updates[page.id] = {
          full: fullUrl || (page.screenshotUrl ? getScreenshotFullUrl(page.screenshotUrl) : undefined),
          thumb: thumbUrl || (page.thumbnailUrl ? getScreenshotFullUrl(page.thumbnailUrl) : undefined),
        };
      }

      if (isMounted) {
        setBlobUrls(updates);
      }
    }

    if (completedPages.length > 0) {
      loadAndCacheImages();
    }

    return () => {
      isMounted = false;
    };
  }, [completedPages.length, scanId]);

  const handleDownloadAll = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (completedPages.length === 0 || isZipping) return;

    try {
      setIsZipping(true);
      await downloadZipFromBrowserMemory(scanId, scanUrl, completedPages);
    } catch (err) {
      console.error('Browser memory ZIP creation failed:', err);
    } finally {
      setIsZipping(false);
    }
  };

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
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Screenshots</h2>
          <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mt-1">
            {completedPages.length} captured
            {failedPages.length > 0 && `, ${failedPages.length} failed`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Device Filter */}
          <div className="flex gap-1 p-1 rounded-xl bg-slate-100 border border-slate-300 dark:bg-slate-900 dark:border-slate-800">
            <button
              onClick={() => setFilterDevice('all')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                filterDevice === 'all'
                  ? 'bg-violet-700 text-white shadow-xs dark:bg-violet-600 dark:text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
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
                    'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                    filterDevice === device
                      ? 'bg-violet-700 text-white shadow-xs dark:bg-violet-600 dark:text-white shadow-md'
                      : 'text-slate-700 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline capitalize">{device}</span>
                </button>
              );
            })}
          </div>

          {/* Download All (Browser Memory JSZip) */}
          {scanStatus === 'completed' && completedPages.length > 0 && (
            <button
              onClick={handleDownloadAll}
              disabled={isZipping}
              className="flex items-center gap-2 px-4.5 py-2.5 rounded-xl bg-violet-700 hover:bg-violet-800 dark:bg-gradient-to-r dark:from-violet-600 dark:to-fuchsia-600 text-white text-sm font-extrabold shadow-md shadow-violet-700/20 dark:shadow-violet-600/30 hover:shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              id="download-button"
            >
              {isZipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isZipping ? 'Generating ZIP...' : (completedPages.length <= 5 ? (completedPages.length === 1 ? 'Download Image' : 'Download Images') : 'Download ZIP')}
            </button>
          )}
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredPages.map((page, index) => {
            const DeviceIcon = deviceIcons[page.deviceType] || Monitor;
            const displayThumb = blobUrls[page.id]?.thumb || blobUrls[page.id]?.full || (page.thumbnailUrl ? getScreenshotFullUrl(page.thumbnailUrl) : null);
            const displayFull = blobUrls[page.id]?.full || (page.screenshotUrl ? getScreenshotFullUrl(page.screenshotUrl) : '#');

            return (
              <motion.div
                key={page.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="group relative rounded-2xl border border-slate-300 bg-white hover:border-violet-500 dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-violet-500/50 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300"
              >
                {/* Thumbnail */}
                <div className="relative aspect-[16/10] bg-slate-100 dark:bg-slate-950 overflow-hidden border-b border-slate-200 dark:border-slate-800">
                  {displayThumb ? (
                    <img
                      src={displayThumb}
                      alt={page.title || page.path}
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <FileImage className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                    </div>
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
                      <button
                        onClick={() => setSelectedPage(page)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/90 text-slate-900 dark:bg-slate-900/90 dark:text-white border border-slate-200 dark:border-slate-700 backdrop-blur-md text-xs font-bold hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <ZoomIn className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                        Preview
                      </button>
                      {displayFull && (
                        <a
                          href={displayFull}
                          download
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/90 text-slate-900 dark:bg-slate-900/90 dark:text-white border border-slate-200 dark:border-slate-700 backdrop-blur-md text-xs font-bold hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Device Badge */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700 backdrop-blur-md text-white text-xs font-extrabold shadow-sm">
                    <DeviceIcon className="w-3 h-3 text-violet-400" />
                    <span className="capitalize">{page.deviceType}</span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                    {page.title || page.path}
                  </h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate max-w-[60%]">{page.path}</span>
                    {page.fileSize && (
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-mono font-bold bg-slate-100 border border-slate-300 dark:bg-slate-800 dark:border-slate-700 px-2 py-0.5 rounded-md">
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
          <h3 className="flex items-center gap-2 text-sm font-semibold text-red-500 dark:text-red-400 mb-2">
            <AlertCircle className="w-4 h-4" />
            Failed Screenshots ({failedPages.length})
          </h3>
          <div className="space-y-1">
            {failedPages.map((page) => (
              <div key={page.id} className="flex items-center justify-between text-xs text-red-600/70 dark:text-red-300/60">
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setSelectedPage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl max-h-[90vh] overflow-auto rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedPage(null)}
                className="absolute top-3 right-3 z-10 p-2 rounded-full bg-slate-900/60 text-white hover:bg-slate-900/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Image */}
              {(selectedPage.screenshotUrl || blobUrls[selectedPage.id]?.full) && (
                <img
                  src={blobUrls[selectedPage.id]?.full || getScreenshotFullUrl(selectedPage.screenshotUrl!)}
                  alt={selectedPage.title || selectedPage.path}
                  className="w-full"
                />
              )}

              {/* Info bar */}
              <div className="p-4 border-t border-slate-200 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-zinc-900">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white/80">
                    {selectedPage.title || selectedPage.path}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-white/40">
                    <span>{selectedPage.viewportWidth}×{selectedPage.viewportHeight}</span>
                    {selectedPage.fileSize && <span>{formatBytes(selectedPage.fileSize)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={selectedPage.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-slate-200/80 dark:bg-white/5 text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/10 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  {selectedPage.screenshotUrl && (
                    <a
                      href={blobUrls[selectedPage.id]?.full || getScreenshotFullUrl(selectedPage.screenshotUrl)}
                      download
                      className="p-2 rounded-lg bg-slate-200/80 dark:bg-white/5 text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/10 transition-colors"
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

