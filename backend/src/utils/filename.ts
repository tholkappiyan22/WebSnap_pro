/**
 * Converts a URL path into a readable filename for screenshots.
 *
 * Examples:
 *   /              → home
 *   /about         → about
 *   /products/mobile → products-mobile
 *   /blog/2024/hello-world → blog-2024-hello-world
 */
export function urlPathToFilename(urlPath: string): string {
  // Handle root path
  if (!urlPath || urlPath === '/') {
    return 'home';
  }

  // Remove leading/trailing slashes
  let cleaned = urlPath.replace(/^\/+|\/+$/g, '');

  // Remove query string and hash
  cleaned = cleaned.split('?')[0].split('#')[0];

  // Replace slashes with hyphens
  cleaned = cleaned.replace(/\//g, '-');

  // Replace non-alphanumeric chars (except hyphens) with hyphens
  cleaned = cleaned.replace(/[^a-zA-Z0-9-]/g, '-');

  // Collapse multiple hyphens
  cleaned = cleaned.replace(/-+/g, '-');

  // Remove leading/trailing hyphens
  cleaned = cleaned.replace(/^-+|-+$/g, '');

  // Fallback if empty
  if (!cleaned) {
    return 'page';
  }

  // Lowercase
  return cleaned.toLowerCase();
}

/**
 * Generates a full screenshot filename including device type and extension.
 *
 * Example: about-desktop.png, home-mobile.webp
 */
export function generateScreenshotFilename(
  urlPath: string,
  deviceType: string,
  format: string
): string {
  const base = urlPathToFilename(urlPath);
  const ext = format.toLowerCase();
  return `${base}-${deviceType}.${ext}`;
}

/**
 * Generates the device folder name for ZIP organization.
 */
export function getDeviceFolder(deviceType: string): string {
  const folders: Record<string, string> = {
    desktop: 'desktop',
    laptop: 'laptop',
    tablet: 'tablet',
    mobile: 'mobile',
  };
  return folders[deviceType.toLowerCase()] || 'other';
}
