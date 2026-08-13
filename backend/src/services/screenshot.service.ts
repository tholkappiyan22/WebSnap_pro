import { chromium, Browser, Page, BrowserContext } from 'playwright';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { isApifyEnabled, capturePageWithApify } from './apify.service';

/** Viewport presets for multi-device capture */
export const VIEWPORTS: Record<string, { width: number; height: number }> = {
  desktop: { width: 1920, height: 1080 },
  laptop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
};

/** Options for capturing a screenshot */
export interface CaptureOptions {
  format: 'png' | 'jpeg' | 'webp';
  quality: number;
  timeout: number;
  preDelay: number;
  deviceType: string;
}

/** Result of a screenshot capture */
export interface CaptureResult {
  screenshotPath: string;
  thumbnailPath: string;
  fileSize: number;
  title: string;
  viewport: { width: number; height: number };
  additionalParts?: string[];
}

// Browser instance pool
let browser: Browser | null = null;
let browserLaunchPromise: Promise<Browser> | null = null;

/**
 * Gets or launches the shared browser instance.
 */
export async function launchBrowser(): Promise<Browser> {
  if (browser && browser.isConnected()) {
    return browser;
  }

  if (browserLaunchPromise) {
    return browserLaunchPromise;
  }

  browserLaunchPromise = chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--disable-background-networking',
      '--disable-audio-output',
      '--disable-extensions',
      '--disable-component-extensions-with-background-pages',
      '--disable-default-apps',
      '--disable-sync',
      '--metrics-recording-only',
      '--mute-audio',
    ],
  });

  try {
    browser = await browserLaunchPromise;
    console.log('✅ Browser launched successfully');

    browser.on('disconnected', () => {
      console.log('⚠️  Browser disconnected');
      browser = null;
      browserLaunchPromise = null;
    });

    return browser;
  } finally {
    browserLaunchPromise = null;
  }
}

/**
 * Closes the shared browser instance.
 */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
    browserLaunchPromise = null;
    console.log('🛑 Browser closed');
  }
}

/**
 * Helper to process and save captured screenshot image buffer (from Apify or Playwright).
 */
async function processAndSaveImageBuffer(
  fullPageBuffer: Buffer,
  url: string,
  outputDir: string,
  filename: string,
  options: CaptureOptions,
  viewport: { width: number; height: number },
  pageTitle = 'Untitled Page'
): Promise<CaptureResult> {
  await fs.mkdir(outputDir, { recursive: true });

  const meta = await sharp(Buffer.from(fullPageBuffer)).metadata();
  const actualWidth = meta.width || viewport.width;
  const actualHeight = meta.height || viewport.height;

  const maxSegmentHeight = viewport.height * 5; // 5 viewport screen heights

  if (actualHeight <= maxSegmentHeight) {
    const screenshotPath = path.join(outputDir, filename);
    const finalBuffer = await processImageBuffer(fullPageBuffer, options);
    await fs.writeFile(screenshotPath, finalBuffer);

    const thumbnailPath = await generateThumbnail(finalBuffer, outputDir, filename);
    console.log(`✅ Screenshot saved: ${filename} (${Math.round(finalBuffer.length / 1024)} KB)`);

    return {
      screenshotPath,
      thumbnailPath,
      fileSize: finalBuffer.length,
      title: pageTitle,
      viewport,
    };
  }

  // Long page: segment into 5-screen parts
  console.log(`📏 Tall page detected (${actualHeight}px). Splitting into ${Math.ceil(actualHeight / maxSegmentHeight)} parts...`);
  const actualSegmentCount = Math.ceil(actualHeight / maxSegmentHeight);

  const additionalParts: string[] = [];
  let primaryScreenshotPath = '';
  let primaryThumbnailPath = '';
  let primaryFileSize = 0;

  for (let i = 0; i < actualSegmentCount; i++) {
    const top = i * maxSegmentHeight;
    const height = Math.min(maxSegmentHeight, actualHeight - top);
    const partFilename = filename.replace(/(\.\w+)$/, `-part${i + 1}$1`);
    const partPath = path.join(outputDir, partFilename);

    const sliceBuffer = await sharp(Buffer.from(fullPageBuffer))
      .extract({ left: 0, top, width: actualWidth, height })
      .png()
      .toBuffer();

    const finalBuffer = await processImageBuffer(sliceBuffer, options);
    await fs.writeFile(partPath, finalBuffer);

    if (i === 0) {
      primaryScreenshotPath = partPath;
      primaryThumbnailPath = await generateThumbnail(finalBuffer, outputDir, partFilename);
      primaryFileSize = finalBuffer.length;
    } else {
      additionalParts.push(partPath);
    }
  }

  return {
    screenshotPath: primaryScreenshotPath,
    thumbnailPath: primaryThumbnailPath,
    fileSize: primaryFileSize,
    title: `${pageTitle} (5-Screen Segmented)`,
    viewport,
    additionalParts,
  };
}

