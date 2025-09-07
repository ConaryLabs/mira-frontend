// src/services/config.ts
// FIXED: Corrected API URLs and WebSocket paths

// Check if we're in development (localhost) or production
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// FIXED: Remove duplicate /api paths
export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:8080'  // Direct backend access in development  
  : '';                      // Use relative URLs in production (no /api prefix)

// FIXED: WebSocket URL configuration
export const getWebSocketUrl = (path: string = '/ws/chat') => {
  console.log(`[Config] Getting WebSocket URL for path: ${path}`);
  console.log(`[Config] Current hostname: ${window.location.hostname}`);
  console.log(`[Config] Is development: ${isDevelopment}`);
  
  // Development mode - connect directly to backend
  if (isDevelopment) {
    const url = `ws://localhost:8080${path}`;
    console.log(`[Config] Development WebSocket URL: ${url}`);
    return url;
  }
  
  // Production mode - use current host with correct protocol
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;  // includes port if present
  const url = `${protocol}//${host}${path}`;
  console.log(`[Config] Production WebSocket URL: ${url}`);
  return url;
};

// FIXED: API URL helper that avoids double /api
export const getAPIUrl = (endpoint: string) => {
  // Remove leading slash from endpoint if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  if (isDevelopment) {
    const url = `${API_BASE_URL}/${cleanEndpoint}`;
    console.log(`[Config] Development API URL: ${url}`);
    return url;
  } else {
    // In production, use relative URLs that nginx will proxy
    const url = `/api/${cleanEndpoint}`;
    console.log(`[Config] Production API URL: ${url}`);
    return url;
  }
};

// Export helper for debugging
export const debugConfig = () => {
  console.log('[Config] Current configuration:', {
    isDevelopment,
    API_BASE_URL,
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    host: window.location.host,
    webSocketUrl: getWebSocketUrl('/ws/chat'),
    apiUrl: getAPIUrl('chat/history')
  });
};
