/** Static storefronts can use the existing HTTPS commerce API on another host. */
export function apiUrl(path: string, configuredOrigin = import.meta.env?.VITE_API_BASE_URL || ''): string {
  if (!path.startsWith('/api/') || /[\\\u0000-\u0020\u007f]/.test(path)
    || !new URL(path, 'https://allbarka.invalid').pathname.startsWith('/api/')) {
    throw new Error('Invalid commerce API path');
  }
  const configured = configuredOrigin.trim();
  if (!configured) return path;
  // Check the supplied form before URL normalization can remove a path or backslash.
  if (!/^https:\/\/[^/?#\\\s]+\/?$/i.test(configured)) {
    throw new Error('VITE_API_BASE_URL must be an HTTPS origin without a path');
  }
  const origin = new URL(configured);
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash
    || origin.pathname !== '/') throw new Error('VITE_API_BASE_URL must be an HTTPS origin without a path');
  return origin.origin + path;
}
