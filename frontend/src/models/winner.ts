import type { Winner, WinnerWithCar } from '../types';
import type { CarModel } from './car';

/**
 * Модель победителя
 * Содержит бизнес-логику для работы с победителями
 */
export class WinnerModel {
  private _id: number;
  private _wins: number;
  private _time: number;
  private _name?: string;
  private _color?: string;

  constructor(data: Winner | WinnerWithCar) {
    this._id = data.id;
    this._wins = data.wins || 0;
    this._time = data.time || 0;
    
    if ('name' in data) {
      this._name = data.name;
      this._color = data.color;
    }
  }

  // Геттеры
  get id(): number {
    return this._id;
  }

  get wins(): number {
    return this._wins;
  }

  get time(): number {
    return this._time;
  }

  get name(): string | undefined {
    return this._name;
  }

  get color(): string | undefined {
    return this._color;
  }

  get averageTime(): number {
    return this._wins > 0 ? this._time / this._wins : 0;
  }

  // Сеттеры с валидацией
  set wins(value: number) {
    if (value < 0) {
      throw new Error('Wins cannot be negative');
    }
    this._wins = value;
  }

  set time(value: number) {
    if (value < 0) {
      throw new Error('Time cannot be negative');
    }
    this._time = value;
  }

  set name(value: string | undefined) {
    if (value !== undefined && value.trim().length === 0) {
      throw new Error('Winner name cannot be empty');
    }
    this._name = value?.trim();
  }

  set color(value: string | undefined) {
    if (value !== undefined && !this.isValidColor(value)) {
      throw new Error('Invalid color format');
    }
    this._color = value;
  }

  // Методы
  addWin(time: number): void {
    if (time < 0) {
      throw new Error('Time cannot be negative');
    }
    this._wins++;
    this._time = this._time === 0 ? time : Math.min(this._time, time);
  }

  updateBestTime(time: number): void {
    if (time < 0) {
      throw new Error('Time cannot be negative');
    }
    if (this._time === 0 || time < this._time) {
      this._time = time;
    }
  }

  hasCarInfo(): boolean {
    return this._name !== undefined && this._color !== undefined;
  }

  toJSON(): Winner {
    return {
      id: this._id,
      wins: this._wins,
      time: this._time,
    };
  }

  toJSONWithCar(): WinnerWithCar {
    return {
      id: this._id,
      wins: this._wins,
      time: this._time,
      name: this._name || `Car ${this._id}`,
      color: this._color || '#888888',
    };
  }

  clone(): WinnerModel {
    return new WinnerModel(this.toJSONWithCar());
  }

  private isValidColor(color: string): boolean {
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexPattern.test(color);
  }

  // Статические методы
  static create(id: number, time: number): Omit<Winner, 'wins'> {
    if (id <= 0) {
      throw new Error('Invalid winner id');
    }
    if (time < 0) {
      throw new Error('Time cannot be negative');
    }
    return {
      id,
      time,
    };
  }

  static fromCar(car: CarModel, time: number): WinnerModel {
    if (time < 0) {
      throw new Error('Time cannot be negative');
    }
    return new WinnerModel({
      id: car.id,
      name: car.name,
      color: car.color,
      wins: 0,
      time,
    });
  }

  static fromJSON(data: Winner | WinnerWithCar): WinnerModel {
    return new WinnerModel(data);
  }

  static fromArray(data: (Winner | WinnerWithCar)[]): WinnerModel[] {
    return data.map((winner: Winner | WinnerWithCar) => new WinnerModel(winner));
  }

  static sortByTime(winners: WinnerModel[]): WinnerModel[] {
    return [...winners].sort((a: WinnerModel, b: WinnerModel) => a.time - b.time);
  }

  static sortByWins(winners: WinnerModel[]): WinnerModel[] {
    return [...winners].sort((a: WinnerModel, b: WinnerModel) => b.wins - a.wins);
  }

  static getBestWinner(winners: WinnerModel[]): WinnerModel | null {
    if (winners.length === 0) return null;
    return winners.reduce((a: WinnerModel, b: WinnerModel) => a.time < b.time ? a : b);
  }
}

