'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  AlertCircle,
  Loader2,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Settings2,
  ChevronDown,
  ImageIcon,
  Layers,
  Gauge,
  ClipboardPaste,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScanConfig, ImageFormat } from '@/types';

interface ScanFormProps {
  onSubmit: (config: ScanConfig) => void;
  isLoading: boolean;
}

const devicePresets = [
  {
    id: 'desktop',
    label: 'Desktop Only',
    description: '1920×1080',
    icon: Monitor,
    devices: 'desktop',
  },
  {
    id: 'desktop-mobile',
    label: 'Desktop + Mobile',
    description: '1920×1080 & 390×844',
    icon: Smartphone,
    devices: 'desktop,mobile',
  },
  {
    id: 'all',
    label: 'All Devices',
    description: '4 viewports',
    icon: Layers,
    devices: 'desktop,laptop,tablet,mobile',
  },
];

const formatOptions: { id: ImageFormat; label: string }[] = [
  { id: 'png', label: 'PNG' },
  { id: 'jpeg', label: 'JPEG' },
  { id: 'webp', label: 'WebP' },
];

export default function ScanForm({ onSubmit, isLoading }: ScanFormProps) {
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [selectedDevice, setSelectedDevice] = useState('desktop');
  const [format, setFormat] = useState<ImageFormat>('png');
  const [quality, setQuality] = useState(90);
  const [maxPages, setMaxPages] = useState(50);
  const [maxDepth, setMaxDepth] = useState(3);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pasteSuccess, setPasteSuccess] = useState(false);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setPasteSuccess(true);
        setTimeout(() => setPasteSuccess(false), 1500);
      }
    } catch {
      // Clipboard API denied — fallback: focus the input so user can Ctrl+V
      document.getElementById('url-input')?.focus();
    }
  };

  const validateUrl = (value: string): boolean => {
    if (!value.trim()) {
      setUrlError('Please enter a website URL');
      return false;
    }

    // Basic URL pattern
    const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/i;
    if (!urlPattern.test(value.trim())) {
      setUrlError('Please enter a valid URL (e.g., example.com)');
      return false;
    }

    setUrlError('');
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateUrl(url)) return;

    const deviceConfig = devicePresets.find((d) => d.id === selectedDevice);

    onSubmit({
      url: url.trim(),
      deviceTypes: deviceConfig?.devices || 'desktop',
      format,
      quality,
      maxPages,
      maxDepth,
    });
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="max-w-2xl mx-auto"
    >
      {/* URL Input */}
      <div className="relative">
        <div className="relative flex items-center gap-3 bg-white border-2 border-slate-300 focus-within:border-violet-600 dark:bg-slate-900/90 dark:border-slate-700 dark:focus-within:border-violet-500 rounded-2xl px-5 py-3.5 shadow-lg dark:shadow-xl dark:shadow-slate-950/60 backdrop-blur-xl transition-all">
          <Globe className="w-5 h-5 text-slate-400 dark:text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (urlError) validateUrl(e.target.value);
            }}
            placeholder="Enter website URL (e.g., example.com)"
            className="flex-1 bg-transparent text-slate-900 placeholder-slate-400 dark:text-white dark:placeholder-slate-500 text-base sm:text-lg font-semibold outline-none"
            disabled={isLoading}
            id="url-input"
          />

          {/* Paste button */}
          <button
            type="button"
            onClick={handlePaste}
            disabled={isLoading}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex-shrink-0 cursor-pointer',
              pasteSuccess
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40'
                : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:text-white',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
            id="paste-button"
            title="Paste URL from clipboard"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            <span className="hidden sm:inline">{pasteSuccess ? 'Pasted!' : 'Paste'}</span>
          </button>

          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className={cn(
              'px-6 py-2.5 rounded-xl text-sm font-extrabold transition-all duration-200 cursor-pointer',
              'bg-violet-700 hover:bg-violet-800 dark:bg-gradient-to-r dark:from-violet-600 dark:to-fuchsia-600 text-white',
              'shadow-md shadow-violet-700/20 hover:shadow-violet-700/40 active:scale-95',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none'
            )}
            id="scan-button"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Scanning...
              </span>
            ) : (
              'Scan'
            )}
          </button>
        </div>
      </div>

      {/* URL Error */}
      <AnimatePresence>
        {urlError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 mt-3 ml-2 text-sm text-red-600 dark:text-red-400 font-semibold"
          >
            <AlertCircle className="w-4 h-4" />
            {urlError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Device Selection */}
      <div className="mt-6 flex items-center gap-3 justify-center">
        {devicePresets.map((preset) => {
          const Icon = preset.icon;
          const isSelected = selectedDevice === preset.id;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => setSelectedDevice(preset.id)}
              disabled={isLoading}
              className={cn(
                'relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-extrabold transition-all duration-200 cursor-pointer',
                isSelected
                  ? 'bg-violet-700 text-white border border-violet-700 shadow-md shadow-violet-700/20 dark:bg-violet-600 dark:border-violet-500'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white shadow-xs'
              )}
            >
              <Icon className={cn('w-4 h-4', isSelected ? 'text-white' : 'text-violet-600 dark:text-violet-400')} />
              <span className="hidden sm:inline">{preset.label}</span>
            </button>
          );
        })}
      </div>

      {/* Advanced Settings Toggle */}
      <div className="mt-5 flex justify-center">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 text-sm font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
        >
          <Settings2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          Advanced Settings
          <ChevronDown
            className={cn('w-4 h-4 transition-transform text-slate-500 dark:text-slate-400', showAdvanced && 'rotate-180')}
          />
        </button>
      </div>

      {/* Advanced Settings Panel */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-4 p-5 rounded-2xl bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-800 shadow-lg space-y-5">
              {/* Format */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                  <ImageIcon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  Format
                </div>
                <div className="flex gap-2">
                  {formatOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFormat(opt.id)}
                      className={cn(
                        'px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer',
                        format === opt.id
                          ? 'bg-violet-700 text-white border border-violet-700 dark:bg-violet-600 dark:border-violet-500 shadow-xs'
                          : 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 dark:hover:text-white'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                    <Gauge className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    Quality
                  </div>
                  <span className="text-sm text-violet-700 dark:text-violet-400 font-mono font-extrabold">{quality}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full accent-violet-700 dark:accent-violet-500 cursor-pointer"
                />
              </div>

              {/* Max Pages & Depth */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-300 mb-1.5">Max Pages</label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={maxPages}
                    onChange={(e) => setMaxPages(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white font-bold text-sm outline-none focus:border-violet-600 dark:focus:border-violet-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-300 mb-1.5">Max Depth</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={maxDepth}
                    onChange={(e) => setMaxDepth(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white font-bold text-sm outline-none focus:border-violet-600 dark:focus:border-violet-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.form>
  );
}
