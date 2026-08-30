import type { Car, WinnerWithCar } from '../types';
import { engineApi } from '../api/engine';
import { winnersApi } from '../api/winners';
import { garageStore } from './garage.store';

const DISTANCE = 500000;

export class RaceStore {
  private _isRacing: boolean = false;
  private _finishedCount: number = 0;
  private _startTime: number = 0;
  private _winners: WinnerWithCar[] = [];
  private _animations: Map<number, number> = new Map();
  private _animationFrames: Map<number, number> = new Map();
  private _listeners: (() => void)[] = [];
  private _carAnimations: Map<number, {
    startTime: number;
    duration: number;
    startPosition: number;
    endPosition: number;
  }> = new Map();

  get isRacing(): boolean {
    return this._isRacing;
  }

  get finishedCount(): number {
    return this._finishedCount;
  }

  get winners(): WinnerWithCar[] {
    return this._winners;
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

  setFinishedCount(count: number): void {
    if (count < 0) {
      throw new Error('Finished count cannot be negative');
    }
    this._finishedCount = count;
    this.notify();
  }

  incrementFinishedCount(): void {
    this._finishedCount++;
    this.notify();
  }

  resetFinishedCount(): void {
    this._finishedCount = 0;
    this.notify();
  }

  getFinishedCount(): number {
    return this._finishedCount;
  }

  isRaceComplete(): boolean {
    const totalCars = garageStore.cars.length;
    return totalCars > 0 && this._finishedCount >= totalCars;
  }

  getRaceProgress(): number {
    const totalCars = garageStore.cars.length;
    if (totalCars === 0) return 0;
    return (this._finishedCount / totalCars) * 100;
  }

  /**
   * Запуск двигателя для одного автомобиля
   */
  async startCar(id: number): Promise<void> {
    const car = garageStore.cars.find(c => c.id === id);
    if (!car || this._isRacing) {
      return;
    }

    // Если машина уже едет, ничего не делаем
    if (car.status === 'racing') {
      return;
    }

    try {
      // 1. Запускаем двигатель
      const engineData = await engineApi.start(id);
      
      // 2. Обновляем состояние
      garageStore.updateCarState(id, {
        status: 'racing',
        position: 0,
        velocity: engineData.velocity,
        time: 0,
      });

      this.notify();

      // 3. Запускаем анимацию
      await this.animateCar(id);
      
    } catch (error) {
      garageStore.updateCarState(id, { status: 'stopped' });
      this.notify();
      throw error;
    }
  }

  /**
   * Остановка двигателя для одного автомобиля
   */
  async stopCar(id: number): Promise<void> {
    const car = garageStore.cars.find(c => c.id === id);
    if (!car) {
      return;
    }

    // Если машина уже остановлена, ничего не делаем
    if (car.status === 'stopped') {
      return;
    }

    try {
      // 1. Останавливаем анимацию
      this.stopAnimation(id);

      // 2. Останавливаем двигатель
      await engineApi.stop(id);
      
      // 3. Возвращаем машину в исходное положение
      garageStore.updateCarState(id, {
        status: 'stopped',
        position: 0,
        time: 0,
        velocity: undefined,
      });

      // 4. Удаляем из гонки если была
      if (this._carAnimations.has(id)) {
        this._carAnimations.delete(id);
      }

      this.notify();
    } catch (error) {
      console.error(`Failed to stop car ${id}:`, error);
      throw error;
    }
  }

  /**
   * Анимация движения автомобиля
   */
  private async animateCar(carId: number): Promise<void> {
    const car = garageStore.cars.find(c => c.id === carId);
    if (!car || !car.velocity || car.status !== 'racing') {
      return;
    }

    // Останавливаем предыдущую анимацию если есть
    this.stopAnimation(carId);

    const trackWidth = this.getTrackWidth(carId);
    const duration = this.calculateDuration(trackWidth, car.velocity);
    const startTime = performance.now();

    // Сохраняем данные анимации
    this._carAnimations.set(carId, {
      startTime,
      duration,
      startPosition: 0,
      endPosition: 100,
    });

    // Запускаем анимацию с использованием requestAnimationFrame
    const animate = async (timestamp: number): Promise<void> => {
      const carData = garageStore.cars.find(c => c.id === carId);
      if (!carData || carData.status !== 'racing') {
        return;
      }

      const animData = this._carAnimations.get(carId);
      if (!animData) {
        return;
      }

      const elapsed = timestamp - animData.startTime;
      const progress = Math.min(elapsed / animData.duration, 1);

      // Easing функция для плавного движения
      const easedProgress = this.easeInOut(progress);
      const position = easedProgress * 100;

      // Обновляем позицию
      garageStore.updateCarState(carId, { position });
      this.notify();

      if (progress < 1) {
        // Продолжаем анимацию
        const frameId = requestAnimationFrame(animate);
        this._animationFrames.set(carId, frameId);
      } else {
        // Финиш!
        const time = (Date.now() - this._startTime) / 1000;
        await this.finishCar(carId, time);
      }
    };

    // Запускаем анимацию с небольшой задержкой
    const initialDelay = Math.random() * 300;
    setTimeout(() => {
      // Отправляем запрос drive
      this.sendDriveRequest(carId).catch(() => {
        // Если запрос drive вернул 500, останавливаем анимацию
        this.stopAnimation(carId);
        garageStore.updateCarState(carId, { 
          status: 'broken',
          position: car.position || 0 
        });
        this.notify();
      });

      // Запускаем анимацию
      const frameId = requestAnimationFrame(animate);
      this._animationFrames.set(carId, frameId);
    }, initialDelay);
  }

  /**
   * Отправка запроса drive
   */
  private async sendDriveRequest(carId: number): Promise<void> {
    try {
      await engineApi.drive(carId);
    } catch (error) {
      // Если ошибка 500 - машина сломалась
      if (error instanceof Error && error.message.includes('broken down')) {
        throw error;
      }
      // Другие ошибки тоже пробрасываем
      throw error;
    }
  }

  /**
   * Остановка анимации для конкретного автомобиля
   */
  private stopAnimation(carId: number): void {
    const frameId = this._animationFrames.get(carId);
    if (frameId) {
      cancelAnimationFrame(frameId);
      this._animationFrames.delete(carId);
    }
    this._carAnimations.delete(carId);
  }

  /**
   * Завершить гонку для автомобиля
   */
  private async finishCar(carId: number, time: number, isBroken: boolean = false): Promise<void> {
    const car = garageStore.cars.find(c => c.id === carId);
    if (!car || car.status === 'finished' || car.status === 'broken') {
      return;
    }

    const status = isBroken ? 'broken' : 'finished';
    garageStore.updateCarState(carId, { 
      status, 
      position: isBroken ? car.position : 100,
      time: isBroken ? 0 : time 
    });

    // Удаляем анимацию
    this.stopAnimation(carId);

    if (!isBroken) {
      this.incrementFinishedCount();
      this._winners.push({
        id: car.id,
        name: car.name,
        color: car.color,
        wins: 0,
        time,
      });

      // Сохраняем победителя
      try {
        const existingWinner = await winnersApi.getOne(carId);
        if (existingWinner) {
          await winnersApi.update(carId, {
            wins: existingWinner.wins + 1,
            time: Math.min(existingWinner.time, time),
          });
        } else {
          await winnersApi.create(carId, 1, time);
        }
      } catch {
        await winnersApi.create(carId, 1, time);
      }
    }

    const totalCars = garageStore.cars.length;
    const finishedCars = garageStore.cars.filter(
      c => c.status === 'finished' || c.status === 'broken'
    ).length;

    if (finishedCars === totalCars) {
      this.endRace();
    }

    this.notify();
  }

  /**
   * Завершить гонку
   */
  private endRace(): void {
    this._isRacing = false;
    this.notify();
  }

  /**
   * Запустить гонку для всех автомобилей
   */
  async startRace(): Promise<void> {
    const cars = garageStore.cars;
    if (cars.length === 0) {
      throw new Error('No cars in garage');
    }

    if (this._isRacing) {
      throw new Error('Race already in progress');
    }

    this._isRacing = true;
    this._finishedCount = 0;
    this._winners = [];
    this._startTime = Date.now();
    this._carAnimations.clear();
    this._animationFrames.clear();

    this.notify();

    // Запускаем все двигатели
    const startPromises = cars.map(async (car) => {
      try {
        const engineData = await engineApi.start(car.id);
        garageStore.updateCarState(car.id, {
          status: 'racing',
          position: 0,
          velocity: engineData.velocity,
          time: 0,
        });
        return { ...car, velocity: engineData.velocity };
      } catch {
        garageStore.updateCarState(car.id, { status: 'stopped' });
        return null;
      }
    });

    const startedCars = (await Promise.all(startPromises)).filter(
      (car): car is Car & { velocity: number } => 
        car !== null && car.velocity !== undefined
    );

    // Запускаем анимацию для каждой машины
    for (const car of startedCars) {
      await this.animateCar(car.id);
    }
  }

  /**
   * Сброс гонки
   */
  async resetRace(): Promise<void> {
    this._isRacing = false;
    this._finishedCount = 0;
    this._startTime = 0;
    this._winners = [];
    this._carAnimations.clear();

    // Останавливаем все анимации
    this._animationFrames.forEach((frameId) => {
      cancelAnimationFrame(frameId);
    });
    this._animationFrames.clear();

    // Останавливаем все двигатели
    const cars = garageStore.cars;
    await Promise.all(
      cars.map(car => 
        engineApi.stop(car.id).catch(() => {})
      )
    );

    // Сбрасываем состояние машин
    cars.forEach(car => {
      garageStore.updateCarState(car.id, {
        status: 'stopped',
        position: 0,
        time: 0,
        velocity: undefined,
      });
    });

    this.notify();
  }

  /**
   * Рассчитать длительность анимации
   */
  private calculateDuration(trackWidth: number, velocity: number): number {
    const pixels = trackWidth;
    const timeInSeconds = pixels / (velocity * 1.5);
    return Math.max(timeInSeconds * 1000, 1000);
  }

  /**
   * Получить ширину трека для автомобиля
   */
  private getTrackWidth(carId: number): number {
    const trackElement = document.getElementById(`track-${carId}`);
    if (trackElement) {
      return Math.max(trackElement.clientWidth - 50, 200);
    }
    return 500;
  }

  /**
   * Easing функция для плавного движения
   */
  private easeInOut(t: number): number {
    return t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  getWinner(): WinnerWithCar | null {
    if (this._winners.length === 0) {
      return null;
    }
    return this._winners.reduce((a, b) => a.time < b.time ? a : b);
  }
}

export const raceStore = new RaceStore();