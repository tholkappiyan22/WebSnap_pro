import { URL } from 'url';
import https from 'https';
import http from 'http';
import net from 'net';

/**
 * Validates that a URL is well-formed, reachable, and safe.
 */
export async function validateUrl(input: string): Promise<{ valid: boolean; error?: string; url?: string }> {
  // Ensure protocol
  let urlString = input.trim();
  if (!/^https?:\/\//i.test(urlString)) {
    urlString = 'https://' + urlString;
  }

  // Parse URL
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { valid: false, error: 'Invalid URL format. Please enter a valid website URL.' };
  }

  // Protocol check
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, error: 'Only HTTP and HTTPS protocols are supported.' };
  }

  // SSRF protection — block private/reserved IPs
  if (isPrivateHost(parsed.hostname)) {
    return { valid: false, error: 'URLs pointing to private or reserved IP ranges are not allowed.' };
  }

  // Reachability check
  try {
    await checkReachability(urlString);
  } catch (err: any) {
    if (err.code === 'CERT_HAS_EXPIRED' || err.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
      return { valid: false, error: 'SSL certificate error. The website has an invalid certificate.' };
    }
    if (err.code === 'ENOTFOUND') {
      return { valid: false, error: 'Website not found. Please check the URL and try again.' };
    }
    if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
      return { valid: false, error: 'Connection timed out. The website may be down.' };
    }
    return { valid: false, error: `Cannot reach website: ${err.message || 'Unknown error'}` };
  }

  return { valid: true, url: urlString };
}

/**
 * Checks if a hostname resolves to a private or reserved IP range.
 */
function isPrivateHost(hostname: string): boolean {
  // Check literal IP addresses
  if (net.isIP(hostname)) {
    return isPrivateIP(hostname);
  }

  // Block common localhost aliases
  const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'];
  if (blockedHosts.includes(hostname.toLowerCase())) {
    return true;
  }

  return false;
}

/**
 * Checks if an IP address is in a private/reserved range.
 */
function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;

  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 127.0.0.0/8
  if (parts[0] === 127) return true;
  // 169.254.0.0/16 (link-local)
  if (parts[0] === 169 && parts[1] === 254) return true;
  // 0.0.0.0
  if (parts.every(p => p === 0)) return true;

  return false;
}

/**
 * Performs a HEAD request to check if the URL is reachable.
 */
function checkReachability(urlString: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlString);
    const client = parsed.protocol === 'https:' ? https : http;

    const req = client.request(urlString, { method: 'HEAD', timeout: 10000 }, (res) => {
      // Follow redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        checkReachability(res.headers.location).then(resolve).catch(reject);
        return;
      }
      resolve();
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Connection timed out'));
    });
    req.end();
  });
}

/**
 * Normalizes a URL for deduplication — strips fragment, trailing slash, default ports.
 */
export function normalizeURL(urlString: string): string {
  try {
    const parsed = new URL(urlString);
    // Remove fragment
    parsed.hash = '';
    // Remove trailing slash (except for root)
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    parsed.pathname = pathname;
    // Sort query params for consistency
    parsed.searchParams.sort();
    return parsed.toString();
  } catch {
    return urlString;
  }
}

/**
 * Extracts the domain from a URL.
 */
export function getDomain(urlString: string): string {
  try {
    return new URL(urlString).hostname;
  } catch {
    return '';
  }
}

/**
 * Sanitizes user input for URL to prevent injection.
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>"'`;(){}]/g, '') // strip dangerous chars
    .substring(0, 2048); // limit length
}
