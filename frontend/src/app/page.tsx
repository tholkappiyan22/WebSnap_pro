'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import HeroSection from '@/components/HeroSection';
import ScanForm from '@/components/ScanForm';
import ScanHistory from '@/components/ScanHistory';
import { useScans } from '@/hooks/useScans';
import { startScan, deleteScan } from '@/lib/api';
import type { ScanConfig } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { scans, refresh } = useScans(true);

  const handleScan = async (config: ScanConfig) => {
    setIsScanning(true);
    setError(null);

    try {
      const result = await startScan(config);
      // Navigate to the scan progress page
      router.push(`/scan/${result.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start scan. Please try again.');
      setIsScanning(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteScan(id);
      refresh();
    } catch {
      // ignore
    }
  };

  return (
    <div className="page-transition">
      {/* Hero + Form — vertically centered in viewport (minus navbar height) */}
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        <HeroSection />

        <div className="w-full max-w-2xl mt-8">
          <ScanForm onSubmit={handleScan} isLoading={isScanning} />
        </div>

        {/* Error display */}
        {error && (
          <div className="max-w-2xl w-full mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 text-center">
            {error}
          </div>
        )}
      </div>

      {/* Recent Scans — sits below the centered hero area */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <ScanHistory scans={scans} onDelete={handleDelete} />
      </div>
    </div>
  );
}
