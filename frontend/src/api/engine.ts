import config from '../config';
import type { EngineResponse, DriveResponse } from '../types';

export class EngineApi {
  private readonly basePath = '/engine';

  async start(id: number): Promise<EngineResponse> {
    const url = `${config.apiUrl}${this.basePath}?id=${id}&status=started`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to start engine: ${response.status}`);
    }
    
    return response.json();
  }

  async stop(id: number): Promise<void> {
    const url = `${config.apiUrl}${this.basePath}?id=${id}&status=stopped`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to stop engine: ${response.status}`);
    }
  }

  async drive(id: number): Promise<DriveResponse> {
    const url = `${config.apiUrl}${this.basePath}?id=${id}&status=drive`;
    const response = await fetch(url);
    
    if (response.status === 429) {
      throw new Error('Drive already in progress');
    }
    
    if (response.status === 500) {
      throw new Error('Car engine broken down');
    }
    
    if (!response.ok) {
      throw new Error(`Failed to drive: ${response.status}`);
    }
    
    return response.json();
  }
}

export const engineApi = new EngineApi();