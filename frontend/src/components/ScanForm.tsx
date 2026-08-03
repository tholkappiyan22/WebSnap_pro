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
      <div className="relative group">
        <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 opacity-20 blur group-hover:opacity-30 transition-opacity" />
        <div className="relative flex items-center gap-3 bg-white/[0.05] border border-white/10 rounded-2xl px-5 py-4 backdrop-blur-xl">
          <Globe className="w-5 h-5 text-white/30 flex-shrink-0" />
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (urlError) validateUrl(e.target.value);
            }}
            placeholder="Enter website URL (e.g., example.com)"
            className="flex-1 bg-transparent text-white placeholder-white/30 text-lg outline-none"
            disabled={isLoading}
            id="url-input"
          />
          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className={cn(
              'px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300',
              'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white',
              'hover:from-violet-400 hover:to-fuchsia-400 hover:shadow-lg hover:shadow-violet-500/25',
              'active:scale-95',
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
            className="flex items-center gap-2 mt-3 ml-2 text-sm text-red-400"
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
                'relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isSelected
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'bg-white/[0.03] text-white/40 border border-white/5 hover:bg-white/[0.06] hover:text-white/60'
              )}
            >
              <Icon className="w-4 h-4" />
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
          className="flex items-center gap-1.5 text-sm text-white/30 hover:text-white/50 transition-colors"
        >
          <Settings2 className="w-3.5 h-3.5" />
          Advanced Settings
          <ChevronDown
            className={cn('w-3.5 h-3.5 transition-transform', showAdvanced && 'rotate-180')}
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
            <div className="mt-4 p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-5">
              {/* Format */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <ImageIcon className="w-4 h-4" />
                  Format
                </div>
                <div className="flex gap-2">
                  {formatOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFormat(opt.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                        format === opt.id
                          ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                          : 'bg-white/[0.03] text-white/40 border border-white/5 hover:text-white/60'
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
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <Gauge className="w-4 h-4" />
                    Quality
                  </div>
                  <span className="text-sm text-violet-400 font-mono">{quality}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full accent-violet-500"
                />
              </div>

              {/* Max Pages & Depth */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/50 mb-1.5">Max Pages</label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={maxPages}
                    onChange={(e) => setMaxPages(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/50 mb-1.5">Max Depth</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={maxDepth}
                    onChange={(e) => setMaxDepth(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm outline-none focus:border-violet-500/50 transition-colors"
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
