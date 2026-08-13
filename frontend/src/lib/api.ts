import axios from 'axios';
import type { ScanConfig, ScanDetail, ScansResponse, CrawlResult } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** Start a new scan */
export async function startScan(config: ScanConfig): Promise<{ id: string; url: string; status: string }> {
  const { data } = await api.post('/scan', config);
  return data;
}

/** Crawl-only mode */
export async function crawlOnly(url: string, maxPages?: number, maxDepth?: number): Promise<CrawlResult> {
  const { data } = await api.post('/crawl', { url, maxPages, maxDepth });
  return data;
}

/** Get screenshots for a scan */
export async function getScreenshots(scanId: string): Promise<ScanDetail> {
  const { data } = await api.get(`/screenshots/${scanId}`);
  return data;
}

/** Download ZIP for a scan */
export function getDownloadUrl(scanId: string): string {
  return `${API_BASE}/api/download/${scanId}`;
}

/** Get the SSE progress URL */
export function getProgressUrl(scanId: string): string {
  return `${API_BASE}/api/progress/${scanId}`;
}

/** Get the full screenshot URL */
export function getScreenshotFullUrl(relativePath: string): string {
  if (relativePath.startsWith('blob:') || relativePath.startsWith('data:')) {
    return relativePath;
  }
  return `${API_BASE}${relativePath}`;
}

/** Fetch an image from backend as a binary Blob */
export async function fetchImageBlob(relativePath: string): Promise<Blob> {
  const url = getScreenshotFullUrl(relativePath);
  const response = await axios.get(url, { responseType: 'blob' });
  return response.data;
}

/** Delete a scan */
export async function deleteScan(scanId: string): Promise<void> {
  await api.delete(`/scan/${scanId}`);
}

/** List all scans */
export async function listScans(params?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<ScansResponse> {
  const { data } = await api.get('/scans', { params });
  return data;
}

export default api;

