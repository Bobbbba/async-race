import { apiClient } from './client';
import type { Winner } from '../types';

export class WinnersApi {
  private readonly basePath = '/winners';

  async getAll(): Promise<Winner[]> {
    return apiClient.get<Winner[]>(this.basePath);
  }

  async getSorted(sort: 'id' | 'wins' | 'time' = 'time', order: 'asc' | 'desc' = 'asc'): Promise<Winner[]> {
    return apiClient.get<Winner[]>(`${this.basePath}?_sort=${sort}&_order=${order}`);
  }

  async getOne(id: number): Promise<Winner | null> {
    try {
      return await apiClient.get<Winner>(`${this.basePath}/${id}`);
    } catch {
      return null;
    }
  }

  async create(id: number, wins: number, time: number): Promise<Winner> {
    return apiClient.post<Winner>(this.basePath, { id, wins, time });
  }

  async update(id: number, data: Partial<Winner>): Promise<Winner> {
    return apiClient.put<Winner>(`${this.basePath}/${id}`, data);
  }

  async delete(id: number): Promise<void> {
    await apiClient.delete<void>(`${this.basePath}/${id}`);
  }
}

export const winnersApi = new WinnersApi();