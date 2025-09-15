const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:3001'
  : '';

export const getWebSocketUrl = (path: string = '/ws') => {
  console.log(`[Config] Getting WebSocket URL for path: ${path}`);
  console.log(`[Config] Current hostname: ${window.location.hostname}`);
  console.log(`[Config] Is development: ${isDevelopment}`);
  
  if (isDevelopment) {
    const url = `ws://localhost:3001${path}`;
    console.log(`[Config] Development WebSocket URL: ${url}`);
    return url;
  }
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const url = `${protocol}//${host}${path}`;
  console.log(`[Config] Production WebSocket URL: ${url}`);
  return url;
};

export const getAPIUrl = (endpoint: string) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  if (isDevelopment) {
    const url = `${API_BASE_URL}/${cleanEndpoint}`;
    console.log(`[Config] Development API URL: ${url}`);
    return url;
  } else {
    const url = `/api/${cleanEndpoint}`;
    console.log(`[Config] Production API URL: ${url}`);
    return url;
  }
};

export const debugConfig = () => {
  console.log('[Config] Current configuration:', {
    isDevelopment,
    API_BASE_URL,
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    host: window.location.host,
    webSocketUrl: getWebSocketUrl('/ws'),
    apiUrl: getAPIUrl('chat/history')
  });
};
