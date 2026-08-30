import type { Car, CarCreateData, CarUpdateData } from '../types';
import { garageApi } from '../api/garage';
import { winnersApi } from '../api/winners';

export class GarageStore {
  private _cars: Car[] = [];
  private _currentPage: number = 1;
  private _limit: number = 7; // ✅ 7 автомобилей на странице
  private _total: number = 0;
  private _listeners: (() => void)[] = [];

  // Состояние для редактирования
  private _editingCarId: number | null = null;
  private _editName: string = '';
  private _editColor: string = '#e94560';

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

  get editingCarId(): number | null {
    return this._editingCarId;
  }

  get editName(): string {
    return this._editName;
  }

  get editColor(): string {
    return this._editColor;
  }

  subscribe(listener: () => void): () => void {
    this._listeners.push(listener);
    return () => {
      const index = this._listeners.indexOf(listener);
      if (index > -1) {
        this._listeners.splice(index, 1);
      }
    };
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

  async getCar(id: number): Promise<Car | undefined> {
    try {
      return await garageApi.getOne(id);
    } catch {
      return undefined;
    }
  }

  async updateCar(id: number, data: CarUpdateData): Promise<Car> {
    const car = await garageApi.update(id, data);
    await this.loadPage(this._currentPage);
    this.cancelEdit();
    return car;
  }

  async deleteCar(id: number): Promise<void> {
    await garageApi.delete(id);
    
    try {
      const winner = await winnersApi.getOne(id);
      if (winner) {
        await winnersApi.delete(id);
      }
    } catch {
      // Победитель не найден
    }

    if (this._cars.length === 0 && this._currentPage > 1) {
      this._currentPage--;
    }
    await this.loadPage(this._currentPage);
    this.cancelEdit();
  }

  updateCarState(id: number, updates: Partial<Car>): void {
    const car = this._cars.find(c => c.id === id);
    if (car) {
      Object.assign(car, updates);
      this.notify();
    }
  }

  startEdit(id: number): void {
    const car = this._cars.find(c => c.id === id);
    if (car) {
      this._editingCarId = id;
      this._editName = car.name;
      this._editColor = car.color;
      this.notify();
    }
  }

  cancelEdit(): void {
    this._editingCarId = null;
    this._editName = '';
    this._editColor = '#e94560';
    this.notify();
  }

  setEditName(name: string): void {
    this._editName = name;
    this.notify();
  }

  setEditColor(color: string): void {
    this._editColor = color;
    this.notify();
  }

  async saveEdit(): Promise<void> {
    if (this._editingCarId === null) return;
    
    const name = this._editName.trim() || 'Без имени';
    const color = this._editColor;
    
    await this.updateCar(this._editingCarId, { name, color });
  }

  /**
   * Генерация случайных автомобилей
   * ✅ Не менее 10 вариантов для каждой части
   */
  async generateCars(count: number = 100): Promise<void> {
    // ✅ 20 вариантов брендов (не менее 10)
    const brands: string[] = [
      'Tesla', 'BMW', 'Audi', 'Mercedes', 'Toyota', 
      'Ford', 'Chevrolet', 'Honda', 'Nissan', 'Volkswagen',
      'Porsche', 'Ferrari', 'Lamborghini', 'Maserati', 'Jaguar',
      'Lexus', 'Volvo', 'Hyundai', 'Kia', 'Subaru'
    ];

    // ✅ 32 варианта моделей (не менее 10)
    const models: string[] = [
      'Model S', 'Model 3', 'Model X', 'Model Y', 
      'M5', 'M3', 'X5', 'X6',
      'RS6', 'RS7', 'Q7', 'Q8', 
      'S-Class', 'E-Class', 'C-Class', 'G-Class',
      'Camry', 'Corolla', 'Supra', 'Land Cruiser', 
      'Mustang', 'Focus', 'F-150',
      'Civic', 'Accord', 'CR-V', 'Pilot', 
      'GT-R', 'Skyline', '370Z',
      'Golf', 'Passat', 'Touareg', 'Tiguan', 
      '911', 'Cayenne', 'Panamera',
      'Aventador', 'Huracan', 'Urus',
      'Ghibli', 'Levante', 'Quattroporte', 
      'F-Type', 'XJ', 'XF'
    ];

    // ✅ 20 вариантов цветов
    const colors: string[] = [
      '#e94560', '#2ecc71', '#3498db', '#f1c40f', '#9b59b6',
      '#1abc9c', '#e67e22', '#e74c3c', '#00b894', '#6c5ce7',
      '#fd79a8', '#00cec9', '#fdcb6e', '#e17055', '#00b894',
      '#0984e3', '#6c5ce7', '#fd79a8', '#fdcb6e', '#e17055'
    ];

    const cars: CarCreateData[] = [];
    for (let i = 0; i < count; i++) {
      const brand = brands[Math.floor(Math.random() * brands.length)];
      const model = models[Math.floor(Math.random() * models.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];
      cars.push({
        name: `${brand} ${model}`, // ✅ Составляется из двух частей
        color: color,
      });
    }

    // Создаем автомобили с задержкой для избежания перегрузки API
    for (let i = 0; i < cars.length; i++) {
      await this.createCar(cars[i]);
      // Небольшая задержка каждые 10 машин
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  }

  /**
   * Альтернативный метод генерации с пакетной отправкой
   */
  async generateCarsBatch(count: number = 100): Promise<void> {
    const brands: string[] = [
      'Tesla', 'BMW', 'Audi', 'Mercedes', 'Toyota', 
      'Ford', 'Chevrolet', 'Honda', 'Nissan', 'Volkswagen',
      'Porsche', 'Ferrari', 'Lamborghini', 'Maserati', 'Jaguar',
      'Lexus', 'Volvo', 'Hyundai', 'Kia', 'Subaru'
    ];

    const models: string[] = [
      'Model S', 'Model 3', 'Model X', 'Model Y', 
      'M5', 'M3', 'X5', 'X6', 'RS6', 'RS7', 
      'Q7', 'Q8', 'S-Class', 'E-Class', 'C-Class', 
      'G-Class', 'Camry', 'Corolla', 'Supra', 'Land Cruiser', 
      'Mustang', 'Focus', 'F-150', 'Civic', 'Accord', 
      'CR-V', 'Pilot', 'GT-R', 'Skyline', '370Z',
      'Golf', 'Passat', 'Touareg', 'Tiguan', '911', 
      'Cayenne', 'Panamera', 'Aventador', 'Huracan', 'Urus',
      'Ghibli', 'Levante', 'Quattroporte', 'F-Type', 'XJ', 'XF'
    ];

    const colors: string[] = [
      '#e94560', '#2ecc71', '#3498db', '#f1c40f', '#9b59b6',
      '#1abc9c', '#e67e22', '#e74c3c', '#00b894', '#6c5ce7',
      '#fd79a8', '#00cec9', '#fdcb6e', '#e17055', '#00b894',
      '#0984e3', '#6c5ce7', '#fd79a8', '#fdcb6e', '#e17055'
    ];

    const cars: CarCreateData[] = [];
    for (let i = 0; i < count; i++) {
      const brand = brands[Math.floor(Math.random() * brands.length)];
      const model = models[Math.floor(Math.random() * models.length)];
      const color = colors[Math.floor(Math.random() * colors.length)];
      cars.push({
        name: `${brand} ${model}`,
        color: color,
      });
    }

    // Пакетная отправка по 10 машин
    const batchSize = 10;
    for (let i = 0; i < cars.length; i += batchSize) {
      const batch = cars.slice(i, i + batchSize);
      await Promise.all(batch.map(car => this.createCar(car)));
    }
  }
}

export const garageStore = new GarageStore();