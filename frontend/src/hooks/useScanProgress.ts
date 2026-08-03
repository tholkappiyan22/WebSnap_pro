'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ProgressUpdate } from '@/types';
import { getProgressUrl } from '@/lib/api';

/**
 * Custom hook to subscribe to SSE progress updates for a scan.
 * Automatically reconnects on connection loss.
 */
export function useScanProgress(scanId: string | null) {
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (!scanId) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = getProgressUrl(scanId);
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data: ProgressUpdate = JSON.parse(event.data);
        setProgress(data);

        // Close connection when scan is done
        if (data.status === 'completed' || data.status === 'failed') {
          eventSource.close();
          setIsConnected(false);
        }
      } catch (err) {
        console.error('Failed to parse progress event:', err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();

      // Don't retry if scan is already done
      if (progress?.status === 'completed' || progress?.status === 'failed') {
        return;
      }

      // Retry after 3 seconds
      setTimeout(() => {
        connect();
      }, 3000);
    };
  }, [scanId, progress?.status]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connect]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      setIsConnected(false);
    }
  }, []);

  return {
    progress,
    isConnected,
    error,
    disconnect,
  };
}
