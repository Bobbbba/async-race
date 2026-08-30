import type { EngineResponse, DriveResponse } from '../types';

export class EngineApi {
  private readonly basePath = '/engine';
  private readonly apiUrl: string;

  constructor() {
    // Используем относительный путь для прокси в development
    // или полный URL для production
    const isDev = import.meta.env.MODE === 'development';
    this.apiUrl = isDev ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:3000');
    console.log('[Engine API] Mode:', import.meta.env.MODE);
    console.log('[Engine API] API URL:', this.apiUrl || '/api');
  }

  private getUrl(endpoint: string): string {
    // Если apiUrl пустой, используем относительный путь (для прокси)
    if (!this.apiUrl) {
      return `/api${endpoint}`;
    }
    return `${this.apiUrl}${endpoint}`;
  }

  async start(id: number): Promise<EngineResponse> {
    const url = this.getUrl(`${this.basePath}?id=${id}&status=started`);
    console.log(`[Engine API] Starting engine for car ${id}:`, url);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error(`[Engine API] Failed to start engine: ${response.status}`, response.statusText);
        throw new Error(`Failed to start engine: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`[Engine API] Engine started for car ${id}:`, data);
      return data;
    } catch (error) {
      console.error(`[Engine API] Network error starting car ${id}:`, error);
      throw error;
    }
  }

  async stop(id: number): Promise<void> {
    const url = this.getUrl(`${this.basePath}?id=${id}&status=stopped`);
    console.log(`[Engine API] Stopping engine for car ${id}:`, url);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error(`[Engine API] Failed to stop engine: ${response.status}`, response.statusText);
        throw new Error(`Failed to stop engine: ${response.status} ${response.statusText}`);
      }
      
      console.log(`[Engine API] Engine stopped for car ${id}`);
    } catch (error) {
      console.error(`[Engine API] Network error stopping car ${id}:`, error);
      throw error;
    }
  }

  async drive(id: number): Promise<DriveResponse> {
    const url = this.getUrl(`${this.basePath}?id=${id}&status=drive`);
    console.log(`[Engine API] Sending drive request for car ${id}:`, url);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.status === 429) {
        console.warn(`[Engine API] Drive already in progress for car ${id}`);
        throw new Error('Drive already in progress');
      }
      
      if (response.status === 500) {
        console.error(`[Engine API] Car ${id} engine broken down!`);
        throw new Error('Car engine broken down');
      }
      
      if (!response.ok) {
        console.error(`[Engine API] Failed to drive: ${response.status}`, response.statusText);
        throw new Error(`Failed to drive: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`[Engine API] Drive successful for car ${id}:`, data);
      return data;
    } catch (error) {
      console.error(`[Engine API] Error on drive for car ${id}:`, error);
      throw error;
    }
  }
}

export const engineApi = new EngineApi();