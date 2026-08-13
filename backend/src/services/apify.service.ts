import { ApifyClient } from 'apify-client';
import axios from 'axios';

export interface ApifyCaptureOptions {
  viewport: { width: number; height: number };
  format: 'png' | 'jpeg' | 'webp';
  quality?: number;
  preDelay?: number;
  timeout?: number;
}

/**
 * Checks if Apify / Cloud integration is configured and enabled.
 */
export function isApifyEnabled(): boolean {
  const token = process.env.APIFY_API_TOKEN;
  const useApify = process.env.USE_APIFY;
  return Boolean((token && token.trim() !== '') || useApify !== 'false');
}

/**
 * Captures a webpage screenshot using multi-layered high-speed Cloud APIs.
 * 1. Microlink API (High quality)
 * 2. WordPress mShots API (Unlimited, 100% free, 1-second response time)
 * 3. Apify Actor fallback
 */
export async function capturePageWithApify(
  url: string,
  options: ApifyCaptureOptions
): Promise<Buffer> {
  // 1. Try Microlink API
  try {
    console.log(`⚡ [Cloud Engine] Fast capturing ${url} (${options.viewport.width}x${options.viewport.height})...`);
    const response = await axios.get('https://api.microlink.io', {
      params: {
        url,
        screenshot: true,
        'viewport.width': options.viewport.width,
        'viewport.height': options.viewport.height,
        fullPage: true,
      },
      responseType: 'arraybuffer',
      timeout: Math.min(options.timeout || 10000, 10000),
    });

    if (response.status === 200 && response.data && response.data.length > 1000) {
      console.log(`✅ [Cloud Engine] Microlink capture completed for ${url}`);
      return Buffer.from(response.data);
    }
  } catch (err: any) {
    console.warn(`⚠️ [Cloud Engine] Microlink skipped (${err.message || err}). Trying mShots engine...`);
  }

  // 2. Try WordPress mShots API (100% Free, Unlimited, Instant response)
  try {
    const encodedUrl = encodeURIComponent(url);
    const mShotsUrl = `https://s0.wp.com/mshots/v1/${encodedUrl}?w=${options.viewport.width}&h=${options.viewport.height}`;
    
    const response = await axios.get(mShotsUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
    });

    if (response.status === 200 && response.data && response.data.length > 1000) {
      console.log(`✅ [Cloud Engine] mShots fast capture completed for ${url}`);
      return Buffer.from(response.data);
    }
  } catch (err: any) {
    console.warn(`⚠️ [Cloud Engine] mShots skipped (${err.message || err}). Trying Apify actor...`);
  }

  // 3. Apify Actor fallback (apify/screenshot-url)
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new Error('No cloud API provider succeeded and APIFY_API_TOKEN is missing');
  }

  const client = new ApifyClient({ token });
  console.log(`☁️ [Apify Actor] Capturing via apify/screenshot-url for ${url}...`);

  const run = await client.actor('apify/screenshot-url').call(
    {
      url: url,
      waitUntil: 'domcontentloaded',
      viewportWidth: options.viewport.width,
      viewportHeight: options.viewport.height,
      fullPage: true,
    },
    {
      timeout: options.timeout ? Math.ceil(options.timeout / 1000) : 25,
    }
  );

  if (run.status !== 'SUCCEEDED') {
    throw new Error(`Apify actor run status: ${run.status}`);
  }

  const keyValueStore = client.keyValueStore(run.defaultKeyValueStoreId);
  const keys = await keyValueStore.listKeys();
  const imageKey =
    keys.items.find(
      (item) =>
        item.key.endsWith('.png') ||
        item.key.endsWith('.jpeg') ||
        item.key.endsWith('.webp') ||
        item.key === 'OUTPUT'
    )?.key || 'OUTPUT';

  const record = await keyValueStore.getRecord(imageKey);
  if (!record || !record.value) {
    throw new Error('Apify output image not found in Key-Value store');
  }

  console.log(`✅ [Apify Actor] Screenshot completed for ${url}`);
  return Buffer.isBuffer(record.value) ? record.value : Buffer.from(record.value as any);
}
