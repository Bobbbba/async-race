import type { Car, CarCreateData, CarUpdateData } from '../types';
import { garageApi } from '../api/garage';

export class GarageStore {
  private _cars: Car[] = [];
  private _currentPage: number = 1;
  private _limit: number = 7;
  private _total: number = 0;
  private _listeners: (() => void)[] = [];

  get cars(): Car[] {
    return this._cars;
  }

  get currentPage(): number {
    return this._currentPage;
  }

  get limit(): number {
    return this._limit;
  }

  get total(): number {
    return this._total;
  }

  get totalPages(): number {
    return Math.ceil(this._total / this._limit) || 1;
  }

  subscribe(listener: () => void): () => void {
    this._listeners.push(listener);
    // Возвращаем функцию для отписки
    const unsubscribe = (): void => {
      const index = this._listeners.indexOf(listener);
      if (index > -1) {
        this._listeners.splice(index, 1);
      }
    };
    return unsubscribe;
  }

  private notify(): void {
    this._listeners.forEach(listener => listener());
  }

  async loadPage(page: number = this._currentPage): Promise<void> {
    const result = await garageApi.getPage(page, this._limit);
    this._cars = result.items;
    this._currentPage = result.page;
    this._total = result.total;
    this.notify();
  }

  async nextPage(): Promise<void> {
    if (this._currentPage < this.totalPages) {
      await this.loadPage(this._currentPage + 1);
    }
  }

  async prevPage(): Promise<void> {
    if (this._currentPage > 1) {
      await this.loadPage(this._currentPage - 1);
    }
  }

  async createCar(data: CarCreateData): Promise<Car> {
    const car = await garageApi.create(data);
    await this.loadPage(this._currentPage);
    return car;
  }

  async updateCar(id: number, data: CarUpdateData): Promise<Car> {
    const car = await garageApi.update(id, data);
    await this.loadPage(this._currentPage);
    return car;
  }

  async deleteCar(id: number): Promise<void> {
    await garageApi.delete(id);
    if (this._cars.length === 0 && this._currentPage > 1) {
      this._currentPage--;
    }
    await this.loadPage(this._currentPage);
  }

  async getCar(id: number): Promise<Car | undefined> {
    try {
      return await garageApi.getOne(id);
    } catch {
      return undefined;
    }
  }

  updateCarState(id: number, updates: Partial<Car>): void {
    const car = this._cars.find(c => c.id === id);
    if (car) {
      Object.assign(car, updates);
      this.notify();
    }
  }

  resetCars(): void {
    this._cars.forEach(car => {
      this.updateCarState(car.id, {
        status: 'stopped',
        position: 0,
        time: 0,
        velocity: undefined,
      });
    });
  }
}

export const garageStore = new GarageStore();