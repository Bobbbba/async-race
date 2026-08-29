import type { Car, CarStatus, CarCreateData } from '../types';

/**
 * Модель автомобиля
 * Содержит бизнес-логику и валидацию для автомобиля
 */
export class CarModel {
  private _id: number;
  private _name: string;
  private _color: string;
  private _status: CarStatus;
  private _position: number;
  private _velocity?: number;
  private _time?: number;

  constructor(data: Car) {
    this._id = data.id;
    this._name = data.name;
    this._color = data.color;
    this._status = data.status || 'stopped';
    this._position = data.position || 0;
    this._velocity = data.velocity;
    this._time = data.time;
  }

  // Геттеры
  get id(): number {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get color(): string {
    return this._color;
  }

  get status(): CarStatus {
    return this._status;
  }

  get position(): number {
    return this._position;
  }

  get velocity(): number | undefined {
    return this._velocity;
  }

  get time(): number | undefined {
    return this._time;
  }

  // Сеттеры с валидацией
  set name(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('Car name cannot be empty');
    }
    this._name = value.trim();
  }

  set color(value: string) {
    if (!this.isValidColor(value)) {
      throw new Error('Invalid color format. Use HEX format like #e94560');
    }
    this._color = value;
  }

  set status(value: CarStatus) {
    this._status = value;
  }

  set position(value: number) {
    if (value < 0 || value > 100) {
      throw new Error('Position must be between 0 and 100');
    }
    this._position = value;
  }

  set velocity(value: number | undefined) {
    if (value !== undefined && (value < 0 || value > 300)) {
      throw new Error('Velocity must be between 0 and 300');
    }
    this._velocity = value;
  }

  set time(value: number | undefined) {
    if (value !== undefined && value < 0) {
      throw new Error('Time cannot be negative');
    }
    this._time = value;
  }

  // Методы
  isRacing(): boolean {
    return this._status === 'racing';
  }

  isFinished(): boolean {
    return this._status === 'finished';
  }

  isBroken(): boolean {
    return this._status === 'broken';
  }

  isStopped(): boolean {
    return this._status === 'stopped';
  }

  isAtFinish(): boolean {
    return this._position >= 100;
  }

  getProgress(): number {
    return Math.min(this._position, 100);
  }

  reset(): void {
    this._status = 'stopped';
    this._position = 0;
    this._velocity = undefined;
    this._time = undefined;
  }

  toJSON(): Car {
    return {
      id: this._id,
      name: this._name,
      color: this._color,
      status: this._status,
      position: this._position,
      velocity: this._velocity,
      time: this._time,
    };
  }

  clone(): CarModel {
    return new CarModel(this.toJSON());
  }

  /**
   * Проверка валидности HEX цвета
   */
  private isValidColor(color: string): boolean {
    // Проверка HEX формата: #RRGGBB или #RGB
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const result = hexPattern.test(color);
    return result; // test() всегда возвращает boolean
  }

  // Статические методы для создания
  static create(data: CarCreateData): Omit<Car, 'id' | 'status' | 'position'> {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Car name cannot be empty');
    }
    
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!data.color || !hexPattern.test(data.color)) {
      throw new Error('Invalid color format. Use HEX format like #e94560');
    }
    
    return {
      name: data.name.trim(),
      color: data.color,
    };
  }

  static fromJSON(data: Car): CarModel {
    return new CarModel(data);
  }

  static fromArray(data: Car[]): CarModel[] {
    return data.map((car: Car) => new CarModel(car));
  }
}

/**
 * Утилиты для работы с автомобилями
 */
export const CarUtils = {
  /**
   * Получить текстовое описание статуса
   */
  getStatusText(status: CarStatus): string {
    const statusMap: Record<CarStatus, string> = {
      'racing': '🏃 Гонка...',
      'finished': '✅ Финиш',
      'broken': '💥 Сломана',
      'stopped': '⏸ Остановлен',
    };
    return statusMap[status] || statusMap.stopped;
  },

  /**
   * Получить иконку статуса
   */
  getStatusIcon(status: CarStatus): string {
    const iconMap: Record<CarStatus, string> = {
      'racing': '🏎️',
      'finished': '🏁',
      'broken': '🔧',
      'stopped': '🚗',
    };
    return iconMap[status] || iconMap.stopped;
  },

  /**
   * Проверка валидности имени
   */
  isValidName(name: string): boolean {
    return typeof name === 'string' && name.trim().length > 0;
  },

  /**
   * Проверка валидности HEX цвета
   */
  isValidColor(color: string): boolean {
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexPattern.test(color);
  },

  /**
   * Проверка валидности позиции
   */
  isValidPosition(position: number): boolean {
    return typeof position === 'number' && position >= 0 && position <= 100;
  },

  /**
   * Получить случайный цвет
   */
  getRandomColor(): string {
    const colors: string[] = [
      '#e94560', '#2ecc71', '#3498db', '#f1c40f',
      '#9b59b6', '#1abc9c', '#e67e22', '#e74c3c',
      '#00b894', '#6c5ce7', '#fd79a8', '#00cec9',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  },

  /**
   * Получить случайное имя
   */
  getRandomName(): string {
    const brands: string[] = [
      'Tesla', 'BMW', 'Audi', 'Mercedes', 'Toyota',
      'Ford', 'Chevrolet', 'Honda', 'Nissan', 'Volkswagen',
      'Porsche', 'Ferrari', 'Lamborghini', 'Maserati', 'Jaguar',
    ];
    const models: string[] = [
      'S', '3', 'X', 'Y', 'M5', 'RS6', 'G63',
      'Civic', 'Accord', 'Camry', '911', '488',
      'Huracan', 'Ghibli', 'F-Type',
    ];
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const model = models[Math.floor(Math.random() * models.length)];
    return `${brand} ${model}`;
  },

  /**
   * Сгенерировать массив случайных автомобилей
   */
  generateCars(count: number): CarCreateData[] {
    const cars: CarCreateData[] = [];
    for (let i = 0; i < count; i++) {
      cars.push({
        name: this.getRandomName(),
        color: this.getRandomColor(),
      });
    }
    return cars;
  },

  /**
   * Форматирование времени
   */
  getTimeFormat(time: number): string {
    return time.toFixed(2) + 'с';
  },

  /**
   * Форматирование позиции в проценты
   */
  getPositionPercent(position: number): string {
    return Math.min(position, 100).toFixed(0) + '%';
  },
};

/**
 * Тип для фабрики автомобилей
 */
export type CarFactory = {
  create: (data: CarCreateData) => Omit<Car, 'id' | 'status' | 'position'>;
  createWithId: (data: CarCreateData, id: number) => Car;
};

/**
 * Фабрика для создания автомобилей
 */
export const carFactory: CarFactory = {
  create: (data: CarCreateData): Omit<Car, 'id' | 'status' | 'position'> => {
    if (!CarUtils.isValidName(data.name)) {
      throw new Error('Invalid car name');
    }
    if (!CarUtils.isValidColor(data.color)) {
      throw new Error('Invalid car color');
    }
    return {
      name: data.name.trim(),
      color: data.color,
    };
  },

  createWithId: (data: CarCreateData, id: number): Car => {
    if (!CarUtils.isValidName(data.name)) {
      throw new Error('Invalid car name');
    }
    if (!CarUtils.isValidColor(data.color)) {
      throw new Error('Invalid car color');
    }
    if (id <= 0) {
      throw new Error('Invalid car id');
    }
    return {
      id,
      name: data.name.trim(),
      color: data.color,
      status: 'stopped',
      position: 0,
    };
  },
};