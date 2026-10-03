/** Static storefronts can use the existing HTTPS commerce API on another host. */
export function apiUrl(path: string, configuredOrigin = import.meta.env?.VITE_API_BASE_URL || ''): string {
  if (!path.startsWith('/api/') || /[\\\r\n]/.test(path)) throw new Error('Invalid commerce API path');
  if (!configuredOrigin.trim()) return path;
  const origin = new URL(configuredOrigin.trim());
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash
    || origin.pathname !== '/') throw new Error('VITE_API_BASE_URL must be an HTTPS origin without a path');
  return origin.origin + path;
}
