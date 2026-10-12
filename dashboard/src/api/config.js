/**
 * Central API configuration for CausalFunnel Dashboard
 */
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function getApiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}
