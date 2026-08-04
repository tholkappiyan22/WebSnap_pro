'use client';

import { Camera } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
            <Camera className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span className="font-extrabold text-slate-900 dark:text-white">
              WebSnap<span className="text-violet-600 dark:text-violet-400">Pro</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>Automated Website Screenshots</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-500">
            <span>Built with Next.js, Playwright & Express</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
