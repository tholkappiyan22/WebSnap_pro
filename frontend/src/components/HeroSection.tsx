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
    <section className="relative overflow-hidden pt-16 pb-24">
      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-violet-600/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-fuchsia-600/15 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/3 right-1/3 w-[400px] h-[400px] rounded-full bg-cyan-600/10 blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Automated Full-Site Screenshots
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-8 text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight"
        >
          <span className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
            Capture Every Page
          </span>
          <br />
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
            In One Click
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 text-lg sm:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed"
        >
          Enter any URL and WebSnap Pro automatically crawls the entire site,
          captures full-page screenshots at multiple viewport sizes, and packages
          everything into a downloadable ZIP.
        </motion.p>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                className="group relative p-5 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center mb-3 mx-auto group-hover:scale-110 transition-transform">
                  <Icon className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="text-sm font-semibold text-white/90">{feature.title}</h3>
                <p className="mt-1 text-xs text-white/40 leading-relaxed">{feature.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