/**
 * Утилиты для работы с победителями
 */
export const WinnerUtils = {
  /**
   * Форматирование времени
   */
  getTimeFormat(time: number): string {
    return time.toFixed(2) + 'с';
  },

  /**
   * Получение текста с правильным склонением слова "победа"
   */
  getWinsText(wins: number): string {
    const cases: number[] = [2, 0, 1, 1, 1, 2];
    const titles: string[] = ['победа', 'победы', 'побед'];
    const index: number = (wins % 100 > 4 && wins % 100 < 20) ? 2 : cases[Math.min(wins % 10, 5)];
    return `${wins} ${titles[index]}`;
  },

  /**
   * Форматирование времени в читаемый формат
   */
  getFormattedTime(time: number): string {
    const minutes: number = Math.floor(time / 60);
    const seconds: number = time % 60;
    if (minutes > 0) {
      return `${minutes}м ${seconds.toFixed(2)}с`;
    }
    return `${seconds.toFixed(2)}с`;
  },

  /**
   * Проверка, является ли объект валидным победителем
   */
  isValidWinner(data: unknown): data is Winner {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    
    // Безопасное приведение через unknown
    const winner = data as unknown as Record<string, unknown>;
    
    return (
      typeof winner.id === 'number' &&
      typeof winner.wins === 'number' &&
      typeof winner.time === 'number'
    );
  },

  /**
   * Проверка, является ли объект валидным победителем с информацией об автомобиле
   */
  isValidWinnerWithCar(data: unknown): data is WinnerWithCar {
    if (!this.isValidWinner(data)) {
      return false;
    }
    
    // Безопасное приведение через unknown
    const winner = data as unknown as Record<string, unknown>;
    
    return (
      typeof winner.name === 'string' &&
      typeof winner.color === 'string'
    );
  },

  /**
   * Получение текста позиции в гонке (1st, 2nd, 3rd, ...)
   */
  getRankingText(position: number): string {
    const suffixes: string[] = ['st', 'nd', 'rd'];
    const v: number = position % 100;
    const suffix: string = (v > 3 && v < 21) ? 'th' : suffixes[Math.min(v % 10, 3) - 1] || 'th';
    return `${position}${suffix}`;
  },

  /**
   * Получение эмодзи медали по позиции
   */
  getMedalEmoji(position: number): string {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return '🏅';
  },

  /**
   * Сортировка победителей по времени
   */
  sortByTime(winners: WinnerModel[]): WinnerModel[] {
    return [...winners].sort((a: WinnerModel, b: WinnerModel) => a.time - b.time);
  },

  /**
   * Сортировка победителей по количеству побед
   */
  sortByWins(winners: WinnerModel[]): WinnerModel[] {
    return [...winners].sort((a: WinnerModel, b: WinnerModel) => b.wins - a.wins);
  },

  /**
   * Получение лучшего победителя (с наименьшим временем)
   */
  getBestWinner(winners: WinnerModel[]): WinnerModel | null {
    if (winners.length === 0) return null;
    return winners.reduce((a: WinnerModel, b: WinnerModel) => a.time < b.time ? a : b);
  },
};

/**
 * Тип для фабрики победителей
 */
export type WinnerFactory = {
  create: (id: number, time: number) => Omit<Winner, 'wins'>;
  createFromCar: (car: CarModel, time: number) => WinnerModel;
  createFromJSON: (data: Winner | WinnerWithCar) => WinnerModel;
};

/**
 * Фабрика для создания победителей
 */
export const winnerFactory: WinnerFactory = {
  create: (id: number, time: number): Omit<Winner, 'wins'> => {
    if (id <= 0) {
      throw new Error('Invalid winner id');
    }
    if (time < 0) {
      throw new Error('Time cannot be negative');
    }
    return { id, time };
  },

  createFromCar: (car: CarModel, time: number): WinnerModel => {
    return WinnerModel.fromCar(car, time);
  },

  createFromJSON: (data: Winner | WinnerWithCar): WinnerModel => {
    return WinnerModel.fromJSON(data);
  },
};