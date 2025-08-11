// API Configuration for SnapTrace
// This ensures all API calls go directly to the backend without any proxy

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const API_ENDPOINTS = {
  // Upload endpoint (simplified - single endpoint)
  UPLOAD: `${API_BASE_URL}/api/upload`,
  
  // Status endpoints
  STATUS: (jobId: string) => `${API_BASE_URL}/api/status/${jobId}`,
  HEALTH: `${API_BASE_URL}/api/health`
};

export default API_BASE_URL;