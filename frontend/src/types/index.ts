/** Represents a scan job */
export interface Scan {
  id: string;
  url: string;
  status: ScanStatus;
  createdAt: string;
  completedAt: string | null;
  pageCount: number;
  pagesTotal: number;
  deviceTypes: string;
  format: ImageFormat;
  quality: number;
  maxPages: number;
  maxDepth: number;
  errorMessage: string | null;
  totalPages?: number;
}

/** Possible scan statuses */
export type ScanStatus = 'pending' | 'crawling' | 'capturing' | 'completed' | 'failed';

/** Supported image formats */
export type ImageFormat = 'png' | 'jpeg' | 'webp';

/** A single page/screenshot within a scan */
export interface PageResult {
  id: string;
  url: string;
  path: string;
  title: string | null;
  status: string;
  deviceType: string;
  viewportWidth: number;
  viewportHeight: number;
  fileSize: number | null;
  errorMessage: string | null;
  screenshotUrl: string | null;
  thumbnailUrl: string | null;
}

/** Scan detail with pages */
export interface ScanDetail extends Omit<Scan, 'totalPages'> {
  pages: PageResult[];
}

/** Progress update from SSE stream */
export interface ProgressUpdate {
  scanId: string;
  status: ScanStatus;
  pagesDiscovered: number;
  pagesCompleted: number;
  pagesTotal: number;
  currentPage?: string;
  estimatedTimeRemaining?: number;
  error?: string;
}

/** Configuration for starting a scan */
export interface ScanConfig {
  url: string;
  deviceTypes: string;
  format: ImageFormat;
  quality: number;
  maxPages: number;
  maxDepth: number;
}

/** API response for listing scans */
export interface ScansResponse {
  scans: Scan[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Device type configuration */
export interface DeviceOption {
  id: string;
  label: string;
  description: string;
  icon: string;
  devices: string[];
}

/** Crawl-only result */
export interface CrawlResult {
  url: string;
  domain: string;
  pages: Array<{
    url: string;
    path: string;
    title?: string;
    depth: number;
    source: string;
  }>;
  totalFound: number;
}
