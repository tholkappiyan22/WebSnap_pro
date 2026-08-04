'use client';

import { motion } from 'framer-motion';
import { Camera, Globe, Download, Zap } from 'lucide-react';

const features = [
  {
    icon: Globe,
    title: 'Smart Crawler',
    description: 'Discovers every page via links, sitemaps & robots.txt',
  },
  {
    icon: Camera,
    title: 'Full-Page Capture',
    description: 'Screenshots including lazy-loaded & dynamic content',
  },
  {
    icon: Zap,
    title: 'Multi-Device',
    description: 'Desktop, Laptop, Tablet & Mobile viewports',
  },
  {
    icon: Download,
    title: 'ZIP Download',
    description: 'One-click download organized by device type',
  },
];

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden py-4">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] rounded-full bg-gradient-to-tr from-violet-500/20 via-fuchsia-500/10 to-cyan-500/10 dark:from-violet-600/30 dark:to-fuchsia-600/20 blur-[100px] pointer-events-none" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-violet-100 text-violet-800 border border-violet-300 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/40 shadow-sm backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Automated Full-Site Screenshots
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white"
        >
          <span>Capture Every Page</span>
          <br />
          <span className="bg-gradient-to-r from-violet-700 via-fuchsia-600 to-indigo-700 dark:from-violet-400 dark:via-fuchsia-400 dark:to-cyan-400 bg-clip-text text-transparent">
            In One Click
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-4 text-base sm:text-lg text-slate-700 dark:text-slate-300 max-w-xl mx-auto leading-relaxed font-semibold"
        >
          Enter any URL — we crawl, capture full-page screenshots at every
          viewport, and package everything into a downloadable format.
        </motion.p>

        {/* Feature chips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-3"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-300 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 text-xs font-bold shadow-sm backdrop-blur-md"
              >
                <Icon className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                <span>{feature.title}</span>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
