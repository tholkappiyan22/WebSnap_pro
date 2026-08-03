'use client';

import { Camera } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-white/30">
            <Camera className="w-4 h-4" />
            <span>
              WebSnap<span className="text-violet-400">Pro</span>
            </span>
            <span className="text-white/10">|</span>
            <span>Automated Website Screenshots</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-white/20">
            <span>Built with Next.js, Playwright & Express</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
