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
 * Checks if Cloud Screenshot Engine is enabled.
 */
export function isApifyEnabled(): boolean {
  return true; // Always enabled for cloud screenshot rendering
}

/**
 * Captures a webpage screenshot using multi-provider high-speed Cloud APIs.
 * 1. Thum.io Cloud Engine (Instant, 100% Free, No limits, No API keys)
 * 2. WordPress mShots Cloud Engine (100% Free & Unlimited)
 * 3. Microlink API
 * 4. Apify Actor fallback
 */
export async function capturePageWithApify(
  url: string,
  options: ApifyCaptureOptions
): Promise<Buffer> {
  const width = options.viewport.width || 1920;

  // 1. Thum.io Instant Cloud Screenshot Engine (100% Free, Unlimited, Zero API Key)
  try {
    console.log(`⚡ [Thum.io Engine] Capturing ${url} (${width}px width)...`);
    const thumUrl = `https://image.thum.io/get/width/${width}/noanimate/${url}`;
    const response = await axios.get(thumUrl, {
      responseType: 'arraybuffer',
      timeout: options.timeout || 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (response.status === 200 && response.data && response.data.length > 5000) {
      console.log(`✅ [Thum.io Engine] Screenshot retrieved successfully (${Math.round(response.data.length / 1024)} KB) for ${url}`);
      return Buffer.from(response.data);
    }
  } catch (err: any) {
    console.warn(`⚠️ [Thum.io Engine] Skipped (${err.message || err}). Trying mShots...`);
  }

  // 2. WordPress mShots API (100% Free & Unlimited)
  try {
    console.log(`⚡ [mShots Engine] Capturing ${url}...`);
    const encodedUrl = encodeURIComponent(url);
    const mShotsUrl = `https://s0.wp.com/mshots/v1/${encodedUrl}?w=${width}&h=${options.viewport.height || 1080}`;

    // Attempt up to 2 times (mShots generates on 1st call and returns full image on 2nd)
    for (let attempt = 1; attempt <= 2; attempt++) {
      const response = await axios.get(mShotsUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });

      if (response.status === 200 && response.data && response.data.length > 5000) {
        console.log(`✅ [mShots Engine] Capture completed for ${url}`);
        return Buffer.from(response.data);
      }

      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
  } catch (err: any) {
    console.warn(`⚠️ [mShots Engine] Skipped (${err.message || err}). Trying Microlink...`);
  }

  // 3. Microlink API
  try {
    const response = await axios.get('https://api.microlink.io', {
      params: {
        url,
        screenshot: true,
        'viewport.width': width,
        'viewport.height': options.viewport.height || 1080,
      },
      responseType: 'arraybuffer',
      timeout: 10000,
    });

    if (response.status === 200 && response.data && response.data.length > 2000) {
      console.log(`✅ [Microlink] Capture completed for ${url}`);
      return Buffer.from(response.data);
    }
  } catch (err: any) {
    console.warn(`⚠️ [Microlink] Skipped (${err.message || err}). Trying Apify...`);
  }

  // 4. Apify Actor fallback
  const token = process.env.APIFY_API_TOKEN;
  if (token && token.trim() !== '') {
    try {
      const client = new ApifyClient({ token });
      console.log(`☁️ [Apify Actor] Capturing via apify/screenshot-url for ${url}...`);

      const run = await client.actor('apify/screenshot-url').call(
        {
          url: url,
          waitUntil: 'domcontentloaded',
          viewportWidth: width,
          viewportHeight: options.viewport.height,
          fullPage: true,
        },
        {
          timeout: options.timeout ? Math.ceil(options.timeout / 1000) : 25,
        }
      );

      if (run.status === 'SUCCEEDED') {
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
        if (record && record.value) {
          console.log(`✅ [Apify Actor] Screenshot completed for ${url}`);
          return Buffer.isBuffer(record.value) ? record.value : Buffer.from(record.value as any);
        }
      }
    } catch (err: any) {
      console.warn(`⚠️ [Apify Actor] Skipped (${err.message || err})`);
    }
  }

  throw new Error('All high-speed cloud screenshot providers were unreachable.');
}
