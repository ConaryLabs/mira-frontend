// src/services/config.ts

// For API calls, use relative URLs when deployed
// Check if we're in development (localhost) or production
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:8080'  // Direct backend access in development
  : '/api';                   // Proxied through nginx in production

// WebSocket URL should be dynamically determined based on current location
export const getWebSocketUrl = (path: string = '/ws/chat') => {
  // If we're on localhost, use localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `ws://localhost:8080${path}`;
  }
  
  // Otherwise, use the current host with appropriate protocol
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${path}`;
};
