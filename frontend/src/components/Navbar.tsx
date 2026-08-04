'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Camera, LayoutDashboard, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from './ThemeProvider';

export default function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const links = [
    { href: '/', label: 'Home', icon: Camera },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 dark:border-slate-800/80 backdrop-blur-xl dark:bg-slate-950/80 shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-md shadow-violet-500/25 group-hover:shadow-violet-500/40 transition-shadow">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </div>
            <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              WebSnap<span className="text-violet-600 dark:text-violet-400">Pro</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-1.5">
            {links.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all',
                    isActive
                      ? 'text-slate-900 bg-slate-100 border border-slate-300 dark:text-white dark:bg-slate-800 dark:border-slate-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900'
                  )}
                >
                  <Icon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  <span>{link.label}</span>
                </Link>
              );
            })}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="ml-2 p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-300 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 dark:border-slate-800 transition-colors cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-violet-600" />
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
