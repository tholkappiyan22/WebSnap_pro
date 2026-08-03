'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Scan, ScansResponse } from '@/types';
import { listScans } from '@/lib/api';

/**
 * Custom hook for fetching and managing the scan list.
 */
export function useScans(autoFetch: boolean = true) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScans = useCallback(async (params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const data: ScansResponse = await listScans(params);
      setScans(data.scans);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch scans');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchScans();
    }
  }, [autoFetch, fetchScans]);

  const refresh = useCallback(() => {
    fetchScans({ page: pagination.page, limit: pagination.limit });
  }, [fetchScans, pagination.page, pagination.limit]);

  return {
    scans,
    pagination,
    isLoading,
    error,
    fetchScans,
    refresh,
  };
}
