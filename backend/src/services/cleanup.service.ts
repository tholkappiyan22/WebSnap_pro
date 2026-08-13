import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs/promises';

const prisma = new PrismaClient();

/**
 * Deletes scan database records and screenshot folders older than `retentionHours`.
 */
export async function cleanupOldScans(retentionHours = 48): Promise<{ deletedCount: number }> {
  try {
    const cutoffDate = new Date(Date.now() - retentionHours * 60 * 60 * 1000);

    // Find all scans created before the cutoff date
    const expiredScans = await prisma.scan.findMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
      select: {
        id: true,
      },
    });

    if (expiredScans.length === 0) {
      return { deletedCount: 0 };
    }

    console.log(`🧹 [Auto-Cleanup] Found ${expiredScans.length} scan(s) older than ${retentionHours}h. Deleting...`);

    const baseScreenshotsDir = path.resolve(process.env.SCREENSHOTS_DIR || './screenshots');
    let deletedCount = 0;

    for (const scan of expiredScans) {
      try {
        // Delete screenshots directory for the scan
        const scanDir = path.join(baseScreenshotsDir, scan.id);
        await fs.rm(scanDir, { recursive: true, force: true }).catch(() => {});

        // Delete database record (cascade deletes pages and logs)
        await prisma.scan.delete({
          where: { id: scan.id },
        });

        deletedCount++;
      } catch (err: any) {
        console.error(`Failed to cleanup scan ${scan.id}:`, err.message);
      }
    }

    console.log(`✅ [Auto-Cleanup] Successfully cleaned up ${deletedCount} expired scan(s).`);
    return { deletedCount };
  } catch (error: any) {
    console.error('Auto-cleanup error:', error.message);
    return { deletedCount: 0 };
  }
}

/**
 * Starts a recurring background timer that runs cleanup every `intervalHours`.
 */
export function startAutomaticCleanup(retentionHours = 48, intervalHours = 6): void {
  // Run initial cleanup 10 seconds after server startup
  setTimeout(() => {
    cleanupOldScans(retentionHours).catch(() => {});
  }, 10000);

  // Repeat cleanup every intervalHours
  const intervalMs = intervalHours * 60 * 60 * 1000;
  setInterval(() => {
    cleanupOldScans(retentionHours).catch(() => {});
  }, intervalMs);

  console.log(`⏱️ [Auto-Cleanup Service] Scheduled to run every ${intervalHours} hours (deleting scans older than ${retentionHours}h).`);
}
