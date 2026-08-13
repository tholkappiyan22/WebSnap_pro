import JSZip from 'jszip';
import { getScreenshotBlob, saveScreenshotBlob } from './indexeddb';
import { fetchImageBlob } from './api';
import type { PageResult } from '@/types';

/**
 * Generates a ZIP archive directly in the user's browser memory
 * using cached IndexedDB image Blobs and triggers browser download.
 */
export async function downloadZipFromBrowserMemory(
  scanId: string,
  scanUrl: string,
  pages: PageResult[],
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const completedPages = pages.filter((p) => p.status === 'completed' && p.screenshotUrl);
  if (completedPages.length === 0) return;

  const zip = new JSZip();
  let processed = 0;

  for (const page of completedPages) {
    if (!page.screenshotUrl) continue;

    let blob = await getScreenshotBlob(scanId, page.id, 'full');

    if (!blob) {
      try {
        blob = await fetchImageBlob(page.screenshotUrl);
        const ext = page.screenshotUrl.split('.').pop() || 'png';
        const cleanTitle = (page.title || page.path || 'screenshot').replace(/[^a-zA-Z0-9-_]/g, '_');
        const filename = `${cleanTitle}-${page.deviceType}.${ext}`;
        await saveScreenshotBlob(scanId, page.id, 'full', blob, filename);
      } catch (err) {
        console.warn(`Could not fetch image for ZIP packaging: ${page.url}`, err);
        continue;
      }
    }

    const ext = page.screenshotUrl.split('.').pop() || 'png';
    const cleanTitle = (page.title || page.path || 'screenshot').replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `${cleanTitle}-${page.deviceType}.${ext}`;

    zip.file(filename, blob);

    processed++;
    if (onProgress) {
      onProgress(processed, completedPages.length);
    }
  }

  // Generate zip in browser memory
  const zipBlob = await zip.generateAsync({ type: 'blob' });

  // Sanitize hostname for filename
  let domain = 'websnap-screenshots';
  try {
    domain = new URL(scanUrl).hostname.replace(/\./g, '-');
  } catch {
    // fallback
  }

  const downloadFilename = `${domain}.zip`;

  // Trigger browser download
  const link = document.createElement('a');
  const objectUrl = URL.createObjectURL(zipBlob);
  link.href = objectUrl;
  link.download = downloadFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
}
