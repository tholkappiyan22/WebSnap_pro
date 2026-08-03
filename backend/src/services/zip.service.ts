import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { getDeviceFolder, urlPathToFilename } from '../utils/filename';

export interface ZipEntry {
  filePath: string;     // Absolute path to the screenshot file
  urlPath: string;      // URL path (e.g., /about)
  deviceType: string;   // desktop, mobile, etc.
  format: string;       // png, jpeg, webp
}

/**
 * Creates a ZIP archive from an array of screenshot entries.
 * Organizes files by device folder:
 *   website-name/
 *     desktop/
 *       home.png
 *       about.png
 *     mobile/
 *       home.png
 *       about.png
 *
 * Returns the path to the created ZIP file.
 */
export async function createZipArchive(
  entries: ZipEntry[],
  outputDir: string,
  zipFilename: string
): Promise<string> {
  const zipPath = path.join(outputDir, zipFilename);

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 6 }, // moderate compression
    });

    output.on('close', () => {
      console.log(`📦 ZIP created: ${zipPath} (${archive.pointer()} bytes)`);
      resolve(zipPath);
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('ZIP warning:', err.message);
      } else {
        reject(err);
      }
    });

    archive.pipe(output);

    // Track used filenames per device folder to prevent collisions
    const usedNames = new Map<string, Set<string>>();

    for (const entry of entries) {
      if (!fs.existsSync(entry.filePath)) {
        console.warn(`Skipping missing file: ${entry.filePath}`);
        continue;
      }

      const deviceFolder = getDeviceFolder(entry.deviceType);
      const baseName = urlPathToFilename(entry.urlPath);
      const ext = entry.format.toLowerCase();

      // Ensure unique filename within each device folder
      if (!usedNames.has(deviceFolder)) {
        usedNames.set(deviceFolder, new Set());
      }
      const folderNames = usedNames.get(deviceFolder)!;

      let finalName = `${baseName}.${ext}`;
      let counter = 1;
      while (folderNames.has(finalName)) {
        finalName = `${baseName}-${counter}.${ext}`;
        counter++;
      }
      folderNames.add(finalName);

      const zipEntryPath = `${deviceFolder}/${finalName}`;
      archive.file(entry.filePath, { name: zipEntryPath });
    }

    archive.finalize();
  });
}

/**
 * Streams a ZIP file to an Express response.
 */
export function streamZipToResponse(
  zipPath: string,
  res: any,
  filename: string
): void {
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const stream = fs.createReadStream(zipPath);
  stream.pipe(res);
  stream.on('error', (err) => {
    console.error('ZIP stream error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to stream ZIP file' });
    }
  });
}
