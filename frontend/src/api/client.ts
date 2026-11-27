// API Client for CTSO Management System
export const API_BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + '/api';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  try {
    const token = localStorage.getItem('ctso_cms_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // Ignore localStorage access restrictions
  }
  return headers;
}

export const apiClient = {
  async isBackendAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) return false;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return false;
      const json = await res.json();
      return Boolean(json);
    } catch {
      return false;
    }
  },

  async get<T>(endpoint: string, fallback: T): Promise<T> {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return fallback;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return fallback;
      return await res.json();
    } catch {
      return fallback;
    }
  },

  async post<T = any>(endpoint: string, data: any): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        return { success: false, error: 'Backend tidak merespons JSON valid. Pastikan server backend berjalan.' };
      }
      if (!res.ok) return { success: false, error: json.detail || 'Request failed' };
      return { success: true, data: json };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async put<T = any>(endpoint: string, data: any): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        return { success: false, error: 'Backend tidak merespons JSON valid.' };
      }
      if (!res.ok) return { success: false, error: json.detail || 'Request failed' };
      return { success: true, data: json };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async delete(endpoint: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) return { success: false, error: 'Delete failed' };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
};