/**
 * Captures screenshot of a page.
 * Uses Apify Free Tier Cloud if APIFY_API_TOKEN is set, with fallback to local Playwright.
 */
export async function capturePage(
  url: string,
  outputDir: string,
  filename: string,
  options: CaptureOptions
): Promise<CaptureResult> {
  console.log(`📸 Capturing ${url} (${options.deviceType})...`);
  const viewport = VIEWPORTS[options.deviceType] || VIEWPORTS.desktop;

  // 1. Try Apify Cloud if enabled
  if (isApifyEnabled()) {
    try {
      const imageBuffer = await capturePageWithApify(url, {
        viewport,
        format: options.format,
        quality: options.quality,
        preDelay: options.preDelay,
        timeout: options.timeout,
      });

      return await processAndSaveImageBuffer(
        imageBuffer,
        url,
        outputDir,
        filename,
        options,
        viewport
      );
    } catch (err: any) {
      console.warn(`⚠️  Apify capture failed: ${err.message || err}. Falling back to local Playwright...`);
    }
  }

  // 2. Fallback to Local Playwright
  const browserInstance = await launchBrowser();
  const context: BrowserContext = await browserInstance.newContext({
    viewport,
    userAgent: options.deviceType === 'mobile'
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : undefined,
    deviceScaleFactor: options.deviceType === 'mobile' ? 2 : 1,
  });

  const page: Page = await context.newPage();

  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: options.timeout || 20000,
    });

    try {
      await page.waitForLoadState('networkidle', { timeout: 1000 });
    } catch { /* ignore */ }

    await waitForContent(page);
    await autoScroll(page);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);

    if (options.preDelay > 0) {
      await page.waitForTimeout(Math.min(options.preDelay, 2000));
    }

    const title = (await page.title()) || 'Untitled Page';
    const fullPageBuffer = await page.screenshot({ fullPage: true, type: 'png' });

    return await processAndSaveImageBuffer(
      fullPageBuffer,
      url,
      outputDir,
      filename,
      options,
      viewport,
      title
    );
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
}


/**
 * Process raw buffer with Sharp according to format and quality settings.
 */
async function processImageBuffer(buffer: Buffer, options: CaptureOptions): Promise<Buffer> {
  if (options.format === 'webp') {
    return sharp(buffer).webp({ quality: options.quality }).toBuffer();
  } else if (options.format === 'jpeg') {
    return sharp(buffer).jpeg({ quality: options.quality }).toBuffer();
  }
  return Buffer.from(buffer);
}

/**
 * Generate 300px wide thumbnail.
 */
async function generateThumbnail(buffer: Buffer, outputDir: string, filename: string): Promise<string> {
  const thumbnailFilename = filename.replace(/\.\w+$/, '-thumb.webp');
  const thumbnailPath = path.join(outputDir, thumbnailFilename);
  await sharp(buffer)
    .resize(300, null, { fit: 'inside' })
    .webp({ quality: 60 })
    .toFile(thumbnailPath);
  return thumbnailPath;
}

/**
 * Waits for key content to be loaded (max 3 sec total timeout).
 */
async function waitForContent(page: Page): Promise<void> {
  const contentPromise = (async () => {
    try {
      await page.evaluate(() => {
        return Promise.all(
          Array.from(document.querySelectorAll('img')).map((img: HTMLImageElement) => {
            if (img.complete) return Promise.resolve();
            return new Promise<void>((resolve) => {
              img.addEventListener('load', () => resolve());
              img.addEventListener('error', () => resolve());
              setTimeout(resolve, 2000);
            });
          })
        );
      });
    } catch { /* ignore */ }
  })();

  await Promise.race([
    contentPromise,
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
}

/**
 * Fast auto-scroll to trigger lazy loading (max 2 sec total).
 */
async function autoScroll(page: Page): Promise<void> {
  try {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 800;
        let scrollCount = 0;
        const maxScrolls = 8; // Reduced from 15 — enough for lazy-load triggering

        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          scrollCount++;

          if (totalHeight >= scrollHeight || scrollCount >= maxScrolls) {
            clearInterval(timer);
            resolve();
          }
        }, 30); // Reduced from 50ms — faster scroll

        setTimeout(() => {
          clearInterval(timer);
          resolve();
        }, 1500); // Reduced from 2000ms
      });
    });
  } catch { /* ignore */ }
}
