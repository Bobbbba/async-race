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
  private _listeners: (() => void)[] = [];

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

  async startRace(): Promise<void> {
    const cars = garageStore.cars;
    if (cars.length === 0) {
      throw new Error('No cars in garage');
    }

    this._isRacing = true;
    this._finishedCount = 0;
    this._winners = [];
    this._startTime = Date.now();
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
    startedCars.forEach((car) => {
      this.animateCar(car.id);
    });
  }

  private animateCar(carId: number): void {
    const car = garageStore.cars.find(c => c.id === carId);
    if (!car || !car.velocity || car.status !== 'racing') {
      return;
    }

    const timeToFinish = DISTANCE / car.velocity;
    const steps = 100;
    const stepTime = timeToFinish / steps;
    const stepDistance = 1;

    let currentStep = 0;

    const animate = async (): Promise<void> => {
      if (car.status !== 'racing' || !this._isRacing) {
        return;
      }

      currentStep++;
      const newPosition = Math.min(currentStep * stepDistance, 100);
      garageStore.updateCarState(carId, { position: newPosition });

      if (newPosition >= 100) {
        const time = (Date.now() - this._startTime) / 1000;
        await this.finishCar(carId, time);
        return;
      }

      try {
        await engineApi.drive(carId);
      } catch (error) {
        if (error instanceof Error && error.message.includes('broken down')) {
          await this.finishCar(carId, 0, true);
          return;
        }
      }

      const timeoutId = setTimeout(animate, stepTime);
      this._animations.set(carId, timeoutId);
    };

    const initialDelay = Math.random() * 300;
    const timeoutId = setTimeout(animate, initialDelay);
    this._animations.set(carId, timeoutId);
  }

  private async finishCar(carId: number, time: number, isBroken: boolean = false): Promise<void> {
    const car = garageStore.cars.find(c => c.id === carId);
    if (!car || car.status === 'finished' || car.status === 'broken') {
      return;
    }

    const status = isBroken ? 'broken' : 'finished';
    garageStore.updateCarState(carId, { status, time });

    if (!isBroken) {
      this._finishedCount++;
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

  private endRace(): void {
    this._isRacing = false;
    this.notify();
  }

  async resetRace(): Promise<void> {
    this._isRacing = false;
    this._finishedCount = 0;
    this._startTime = 0;
    this._winners = [];

    // Останавливаем все анимации
    this._animations.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this._animations.clear();

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

  async stopCar(id: number): Promise<void> {
    const car = garageStore.cars.find(c => c.id === id);
    if (!car || car.status === 'stopped') {
      return;
    }

    // Останавливаем анимацию
    const animationId = this._animations.get(id);
    if (animationId) {
      clearTimeout(animationId);
      this._animations.delete(id);
    }

    await engineApi.stop(id);
    garageStore.updateCarState(id, {
      status: 'stopped',
      position: car.position || 0,
    });
    this.notify();
  }

  async startCar(id: number): Promise<void> {
    const car = garageStore.cars.find(c => c.id === id);
    if (!car || this._isRacing) {
      return;
    }

    try {
      const engineData = await engineApi.start(id);
      garageStore.updateCarState(id, {
        status: 'racing',
        position: 0,
        velocity: engineData.velocity,
        time: 0,
      });
      this.animateCar(id);
    } catch {
      garageStore.updateCarState(id, { status: 'stopped' });
    }
  }

  getWinner(): WinnerWithCar | null {
    if (this._winners.length === 0) {
      return null;
    }
    return this._winners.reduce((a, b) => a.time < b.time ? a : b);
  }
}

export const raceStore = new RaceStore();