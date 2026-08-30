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
    if (!car) {
      console.error(`Car with id ${id} not found`);
      return;
    }

    // Если машина уже едет или гонка активна, ничего не делаем
    if (this._isRacing) {
      console.warn('Race is already in progress');
      return;
    }

    if (car.status === 'racing') {
      console.warn('Car is already racing');
      return;
    }

    try {
      console.log(`Starting car ${id}...`);
      
      // 1. Запускаем двигатель через API
      const engineData = await engineApi.start(id);
      console.log(`Engine started for car ${id}:`, engineData);
      
      // 2. Обновляем состояние автомобиля
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
      console.error(`Failed to start car ${id}:`, error);
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
      console.error(`Car with id ${id} not found`);
      return;
    }

    if (car.status === 'stopped') {
      console.warn('Car is already stopped');
      return;
    }

    try {
      console.log(`Stopping car ${id}...`);

      // 1. Останавливаем анимацию
      this.stopAnimation(id);

      // 2. Останавливаем двигатель через API
      await engineApi.stop(id);
      console.log(`Engine stopped for car ${id}`);
      
      // 3. Возвращаем машину в исходное положение
      garageStore.updateCarState(id, {
        status: 'stopped',
        position: 0,
        time: 0,
        velocity: undefined,
      });

      // 4. Удаляем из анимаций
      this._carAnimations.delete(id);

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
    if (!car || !car.velocity) {
      console.error(`Car ${carId} has no velocity`);
      return;
    }

    if (car.status !== 'racing') {
      console.warn(`Car ${carId} is not in racing state`);
      return;
    }

    // Останавливаем предыдущую анимацию если есть
    this.stopAnimation(carId);

    const trackWidth = this.getTrackWidth(carId);
    const duration = this.calculateDuration(trackWidth, car.velocity);
    
    console.log(`Animating car ${carId} with velocity ${car.velocity}, duration ${duration}ms`);

    const startTime = performance.now();

    // Сохраняем данные анимации
    this._carAnimations.set(carId, {
      startTime,
      duration,
      startPosition: 0,
      endPosition: 100,
    });

    // Запускаем анимацию
    const animate = (timestamp: number): void => {
      const carData = garageStore.cars.find(c => c.id === carId);
      if (!carData || carData.status !== 'racing') {
        console.log(`Animation stopped for car ${carId}: status is ${carData?.status}`);
        return;
      }

      const animData = this._carAnimations.get(carId);
      if (!animData) {
        console.log(`Animation data not found for car ${carId}`);
        return;
      }

      const elapsed = timestamp - animData.startTime;
      const progress = Math.min(elapsed / animData.duration, 1);

      // Easing функция для плавного движения
      const easedProgress = this.easeInOut(progress);
      const position = easedProgress * 100;

      // Обновляем позицию
      garageStore.updateCarState(carId, { position });
      
      // Обновляем SVG позицию
      this.updateCarPosition(carId, position);
      
      this.notify();

      if (progress < 1) {
        // Продолжаем анимацию
        const frameId = requestAnimationFrame(animate);
        this._animationFrames.set(carId, frameId);
      } else {
        // Финиш!
        console.log(`Car ${carId} finished!`);
        const time = (Date.now() - this._startTime) / 1000;
        this.finishCar(carId, time);
      }
    };

    // Запускаем анимацию с небольшой задержкой
    const initialDelay = Math.random() * 300;
    console.log(`Starting animation for car ${carId} with delay ${initialDelay}ms`);
    
    setTimeout(() => {
      // Отправляем запрос drive
      this.sendDriveRequest(carId).catch((error) => {
        console.error(`Drive request failed for car ${carId}:`, error);
        // Если запрос drive вернул 500, останавливаем анимацию
        this.stopAnimation(carId);
        garageStore.updateCarState(carId, { 
          status: 'broken',
          position: car.position || 0 
        });
        this.updateCarStatus(carId, 'broken');
        this.notify();
      });

      // Запускаем анимацию
      const frameId = requestAnimationFrame(animate);
      this._animationFrames.set(carId, frameId);
    }, initialDelay);
  }

  /**
   * Обновить позицию автомобиля в DOM
   */
  private updateCarPosition(carId: number, position: number): void {
    const carSvg = document.getElementById(`car-${carId}`);
    if (carSvg) {
      carSvg.style.left = `${Math.min(position, 100)}%`;
    }
  }

  /**
   * Обновить статус автомобиля в DOM
   */
  private updateCarStatus(carId: number, status: string): void {
    const statusElement = document.getElementById(`status-${carId}`);
    if (statusElement) {
      let statusText = '';
      switch (status) {
        case 'racing':
          statusText = '🏃 Гонка...';
          break;
        case 'finished':
          statusText = '✅ Финиш';
          break;
        case 'broken':
          statusText = '💥 Сломана';
          break;
        default:
          statusText = '⏸ Остановлен';
      }
      statusElement.textContent = statusText;
      statusElement.className = `car-status ${status}`;
    }
  }

  /**
   * Отправка запроса drive
   */
  private async sendDriveRequest(carId: number): Promise<void> {
    try {
      console.log(`Sending drive request for car ${carId}...`);
      const result = await engineApi.drive(carId);
      console.log(`Drive request successful for car ${carId}:`, result);
    } catch (error) {
      if (error instanceof Error && error.message.includes('broken down')) {
        console.error(`Car ${carId} broke down!`);
        throw error;
      }
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
    
    console.log(`Car ${carId} finishing with status ${status}, time ${time}s`);
    
    garageStore.updateCarState(carId, { 
      status, 
      position: isBroken ? car.position : 100,
      time: isBroken ? 0 : time 
    });

    // Обновляем DOM
    this.updateCarPosition(carId, isBroken ? car.position || 0 : 100);
    this.updateCarStatus(carId, status);

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

    if (finishedCars === totalCars && this._isRacing) {
      this.endRace();
    }

    this.notify();
  }

  /**
   * Завершить гонку
   */
  private endRace(): void {
    console.log('Race ended!');
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

    console.log('Starting race with', cars.length, 'cars');

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
        console.log(`Car ${car.id} engine started:`, engineData);
        
        garageStore.updateCarState(car.id, {
          status: 'racing',
          position: 0,
          velocity: engineData.velocity,
          time: 0,
        });
        
        // Обновляем DOM
        this.updateCarPosition(car.id, 0);
        this.updateCarStatus(car.id, 'racing');
        
        return { ...car, velocity: engineData.velocity };
      } catch (error) {
        console.error(`Failed to start car ${car.id}:`, error);
        garageStore.updateCarState(car.id, { status: 'stopped' });
        this.updateCarStatus(car.id, 'stopped');
        return null;
      }
    });

    const startedCars = (await Promise.all(startPromises)).filter(
      (car): car is Car & { velocity: number } => 
        car !== null && car.velocity !== undefined
    );

    console.log('Started cars:', startedCars.length);

    // Запускаем анимацию для каждой машины
    for (const car of startedCars) {
      await this.animateCar(car.id);
    }
  }

  /**
   * Сброс гонки
   */
  async resetRace(): Promise<void> {
    console.log('Resetting race...');
    
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
      this.updateCarPosition(car.id, 0);
      this.updateCarStatus(car.id, 'stopped');
    });

    this.notify();
  }

  /**
   * Рассчитать длительность анимации
   */
  private calculateDuration(trackWidth: number, velocity: number): number {
    // Базовая формула: время = расстояние / скорость
    // Используем коэффициент для более реалистичной анимации
    const baseDuration = (trackWidth / velocity) * 1000;
    // Ограничиваем длительность от 1 до 8 секунд
    return Math.max(1000, Math.min(8000, baseDuration));
  }

  /**
   * Получить ширину трека для автомобиля
   */
  private getTrackWidth(carId: number): number {
    const trackElement = document.getElementById(`track-${carId}`);
    if (trackElement) {
      const width = trackElement.clientWidth - 50;
      return Math.max(width, 200);
    }
    return 500;
  }

  /**
   * Easing функция для плавного движения (ease-in-out)
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