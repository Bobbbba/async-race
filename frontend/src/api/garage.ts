import { apiClient } from './client';
import config from '../config';
import type { Car, CarCreateData, CarUpdateData, PaginatedResponse } from '../types';

export class GarageApi {
  private readonly basePath = '/garage';

  async getAll(): Promise<Car[]> {
    return apiClient.get<Car[]>(this.basePath);
  }

  async getPage(page: number = 1, limit: number = 7): Promise<PaginatedResponse<Car>> {
    const url = `${config.apiUrl}${this.basePath}?_page=${page}&_limit=${limit}`;
    const response = await fetch(url);
    
    const items = await response.json();
    const total = parseInt(response.headers.get('X-Total-Count') || '0', 10);
    
    return { items, total, page, limit };
  }

  async getOne(id: number): Promise<Car> {
    return apiClient.get<Car>(`${this.basePath}/${id}`);
  }

  async create(data: CarCreateData): Promise<Car> {
    return apiClient.post<Car>(this.basePath, data);
  }

  async update(id: number, data: CarUpdateData): Promise<Car> {
    return apiClient.put<Car>(`${this.basePath}/${id}`, data);
  }

  async delete(id: number): Promise<void> {
    await apiClient.delete<void>(`${this.basePath}/${id}`);
  }
}

export const garageApi = new GarageApi();